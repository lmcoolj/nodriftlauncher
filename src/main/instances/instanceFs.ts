import AdmZip from 'adm-zip'
import { shell } from 'electron'
import { promises as fs } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import { ensureDir, instanceMinecraftDir } from '../paths'

/** Resolve a path inside an instance's minecraft dir, rejecting traversal. */
function safeResolve(instanceId: string, relPath: string): string {
  const root = resolve(instanceMinecraftDir(instanceId))
  const dest = resolve(root, relPath || '.')
  if (dest !== root && !dest.startsWith(root + sep)) {
    throw new Error('Path is outside the instance directory.')
  }
  return dest
}

// ---- Mods (enable/disable via .disabled suffix) ---------------------------

export interface InstanceMod {
  /** Display name (without a trailing .disabled). */
  filename: string
  /** The actual on-disk filename. */
  actualName: string
  enabled: boolean
  /** Display name / description / icon read from the jar's own metadata. */
  name: string
  description: string
  icon: string | null
}

/** Read a mod's embedded metadata (Fabric fabric.mod.json / Forge-NeoForge mods.toml). */
function readModMeta(jarPath: string): Pick<InstanceMod, 'name' | 'description' | 'icon'> {
  const empty = { name: '', description: '', icon: null as string | null }
  try {
    const zip = new AdmZip(jarPath)

    const fabricEntry = zip.getEntry('fabric.mod.json')
    if (fabricEntry) {
      const data = JSON.parse(fabricEntry.getData().toString('utf-8'))
      let icon: string | null = null
      if (typeof data.icon === 'string') {
        const iconEntry = zip.getEntry(data.icon)
        if (iconEntry) icon = `data:image/png;base64,${iconEntry.getData().toString('base64')}`
      }
      return {
        name: data.name ?? data.id ?? '',
        description: String(data.description ?? '').trim(),
        icon
      }
    }

    const tomlEntry =
      zip.getEntry('META-INF/neoforge.mods.toml') ?? zip.getEntry('META-INF/mods.toml')
    if (tomlEntry) {
      const text = tomlEntry.getData().toString('utf-8')
      const displayName = /displayName\s*=\s*["']([^"']+)["']/.exec(text)?.[1]
      const desc = /description\s*=\s*(?:'''([\s\S]*?)'''|"((?:[^"\\]|\\.)*)")/.exec(text)
      const logoFile = /logoFile\s*=\s*["']([^"']+)["']/.exec(text)?.[1]
      let icon: string | null = null
      if (logoFile) {
        const iconEntry = zip.getEntry(logoFile)
        if (iconEntry) icon = `data:image/png;base64,${iconEntry.getData().toString('base64')}`
      }
      return {
        name: displayName ?? '',
        description: (desc?.[1] ?? desc?.[2] ?? '').trim(),
        icon
      }
    }
  } catch {
    // Unreadable jar — fall back to the filename.
  }
  return empty
}

export async function listMods(instanceId: string): Promise<InstanceMod[]> {
  const dir = join(instanceMinecraftDir(instanceId), 'mods')
  await ensureDir(dir)
  const entries = await fs.readdir(dir)
  const jars = entries.filter((f) => /\.jar(\.disabled)?$/i.test(f))

  const mods = jars.map((f) => {
    const meta = readModMeta(join(dir, f))
    return {
      filename: f.replace(/\.disabled$/i, ''),
      actualName: f,
      enabled: !f.toLowerCase().endsWith('.disabled'),
      name: meta.name,
      description: meta.description,
      icon: meta.icon
    }
  })

  return mods.sort((a, b) => (a.name || a.filename).localeCompare(b.name || b.filename))
}

/** Toggle a mod between enabled (.jar) and disabled (.jar.disabled). */
export async function toggleMod(instanceId: string, actualName: string): Promise<void> {
  const dir = join(instanceMinecraftDir(instanceId), 'mods')
  const src = join(dir, actualName)
  const dest = actualName.toLowerCase().endsWith('.disabled')
    ? join(dir, actualName.replace(/\.disabled$/i, ''))
    : join(dir, `${actualName}.disabled`)
  await fs.rename(src, dest)
}

export async function importMods(instanceId: string, srcPaths: string[]): Promise<number> {
  const dir = join(instanceMinecraftDir(instanceId), 'mods')
  await ensureDir(dir)
  let added = 0
  for (const src of srcPaths) {
    if (!src.toLowerCase().endsWith('.jar')) continue
    await fs.copyFile(src, join(dir, basename(src)))
    added += 1
  }
  return added
}

// ---- Resource packs -------------------------------------------------------

export interface InstancePack {
  name: string
  /** pack.png as a data URL, if present. */
  icon: string | null
}

export async function listPacks(instanceId: string): Promise<InstancePack[]> {
  const dir = join(instanceMinecraftDir(instanceId), 'resourcepacks')
  await ensureDir(dir)
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const packs: InstancePack[] = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const isZip = entry.isFile() && entry.name.toLowerCase().endsWith('.zip')
    if (!isZip && !entry.isDirectory()) continue

    let icon: string | null = null
    try {
      if (isZip) {
        const png = new AdmZip(join(dir, entry.name)).getEntry('pack.png')
        if (png) icon = `data:image/png;base64,${png.getData().toString('base64')}`
      } else {
        const buf = await fs.readFile(join(dir, entry.name, 'pack.png'))
        icon = `data:image/png;base64,${buf.toString('base64')}`
      }
    } catch {
      // no icon — fine
    }
    packs.push({ name: entry.name, icon })
  }
  return packs.sort((a, b) => a.name.localeCompare(b.name))
}

export async function importPacks(instanceId: string, srcPaths: string[]): Promise<number> {
  const dir = join(instanceMinecraftDir(instanceId), 'resourcepacks')
  await ensureDir(dir)
  let added = 0
  for (const src of srcPaths) {
    if (!src.toLowerCase().endsWith('.zip')) continue
    await fs.copyFile(src, join(dir, basename(src)))
    added += 1
  }
  return added
}

// ---- File browser ---------------------------------------------------------

export interface DirEntry {
  name: string
  isDir: boolean
  size: number
}

export async function browse(
  instanceId: string,
  relPath: string
): Promise<{ path: string; entries: DirEntry[] }> {
  const dir = safeResolve(instanceId, relPath)
  await ensureDir(dir)
  const dirents = await fs.readdir(dir, { withFileTypes: true })
  const entries: DirEntry[] = []
  for (const d of dirents) {
    if (d.name === '.nodrift-mods.json') continue
    let size = 0
    if (d.isFile()) {
      try {
        size = (await fs.stat(join(dir, d.name))).size
      } catch {
        size = 0
      }
    }
    entries.push({ name: d.name, isDir: d.isDirectory(), size })
  }
  entries.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1))
  return { path: relPath || '', entries }
}

export async function openPath(instanceId: string, relPath: string): Promise<void> {
  await shell.openPath(safeResolve(instanceId, relPath))
}
