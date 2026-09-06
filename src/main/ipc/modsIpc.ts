import { ipcMain, shell } from 'electron'
import {
  getCategories,
  getProject,
  searchMods,
  type ProjectType,
  type SearchOptions
} from '../mods/modrinth'
import {
  installMod,
  listModVersions,
  resolveDependencies,
  switchModVersion
} from '../mods/modManager'
import { installPack } from '../mods/packManager'

export function registerModsIpc(): void {
  ipcMain.handle('mods:search', async (_event, options: SearchOptions) => {
    try {
      return { ok: true as const, hits: await searchMods(options) }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('mods:categories', async (_event, projectType: ProjectType) => {
    try {
      return { ok: true as const, categories: await getCategories(projectType) }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle(
    'packs:install',
    async (_event, instanceId: string, projectId: string, projectType: 'resourcepack' | 'shader', title: string) => {
      try {
        await installPack(instanceId, projectId, projectType, title)
        return { ok: true as const }
      } catch (err) {
        return { ok: false as const, error: (err as Error).message }
      }
    }
  )

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

  ipcMain.handle('mods:mod-versions', async (_event, instanceId: string, projectId: string) => {
    try {
      return { ok: true as const, versions: await listModVersions(instanceId, projectId) }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle(
    'mods:switch-version',
    async (_event, instanceId: string, projectId: string, versionId: string) => {
      try {
        await switchModVersion(instanceId, projectId, versionId)
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
