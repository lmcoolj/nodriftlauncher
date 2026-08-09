import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { instanceDir } from '../paths'
import {
  createInstance,
  deleteInstance,
  getInstance,
  listInstances,
  updateInstance
} from '../instances/instanceStore'
import { exportInstance, importPack, type ExportFormat } from '../instances/importExport'
import type { CreateInstanceInput, UpdateInstanceInput } from '../instances/types'

export function registerInstanceIpc(): void {
  ipcMain.handle('instances:list', async () => {
    try {
      return { ok: true as const, instances: await listInstances() }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('instances:create', async (_event, input: CreateInstanceInput) => {
    try {
      return { ok: true as const, instance: await createInstance(input) }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle(
    'instances:update',
    async (_event, id: string, patch: UpdateInstanceInput) => {
      try {
        return { ok: true as const, instance: await updateInstance(id, patch) }
      } catch (err) {
        return { ok: false as const, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle('instances:delete', async (_event, id: string) => {
    try {
      await deleteInstance(id)
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('instances:open-folder', async (_event, id: string) => {
    await shell.openPath(instanceDir(id))
    return { ok: true as const }
  })

  ipcMain.handle('instances:export', async (event, id: string, format: ExportFormat) => {
    const instance = await getInstance(id)
    if (!instance) return { ok: false as const, error: 'Instance not found.' }
    const win = BrowserWindow.fromWebContents(event.sender)
    const ext = format === 'mrpack' ? 'mrpack' : 'zip'
    const safeName = instance.name.replace(/[^a-z0-9-_ ]/gi, '_')
    const options = {
      title: 'Export instance',
      defaultPath: `${safeName}.${ext}`,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
    }
    const result = win
      ? await dialog.showSaveDialog(win, options)
      : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { ok: true as const, exported: false }
    try {
      await exportInstance(id, format, result.filePath)
      return { ok: true as const, exported: true }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('instances:import', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: 'Import instance or modpack',
      filters: [{ name: 'Packs', extensions: ['mrpack', 'zip'] }],
      properties: ['openFile'] as Array<'openFile'>
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: true as const, instance: null }
    }
    try {
      const instance = await importPack(result.filePaths[0])
      return { ok: true as const, instance }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })
}
