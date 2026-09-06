import { ipcMain } from 'electron'
import { checkForUpdates, downloadUpdate, quitAndInstall } from '../update/updater'

export function registerUpdateIpc(): void {
  ipcMain.handle('update:check', () => checkForUpdates())

  ipcMain.handle('update:download', async () => {
    try {
      await downloadUpdate()
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('update:install', () => {
    quitAndInstall()
    return { ok: true as const }
  })
}
