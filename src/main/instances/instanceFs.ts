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
  /** Display name / description / icon / version read from the jar's own metadata. */
  name: string
  description: string
  icon: string | null
  version: string
}

interface ModMeta {
  name: string
  description: string
  icon: string | null
  version: string
}

/**
 * Extract a quoted value (`key = "..."` or `key = '...'`). Quote-aware so a value
 * containing an apostrophe (e.g. displayName="Xaero's Minimap") is NOT truncated
 * at the apostrophe — a bug that used to mangle mod names and logo paths.
 */
function tomlString(text: string, key: string): string | undefined {
  const m = new RegExp(`${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(text)
  return m ? (m[1] ?? m[2]) : undefined
}

/** Fabric `icon` can be a string or a size→path map; pick the largest. */
function fabricIconPath(icon: unknown): string | null {
  if (typeof icon === 'string') return icon
  if (icon && typeof icon === 'object') {
    const entries = Object.entries(icon as Record<string, string>)
      .map(([size, path]) => [parseInt(size, 10) || 0, path] as const)
      .sort((a, b) => b[0] - a[0])
    return entries[0]?.[1] ?? null
  }
  return null
}

function readManifestVersion(zip: AdmZip): string {
  try {
    const mf = zip.getEntry('META-INF/MANIFEST.MF')
    if (!mf) return ''
    const m = /Implementation-Version:\s*(.+)/.exec(mf.getData().toString('utf-8'))
    return m ? m[1].trim() : ''
  } catch {
    return ''
  }
}

/** Read a mod's embedded metadata (Fabric fabric.mod.json / Forge-NeoForge mods.toml). */
function readModMeta(jarPath: string): ModMeta {
  const empty: ModMeta = { name: '', description: '', icon: null, version: '' }
  try {
    const zip = new AdmZip(jarPath)

    const readIcon = (path: string | null): string | null => {
      if (!path) return null
      const entry = zip.getEntry(path.replace(/^\//, ''))
      if (!entry) return null
      const lower = path.toLowerCase()
      const ext = lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'jpeg' : 'png'
      return `data:image/${ext};base64,${entry.getData().toString('base64')}`
    }

    const fabricEntry = zip.getEntry('fabric.mod.json')
    if (fabricEntry) {
      const data = JSON.parse(fabricEntry.getData().toString('utf-8')) as Record<string, unknown>
      const rawVer = typeof data.version === 'string' ? data.version : ''
      return {
        name: String(data.name ?? data.id ?? ''),
        description: String(data.description ?? '').trim(),
        icon: readIcon(fabricIconPath(data.icon)),
        version: rawVer.includes('${') ? '' : rawVer
      }
    }

    const tomlEntry =
      zip.getEntry('META-INF/neoforge.mods.toml') ?? zip.getEntry('META-INF/mods.toml')
    if (tomlEntry) {
      const text = tomlEntry.getData().toString('utf-8')
      const descM =
        /description\s*=\s*(?:'''([\s\S]*?)'''|"""([\s\S]*?)"""|"([^"]*)"|'([^']*)')/.exec(text)
      let version = tomlString(text, 'version') ?? ''
      if (!version || version.includes('${')) version = readManifestVersion(zip)
      return {
        name: tomlString(text, 'displayName') ?? '',
        description: (descM?.[1] ?? descM?.[2] ?? descM?.[3] ?? descM?.[4] ?? '').trim(),
        icon: readIcon(tomlString(text, 'logoFile') ?? null),
        version
      }
    }
  } catch {
    // Unreadable jar — fall back to the filename.
  }
  return empty
}

// Opening every jar with AdmZip is slow for large packs, so metadata is cached
// on disk keyed by filename + mtime + size. Subsequent list/searches are instant.
interface ModMetaCacheEntry {
  mtimeMs: number
  size: number
  meta: ModMeta
}
type ModMetaCache = Record<string, ModMetaCacheEntry>

function metaCachePath(modsDir: string): string {
  return join(modsDir, '.nodrift-modmeta.json')
}

export async function listMods(instanceId: string): Promise<InstanceMod[]> {
  const dir = join(instanceMinecraftDir(instanceId), 'mods')
  await ensureDir(dir)
  const entries = await fs.readdir(dir)
  const jars = entries.filter((f) => /\.jar(\.disabled)?$/i.test(f))

  let cache: ModMetaCache = {}
  try {
    cache = JSON.parse(await fs.readFile(metaCachePath(dir), 'utf-8')) as ModMetaCache
  } catch {
    cache = {}
  }
  let cacheChanged = false

  const mods: InstanceMod[] = []
  for (const f of jars) {
    const full = join(dir, f)
    let stat: Awaited<ReturnType<typeof fs.stat>>
    try {
      stat = await fs.stat(full)
    } catch {
      continue
    }
    const cached = cache[f]
    let meta: ModMeta
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
      meta = cached.meta
    } else {
      meta = readModMeta(full)
      cache[f] = { mtimeMs: stat.mtimeMs, size: stat.size, meta }
      cacheChanged = true
    }
    mods.push({
      filename: f.replace(/\.disabled$/i, ''),
      actualName: f,
      enabled: !f.toLowerCase().endsWith('.disabled'),
      name: meta.name,
      description: meta.description,
      icon: meta.icon,
      version: meta.version
    })
  }

  // Drop cache entries for jars that are gone, then persist if anything changed.
  const present = new Set(jars)
  for (const key of Object.keys(cache)) {
    if (!present.has(key)) {
      delete cache[key]
      cacheChanged = true
    }
  }
  if (cacheChanged) {
    try {
      await fs.writeFile(metaCachePath(dir), JSON.stringify(cache), 'utf-8')
    } catch {
      // best-effort cache; ignore write failures
    }
  }

  return mods.sort((a, b) => (a.name || a.filename).localeCompare(b.name || b.filename))
}

/** Delete a mod jar (enabled or disabled) and drop any Modrinth index entry. */
export async function deleteMod(instanceId: string, actualName: string): Promise<void> {
  const dir = join(instanceMinecraftDir(instanceId), 'mods')
  await fs.rm(safeResolve(instanceId, join('mods', actualName)), { force: true })
  const base = actualName.replace(/\.disabled$/i, '')
  try {
    const idxPath = join(dir, '.nodrift-mods.json')
    const idx = JSON.parse(await fs.readFile(idxPath, 'utf-8')) as Record<
      string,
      { filename?: string }
    >
    let changed = false
    for (const [key, entry] of Object.entries(idx)) {
      if (entry.filename === base) {
        delete idx[key]
        changed = true
      }
    }
    if (changed) await fs.writeFile(idxPath, JSON.stringify(idx, null, 2), 'utf-8')
  } catch {
    // no index — nothing to clean
  }
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

/** Delete a resource pack (zip file or unpacked folder), traversal-guarded. */
export async function deletePack(instanceId: string, name: string): Promise<void> {
  await fs.rm(safeResolve(instanceId, join('resourcepacks', name)), {
    recursive: true,
    force: true
  })
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
    if (d.name === '.nodrift-mods.json' || d.name === '.nodrift-modmeta.json') continue
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
