import { ipcMain } from 'electron'
import { getLoaderVersions, getMinecraftVersions } from '../metadata/metadataService'
import type { Loader } from '../metadata/types'

export function registerMetadataIpc(): void {
  ipcMain.handle('metadata:minecraft-versions', async () => {
    try {
      return { ok: true as const, versions: await getMinecraftVersions() }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle(
    'metadata:loader-versions',
    async (_event, loader: Loader, mcVersion: string) => {
      try {
        return { ok: true as const, versions: await getLoaderVersions(loader, mcVersion) }
      } catch (err) {
        return { ok: false as const, error: (err as Error).message }
      }
    }
  )
}
