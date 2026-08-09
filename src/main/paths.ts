import { app } from 'electron'
import { join } from 'node:path'
import { promises as fs } from 'node:fs'

/**
 * Central path helpers for the launcher's data layout:
 *
 *   <root>/instances/<id>/instance.json          instance metadata
 *   <root>/instances/<id>/minecraft/...          ISOLATED per-instance game dir
 *   <root>/runtime/...                           SHARED runtime store (Step 4)
 *
 * The root is Electron's userData folder (%APPDATA%\nodriftlauncher on Windows).
 * Keeping every path here means a future "change data folder" setting only has
 * to override one function.
 */
export function dataRoot(): string {
  return app.getPath('userData')
}

export function instancesDir(): string {
  return join(dataRoot(), 'instances')
}

export function instanceDir(id: string): string {
  return join(instancesDir(), id)
}

export function instanceMinecraftDir(id: string): string {
  return join(instanceDir(id), 'minecraft')
}

export function runtimeDir(): string {
  return join(dataRoot(), 'runtime')
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}
