import { promises as fs } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { ensureDir, instanceDir, instanceMinecraftDir, instancesDir } from '../paths'
import {
  runtimeKey,
  type CreateInstanceInput,
  type Instance,
  type UpdateInstanceInput
} from './types'

/**
 * File-backed instance store. Each instance is a folder under instances/<id>
 * containing instance.json plus its isolated minecraft/ game directory. Listing
 * scans the folder rather than keeping a separate index, so there's no index to
 * drift out of sync with what's actually on disk.
 */

async function readInstance(id: string): Promise<Instance | null> {
  try {
    const raw = await fs.readFile(join(instanceDir(id), 'instance.json'), 'utf-8')
    return JSON.parse(raw) as Instance
  } catch {
    return null
  }
}

async function writeInstance(instance: Instance): Promise<void> {
  await ensureDir(instanceDir(instance.id))
  await fs.writeFile(
    join(instanceDir(instance.id), 'instance.json'),
    JSON.stringify(instance, null, 2),
    'utf-8'
  )
}

/** Create the isolated per-instance game directories. */
async function scaffoldInstanceDirs(id: string): Promise<void> {
  const mc = instanceMinecraftDir(id)
  await ensureDir(join(mc, 'saves'))
  await ensureDir(join(mc, 'resourcepacks'))
  await ensureDir(join(mc, 'config'))
  await ensureDir(join(mc, 'mods'))
}

export async function listInstances(): Promise<Instance[]> {
  await ensureDir(instancesDir())
  const entries = await fs.readdir(instancesDir(), { withFileTypes: true })
  const results: Instance[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const instance = await readInstance(entry.name)
    if (instance) results.push(instance)
  }
  results.sort((a, b) => (b.lastPlayed ?? b.created) - (a.lastPlayed ?? a.created))
  return results
}

export async function createInstance(input: CreateInstanceInput): Promise<Instance> {
  const id = randomUUID()
  const loaderVersion = input.loader === 'vanilla' ? null : input.loaderVersion
  const instance: Instance = {
    id,
    name: input.name.trim() || 'New Instance',
    mcVersion: input.mcVersion,
    loader: input.loader,
    loaderVersion,
    runtimeKey: runtimeKey(input.mcVersion, input.loader, loaderVersion),
    installed: false,
    created: Date.now(),
    lastPlayed: null
  }
  await scaffoldInstanceDirs(id)
  await writeInstance(instance)
  return instance
}

export async function updateInstance(
  id: string,
  patch: UpdateInstanceInput
): Promise<Instance> {
  const existing = await readInstance(id)
  if (!existing) throw new Error('Instance not found')

  const next: Instance = { ...existing }
  if (patch.name !== undefined) next.name = patch.name.trim() || existing.name
  if (patch.mcVersion !== undefined) next.mcVersion = patch.mcVersion
  if (patch.loader !== undefined) next.loader = patch.loader
  if (patch.loaderVersion !== undefined) next.loaderVersion = patch.loaderVersion
  if (next.loader === 'vanilla') next.loaderVersion = null

  // Recompute the dedup key; if the runtime changed, it must be (re)installed.
  const newKey = runtimeKey(next.mcVersion, next.loader, next.loaderVersion)
  if (newKey !== existing.runtimeKey) {
    next.runtimeKey = newKey
    next.installed = false
  }

  await writeInstance(next)
  return next
}

/** Read a single instance by id (used by the launcher). */
export async function getInstance(id: string): Promise<Instance | null> {
  return readInstance(id)
}

/** Mark an instance's runtime installed and stamp last-played. */
export async function markPlayed(id: string): Promise<void> {
  const existing = await readInstance(id)
  if (!existing) return
  existing.installed = true
  existing.lastPlayed = Date.now()
  await writeInstance(existing)
}

export async function deleteInstance(id: string): Promise<void> {
  // Removes the instance's isolated data. The SHARED runtime is untouched — it
  // may still be referenced by other instances and is managed separately.
  await fs.rm(instanceDir(id), { recursive: true, force: true })
}
