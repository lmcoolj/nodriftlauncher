import { BrowserWindow, dialog, ipcMain } from 'electron'
import { resetSkin, uploadSkinFromFile, type SkinVariant } from '../cosmetics/skinManager'

export function registerSkinsIpc(): void {
  ipcMain.handle('skins:reset', async () => {
    try {
      await resetSkin()
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('skins:upload', async (event, variant: SkinVariant) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: 'Choose a skin PNG',
      filters: [{ name: 'Skin PNG', extensions: ['png'] }],
      properties: ['openFile'] as Array<'openFile'>
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return { ok: true as const, changed: false }
    try {
      await uploadSkinFromFile(result.filePaths[0], variant)
      return { ok: true as const, changed: true }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })
}
