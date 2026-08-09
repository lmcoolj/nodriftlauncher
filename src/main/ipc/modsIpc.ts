import { ipcMain, shell } from 'electron'
import { getProject, searchMods, type SearchOptions } from '../mods/modrinth'
import { installMod, resolveDependencies } from '../mods/modManager'

export function registerModsIpc(): void {
  ipcMain.handle('mods:search', async (_event, options: SearchOptions) => {
    try {
      return { ok: true as const, hits: await searchMods(options) }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('mods:project', async (_event, id: string) => {
    try {
      return { ok: true as const, project: await getProject(id) }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('mods:resolve-deps', async (_event, instanceId: string, projectId: string) => {
    try {
      return { ok: true as const, deps: await resolveDependencies(instanceId, projectId) }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle(
    'mods:install',
    async (_event, instanceId: string, projectId: string, title: string) => {
      try {
        await installMod(instanceId, projectId, title)
        return { ok: true as const }
      } catch (err) {
        return { ok: false as const, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle('mods:open-url', async (_event, url: string) => {
    if (/^https:\/\//i.test(url)) await shell.openExternal(url)
    return { ok: true as const }
  })
}
