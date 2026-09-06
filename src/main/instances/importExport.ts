import AdmZip from 'adm-zip'
import { promises as fs } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { instanceMinecraftDir } from '../paths'
import { downloadFile } from '../launch/net'
import { listInstalled } from '../mods/modManager'
import { createInstance, getInstance } from './instanceStore'
import type { Instance } from './types'
import type { Loader } from '../metadata/types'

export type ExportFormat = 'zip' | 'mrpack'

/** Coarse import progress, streamed to the renderer so the UI can show a bar. */
export interface ImportProgress {
  phase: 'reading' | 'downloading' | 'extracting'
  done: number
  total: number
}

type ProgressFn = (progress: ImportProgress) => void

const SUBFOLDERS = ['mods', 'config', 'resourcepacks'] as const

async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

/** Join a relative pack path onto a root, rejecting path traversal. */
function safeJoin(root: string, rel: string): string {
  const dest = resolve(root, rel)
  const base = resolve(root)
  if (dest !== base && !dest.startsWith(base + sep)) {
    throw new Error(`Unsafe path in pack: ${rel}`)
  }
  return dest
}

async function writeEntry(data: Buffer, destPath: string): Promise<void> {
  await fs.mkdir(dirname(destPath), { recursive: true })
  await fs.writeFile(destPath, data)
}

// ---- Export ---------------------------------------------------------------

/** Export the instance as our own .zip (metadata + mods/config/resourcepacks, no saves). */
async function exportZip(instance: Instance, destPath: string): Promise<void> {
  const mcDir = instanceMinecraftDir(instance.id)
  const zip = new AdmZip()

  const meta = {
    name: instance.name,
    mcVersion: instance.mcVersion,
    loader: instance.loader,
    loaderVersion: instance.loaderVersion
  }
  zip.addFile('nodrift-instance.json', Buffer.from(JSON.stringify(meta, null, 2)))

  for (const sub of SUBFOLDERS) {
    const dir = join(mcDir, sub)
    if (await exists(dir)) {
      // Skip our internal mod index + metadata-cache files.
      zip.addLocalFolder(
        dir,
        sub,
        (name) => !name.endsWith('.nodrift-mods.json') && !name.endsWith('.nodrift-modmeta.json')
      )
    }
  }

  zip.writeZip(destPath)
}

interface MrpackFileEntry {
  path: string
  hashes: { sha1: string; sha512: string }
  downloads: string[]
  fileSize: number
}

/** Export the instance as a real Modrinth .mrpack. */
async function exportMrpack(instance: Instance, destPath: string): Promise<void> {
  const mcDir = instanceMinecraftDir(instance.id)
  const { index: modIndex, files: jarFiles } = await listInstalled(instance.id)

  const byFilename = new Map(Object.values(modIndex).map((e) => [e.filename, e]))
  const files: MrpackFileEntry[] = []
  const manualJars: string[] = []

  for (const jar of jarFiles) {
    const entry = byFilename.get(jar)
    if (entry?.url && entry.sha1 && entry.sha512 && entry.fileSize) {
      files.push({
        path: `mods/${jar}`,
        hashes: { sha1: entry.sha1, sha512: entry.sha512 },
        downloads: [entry.url],
        fileSize: entry.fileSize
      })
    } else {
      manualJars.push(jar) // manual jar → goes into overrides
    }
  }

  const dependencies: Record<string, string> = { minecraft: instance.mcVersion }
  if (instance.loader === 'fabric' && instance.loaderVersion) {
    dependencies['fabric-loader'] = instance.loaderVersion
  } else if (instance.loader === 'neoforge' && instance.loaderVersion) {
    dependencies['neoforge'] = instance.loaderVersion
  } else if (instance.loader === 'forge' && instance.loaderVersion) {
    // Our raw forge version is "<mc>-<forge>"; the mrpack wants just "<forge>".
    dependencies['forge'] = instance.loaderVersion.replace(`${instance.mcVersion}-`, '')
  }

  const index = {
    formatVersion: 1,
    game: 'minecraft',
    versionId: '1.0.0',
    name: instance.name,
    summary: `Exported from NodriftLauncher`,
    files,
    dependencies
  }

  const zip = new AdmZip()
  zip.addFile('modrinth.index.json', Buffer.from(JSON.stringify(index, null, 2)))

  // overrides: manual mods + config + resourcepacks.
  for (const jar of manualJars) {
    zip.addLocalFile(join(mcDir, 'mods', jar), 'overrides/mods')
  }
  for (const sub of ['config', 'resourcepacks'] as const) {
    const dir = join(mcDir, sub)
    if (await exists(dir)) zip.addLocalFolder(dir, `overrides/${sub}`)
  }

  zip.writeZip(destPath)
}

export async function exportInstance(
  instanceId: string,
  format: ExportFormat,
  destPath: string
): Promise<void> {
  const instance = await getInstance(instanceId)
  if (!instance) throw new Error('Instance not found.')
  if (format === 'mrpack') await exportMrpack(instance, destPath)
  else await exportZip(instance, destPath)
}

// ---- Import ---------------------------------------------------------------

function loaderFromDependencies(
  deps: Record<string, string>,
  mcVersion: string
): { loader: Loader; loaderVersion: string | null } {
  if (deps['fabric-loader']) return { loader: 'fabric', loaderVersion: deps['fabric-loader'] }
  if (deps['neoforge']) return { loader: 'neoforge', loaderVersion: deps['neoforge'] }
  if (deps['forge']) return { loader: 'forge', loaderVersion: `${mcVersion}-${deps['forge']}` }
  if (deps['quilt-loader']) throw new Error('Quilt modpacks are not supported.')
  return { loader: 'vanilla', loaderVersion: null }
}

/** Extract every zip entry under a prefix into destRoot (traversal-safe). */
async function extractPrefix(zip: AdmZip, prefix: string, destRoot: string): Promise<void> {
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    if (!entry.entryName.startsWith(prefix)) continue
    const rel = entry.entryName.slice(prefix.length)
    if (!rel) continue
    await writeEntry(entry.getData(), safeJoin(destRoot, rel))
  }
}

async function importMrpack(zip: AdmZip, onProgress?: ProgressFn): Promise<Instance> {
  const index = JSON.parse(zip.getEntry('modrinth.index.json')!.getData().toString('utf-8'))
  const deps = (index.dependencies ?? {}) as Record<string, string>
  const mcVersion = deps.minecraft
  if (!mcVersion) throw new Error('Modpack is missing a Minecraft version.')
  const { loader, loaderVersion } = loaderFromDependencies(deps, mcVersion)

  const instance = await createInstance({
    name: index.name || 'Imported Pack',
    mcVersion,
    loader,
    loaderVersion
  })
  const mcDir = instanceMinecraftDir(instance.id)

  // Download referenced files, reporting one step per downloaded file.
  const files = ((index.files ?? []) as MrpackFileEntry[]).filter((f) => f.downloads?.[0])
  let done = 0
  onProgress?.({ phase: 'downloading', done, total: files.length })
  for (const file of files) {
    await downloadFile(file.downloads[0], safeJoin(mcDir, file.path), file.hashes?.sha1)
    done += 1
    onProgress?.({ phase: 'downloading', done, total: files.length })
  }

  // Apply overrides then client-overrides (layered).
  onProgress?.({ phase: 'extracting', done: 0, total: 0 })
  await extractPrefix(zip, 'overrides/', mcDir)
  await extractPrefix(zip, 'client-overrides/', mcDir)

  return instance
}

async function importNodriftZip(zip: AdmZip, onProgress?: ProgressFn): Promise<Instance> {
  onProgress?.({ phase: 'extracting', done: 0, total: 0 })
  const meta = JSON.parse(zip.getEntry('nodrift-instance.json')!.getData().toString('utf-8'))
  const instance = await createInstance({
    name: meta.name || 'Imported',
    mcVersion: meta.mcVersion,
    loader: meta.loader,
    loaderVersion: meta.loaderVersion ?? null
  })
  const mcDir = instanceMinecraftDir(instance.id)

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    if (entry.entryName === 'nodrift-instance.json') continue
    await writeEntry(entry.getData(), safeJoin(mcDir, entry.entryName))
  }

  return instance
}

/** Import a .mrpack or a NodriftLauncher-exported .zip, creating a new instance. */
export async function importPack(srcPath: string, onProgress?: ProgressFn): Promise<Instance> {
  onProgress?.({ phase: 'reading', done: 0, total: 0 })
  const zip = new AdmZip(srcPath)
  if (zip.getEntry('modrinth.index.json')) return importMrpack(zip, onProgress)
  if (zip.getEntry('nodrift-instance.json')) return importNodriftZip(zip, onProgress)
  throw new Error(
    'Unrecognized pack. Expected a Modrinth .mrpack or a NodriftLauncher-exported .zip.'
  )
}
