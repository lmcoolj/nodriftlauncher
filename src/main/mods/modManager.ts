import { promises as fs } from 'node:fs'
import { basename, join } from 'node:path'
import { ensureDir, instanceMinecraftDir } from '../paths'
import { downloadFile } from '../launch/net'
import { resolveBestVersion } from './modrinth'

function modsDir(instanceId: string): string {
  return join(instanceMinecraftDir(instanceId), 'mods')
}

function indexPath(instanceId: string): string {
  return join(modsDir(instanceId), '.nodrift-mods.json')
}

export interface ModIndexEntry {
  projectId: string
  versionId: string
  filename: string
  title: string
  /** Download metadata, kept so .mrpack export can build proper files[] entries. */
  url?: string
  sha1?: string
  sha512?: string
  fileSize?: number
}

/** Map of Modrinth projectId -> installed entry (manual jars are not indexed). */
export type ModIndex = Record<string, ModIndexEntry>

async function readIndex(instanceId: string): Promise<ModIndex> {
  try {
    return JSON.parse(await fs.readFile(indexPath(instanceId), 'utf-8')) as ModIndex
  } catch {
    return {}
  }
}

async function writeIndex(instanceId: string, index: ModIndex): Promise<void> {
  await ensureDir(modsDir(instanceId))
  await fs.writeFile(indexPath(instanceId), JSON.stringify(index, null, 2), 'utf-8')
}

export interface InstalledMods {
  /** projectIds installed from Modrinth (for browser Install/Installed state). */
  index: ModIndex
  /** All .jar filenames present in the instance's mods folder. */
  files: string[]
}

export async function listInstalled(instanceId: string): Promise<InstalledMods> {
  await ensureDir(modsDir(instanceId))
  const entries = await fs.readdir(modsDir(instanceId))
  const files = entries.filter((f) => f.toLowerCase().endsWith('.jar'))
  const index = await readIndex(instanceId)
  return { index, files }
}

/** Download and install a Modrinth mod into an instance's isolated mods folder. */
export async function installMod(
  instanceId: string,
  projectId: string,
  title: string,
  mcVersion: string,
  loader: string
): Promise<void> {
  const best = await resolveBestVersion(projectId, mcVersion, loader)
  if (!best) {
    throw new Error('No version of this mod matches your instance version and loader.')
  }
  await ensureDir(modsDir(instanceId))
  await downloadFile(best.url, join(modsDir(instanceId), best.filename), best.sha1)

  const index = await readIndex(instanceId)
  index[projectId] = {
    projectId,
    versionId: best.versionId,
    filename: best.filename,
    title,
    url: best.url,
    sha1: best.sha1,
    sha512: best.sha512,
    fileSize: best.fileSize
  }
  await writeIndex(instanceId, index)
}

/** Copy local .jar files into an instance's mods folder. */
export async function installLocalJars(instanceId: string, srcPaths: string[]): Promise<number> {
  await ensureDir(modsDir(instanceId))
  let added = 0
  for (const src of srcPaths) {
    if (!src.toLowerCase().endsWith('.jar')) continue
    await fs.copyFile(src, join(modsDir(instanceId), basename(src)))
    added += 1
  }
  return added
}

export async function removeMod(instanceId: string, filename: string): Promise<void> {
  await fs.rm(join(modsDir(instanceId), filename), { force: true })
  const index = await readIndex(instanceId)
  let changed = false
  for (const [projectId, entry] of Object.entries(index)) {
    if (entry.filename === filename) {
      delete index[projectId]
      changed = true
    }
  }
  if (changed) await writeIndex(instanceId, index)
}
