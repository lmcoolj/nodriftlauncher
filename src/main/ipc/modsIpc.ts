import { BrowserWindow, dialog, ipcMain } from 'electron'
import { searchMods } from '../mods/modrinth'
import { installLocalJars, installMod, listInstalled, removeMod } from '../mods/modManager'

export function registerModsIpc(): void {
  ipcMain.handle(
    'mods:search',
    async (_event, query: string, mcVersion: string, loader: string, offset: number) => {
      try {
        return { ok: true as const, hits: await searchMods(query, mcVersion, loader, offset) }
      } catch (err) {
        return { ok: false as const, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle('mods:installed', async (_event, instanceId: string) => {
    try {
      const { index, files } = await listInstalled(instanceId)
      return { ok: true as const, index, files }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle(
    'mods:install',
    async (
      _event,
      instanceId: string,
      projectId: string,
      title: string,
      mcVersion: string,
      loader: string
    ) => {
      try {
        await installMod(instanceId, projectId, title, mcVersion, loader)
        return { ok: true as const }
      } catch (err) {
        return { ok: false as const, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle('mods:remove', async (_event, instanceId: string, filename: string) => {
    try {
      await removeMod(instanceId, filename)
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('mods:install-local', async (_event, instanceId: string, paths: string[]) => {
    try {
      const added = await installLocalJars(instanceId, paths)
      return { ok: true as const, added }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('mods:pick-and-install', async (event, instanceId: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: 'Add mods',
      filters: [{ name: 'Mod jars', extensions: ['jar'] }],
      properties: ['openFile', 'multiSelections'] as Array<'openFile' | 'multiSelections'>
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled) return { ok: true as const, added: 0 }
    try {
      const added = await installLocalJars(instanceId, result.filePaths)
      return { ok: true as const, added }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })
}
