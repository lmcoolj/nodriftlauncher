import { BrowserWindow, dialog, ipcMain } from 'electron'
import {
  browse,
  importMods,
  importPacks,
  listMods,
  listPacks,
  openPath,
  toggleMod
} from '../instances/instanceFs'

async function pickFiles(
  event: Electron.IpcMainInvokeEvent,
  title: string,
  ext: string
): Promise<string[]> {
  const win = BrowserWindow.fromWebContents(event.sender)
  const options = {
    title,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    properties: ['openFile', 'multiSelections'] as Array<'openFile' | 'multiSelections'>
  }
  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options)
  return result.canceled ? [] : result.filePaths
}

export function registerInstanceFsIpc(): void {
  ipcMain.handle('ifs:list-mods', async (_e, id: string) => {
    try {
      return { ok: true as const, mods: await listMods(id) }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('ifs:toggle-mod', async (_e, id: string, actualName: string) => {
    try {
      await toggleMod(id, actualName)
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('ifs:import-mods', async (event, id: string) => {
    try {
      const paths = await pickFiles(event, 'Import mods', 'jar')
      const added = await importMods(id, paths)
      return { ok: true as const, added }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('ifs:list-packs', async (_e, id: string) => {
    try {
      return { ok: true as const, packs: await listPacks(id) }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('ifs:import-packs', async (event, id: string) => {
    try {
      const paths = await pickFiles(event, 'Import resource packs', 'zip')
      const added = await importPacks(id, paths)
      return { ok: true as const, added }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('ifs:browse', async (_e, id: string, relPath: string) => {
    try {
      return { ok: true as const, ...(await browse(id, relPath)) }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('ifs:open', async (_e, id: string, relPath: string) => {
    try {
      await openPath(id, relPath)
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })
}
