import { promises as fs } from 'node:fs'
import { basename, join } from 'node:path'
import { ensureDir, instanceMinecraftDir } from '../paths'
import { downloadFile } from '../launch/net'
import { getInstance } from '../instances/instanceStore'
import { getProjectTitle, resolveBestVersion } from './modrinth'

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

/**
 * Install a Modrinth mod (and all its required dependencies) into an instance's
 * isolated mods folder. Walks the required-dependency graph breadth-first,
 * skipping any that are already present or have no compatible version.
 */
export async function installMod(
  instanceId: string,
  projectId: string,
  title: string
): Promise<void> {
  const instance = await getInstance(instanceId)
  if (!instance) throw new Error('Instance not found.')
  if (instance.loader === 'vanilla') {
    throw new Error('This instance has no mod loader — mods require Fabric/Forge/NeoForge.')
  }

  await ensureDir(modsDir(instanceId))
  const index = await readIndex(instanceId)

  const seen = new Set<string>()
  const queue: string[] = [projectId]

  while (queue.length > 0) {
    const pid = queue.shift() as string
    if (seen.has(pid)) continue
    seen.add(pid)

    const best = await resolveBestVersion(pid, instance.mcVersion, instance.loader)
    if (!best) {
      // The root must resolve; a missing optional-graph dependency is skipped.
      if (pid === projectId) {
        throw new Error('No version of this mod matches this instance version and loader.')
      }
      continue
    }

    await downloadFile(best.url, join(modsDir(instanceId), best.filename), best.sha1)
    index[pid] = {
      projectId: pid,
      versionId: best.versionId,
      filename: best.filename,
      title: pid === projectId ? title : await getProjectTitle(pid),
      url: best.url,
      sha1: best.sha1,
      sha512: best.sha512,
      fileSize: best.fileSize
    }

    for (const dep of best.requiredDependencies) queue.push(dep)
  }

  await writeIndex(instanceId, index)
}

/** List a mod's direct required dependencies (titles) for the install dialog. */
export async function resolveDependencies(
  instanceId: string,
  projectId: string
): Promise<Array<{ projectId: string; title: string }>> {
  const instance = await getInstance(instanceId)
  if (!instance || instance.loader === 'vanilla') return []
  const best = await resolveBestVersion(projectId, instance.mcVersion, instance.loader)
  if (!best) return []
  const deps: Array<{ projectId: string; title: string }> = []
  for (const dep of best.requiredDependencies) {
    deps.push({ projectId: dep, title: await getProjectTitle(dep) })
  }
  return deps
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
