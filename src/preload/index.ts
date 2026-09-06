import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

/** Renderer-safe session shape (mirror of main's AuthSession). */
interface AuthSession {
  uuid: string
  username: string
  skin: { url: string; variant: 'CLASSIC' | 'SLIM'; dataUrl: string | null } | null
  capeUrl: string | null
}

type AuthResult =
  | { ok: true; session: AuthSession | null }
  | { ok: false; error: { message: string; code?: string } }

type Loader = 'vanilla' | 'fabric' | 'forge' | 'neoforge'

interface MinecraftVersion {
  id: string
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
  releaseTime: string
  url: string
}

interface LoaderVersion {
  version: string
  stable: boolean
  raw: string
}

interface Instance {
  id: string
  name: string
  mcVersion: string
  loader: Loader
  loaderVersion: string | null
  runtimeKey: string
  installed: boolean
  created: number
  lastPlayed: number | null
}

interface CreateInstanceInput {
  name: string
  mcVersion: string
  loader: Loader
  loaderVersion: string | null
}

interface UpdateInstanceInput {
  name?: string
  mcVersion?: string
  loader?: Loader
  loaderVersion?: string | null
}

type Result<T> = ({ ok: true } & T) | { ok: false; error: string }

interface ImportProgress {
  phase: 'reading' | 'downloading' | 'extracting'
  done: number
  total: number
}

type InstallPhase =
  | 'version'
  | 'client'
  | 'libraries'
  | 'natives'
  | 'assets'
  | 'java'
  | 'processors'

interface LaunchProgress {
  instanceId: string
  phase: InstallPhase
  done: number
  total: number
}

type LaunchState =
  | { instanceId: string; state: 'preparing' }
  | { instanceId: string; state: 'installing' }
  | { instanceId: string; state: 'launching' }
  | { instanceId: string; state: 'running' }
  | { instanceId: string; state: 'exited'; code: number | null }
  | { instanceId: string; state: 'error'; message: string }

interface LaunchLog {
  instanceId: string
  line: string
  stream: 'out' | 'err'
}

interface ModHit {
  project_id: string
  slug: string
  title: string
  description: string
  author: string
  downloads: number
  icon_url: string | null
  categories: string[]
  versions: string[]
}

type ProjectType = 'mod' | 'resourcepack' | 'shader'

interface ModSearchOptions {
  query: string
  projectType?: ProjectType
  mcVersion?: string
  loaders?: string[]
  categories?: string[]
  environment?: 'client' | 'server' | 'both' | null
  offset?: number
}

interface ModProject {
  id: string
  slug: string
  title: string
  description: string
  body: string
  icon_url: string | null
  downloads: number
  categories: string[]
  game_versions: string[]
  loaders: string[]
  gallery: Array<{ url: string; title: string | null }>
}

/**
 * The single, typed bridge between the sandboxed renderer and the main process.
 * Everything the UI is allowed to ask the OS/main process to do is enumerated
 * here — nothing else is exposed. As features land (instances, launch, mods),
 * new namespaces get added to this object.
 */
const api = {
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    close: (): void => ipcRenderer.send('window:close'),
    toggleMaximize: (): void => ipcRenderer.send('window:toggle-maximize'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized')
  },
  auth: {
    getSession: (): Promise<AuthSession | null> => ipcRenderer.invoke('auth:get-session'),
    getCached: (): Promise<AuthSession | null> => ipcRenderer.invoke('auth:get-cached'),
    restore: (): Promise<AuthResult> => ipcRenderer.invoke('auth:restore'),
    login: (): Promise<AuthResult> => ipcRenderer.invoke('auth:login'),
    logout: (): Promise<{ ok: true }> => ipcRenderer.invoke('auth:logout'),
    /** Subscribe to session changes; returns an unsubscribe function. */
    onChanged: (callback: (session: AuthSession | null) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, session: AuthSession | null): void =>
        callback(session)
      ipcRenderer.on('auth:changed', listener)
      return () => ipcRenderer.removeListener('auth:changed', listener)
    }
  },
  metadata: {
    minecraftVersions: (): Promise<Result<{ versions: MinecraftVersion[] }>> =>
      ipcRenderer.invoke('metadata:minecraft-versions'),
    loaderVersions: (
      loader: Loader,
      mcVersion: string
    ): Promise<Result<{ versions: LoaderVersion[] }>> =>
      ipcRenderer.invoke('metadata:loader-versions', loader, mcVersion)
  },
  instances: {
    list: (): Promise<Result<{ instances: Instance[] }>> =>
      ipcRenderer.invoke('instances:list'),
    create: (input: CreateInstanceInput): Promise<Result<{ instance: Instance }>> =>
      ipcRenderer.invoke('instances:create', input),
    update: (
      id: string,
      patch: UpdateInstanceInput
    ): Promise<Result<{ instance: Instance }>> =>
      ipcRenderer.invoke('instances:update', id, patch),
    remove: (id: string): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('instances:delete', id),
    openFolder: (id: string): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('instances:open-folder', id),
    export: (
      id: string,
      format: 'zip' | 'mrpack'
    ): Promise<Result<{ exported: boolean }>> =>
      ipcRenderer.invoke('instances:export', id, format),
    import: (): Promise<Result<{ instance: Instance | null }>> =>
      ipcRenderer.invoke('instances:import'),
    onImportProgress: (callback: (p: ImportProgress) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, p: ImportProgress): void => callback(p)
      ipcRenderer.on('instances:import-progress', listener)
      return () => ipcRenderer.removeListener('instances:import-progress', listener)
    }
  },
  launch: {
    start: (instanceId: string): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('launch:start', instanceId),
    stop: (instanceId: string): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('launch:stop', instanceId),
    isRunning: (instanceId: string): Promise<boolean> =>
      ipcRenderer.invoke('launch:is-running', instanceId),
    onProgress: (callback: (p: LaunchProgress) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, p: LaunchProgress): void => callback(p)
      ipcRenderer.on('launch:progress', listener)
      return () => ipcRenderer.removeListener('launch:progress', listener)
    },
    onState: (callback: (s: LaunchState) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, s: LaunchState): void => callback(s)
      ipcRenderer.on('launch:state', listener)
      return () => ipcRenderer.removeListener('launch:state', listener)
    },
    onLog: (callback: (l: LaunchLog) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, l: LaunchLog): void => callback(l)
      ipcRenderer.on('launch:log', listener)
      return () => ipcRenderer.removeListener('launch:log', listener)
    }
  },
  mods: {
    search: (options: ModSearchOptions): Promise<Result<{ hits: ModHit[] }>> =>
      ipcRenderer.invoke('mods:search', options),
    categories: (projectType: ProjectType): Promise<Result<{ categories: string[] }>> =>
      ipcRenderer.invoke('mods:categories', projectType),
    project: (id: string): Promise<Result<{ project: ModProject }>> =>
      ipcRenderer.invoke('mods:project', id),
    resolveDeps: (
      instanceId: string,
      projectId: string
    ): Promise<Result<{ deps: Array<{ projectId: string; title: string }> }>> =>
      ipcRenderer.invoke('mods:resolve-deps', instanceId, projectId),
    install: (
      instanceId: string,
      projectId: string,
      title: string
    ): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('mods:install', instanceId, projectId, title),
    modVersions: (
      instanceId: string,
      projectId: string
    ): Promise<Result<{ versions: Array<{ versionId: string; versionNumber: string }> }>> =>
      ipcRenderer.invoke('mods:mod-versions', instanceId, projectId),
    switchVersion: (
      instanceId: string,
      projectId: string,
      versionId: string
    ): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('mods:switch-version', instanceId, projectId, versionId),
    openUrl: (url: string): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('mods:open-url', url)
  },
  packs: {
    install: (
      instanceId: string,
      projectId: string,
      projectType: 'resourcepack' | 'shader',
      title: string
    ): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('packs:install', instanceId, projectId, projectType, title)
  },
  instanceFs: {
    listMods: (
      id: string
    ): Promise<
      Result<{
        mods: Array<{
          filename: string
          actualName: string
          enabled: boolean
          name: string
          description: string
          icon: string | null
          version: string
          projectId: string | null
        }>
      }>
    > => ipcRenderer.invoke('ifs:list-mods', id),
    toggleMod: (id: string, actualName: string): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('ifs:toggle-mod', id, actualName),
    deleteMod: (id: string, actualName: string): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('ifs:delete-mod', id, actualName),
    deletePack: (id: string, name: string): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('ifs:delete-pack', id, name),
    importMods: (id: string): Promise<Result<{ added: number }>> =>
      ipcRenderer.invoke('ifs:import-mods', id),
    listPacks: (
      id: string
    ): Promise<Result<{ packs: Array<{ name: string; icon: string | null }> }>> =>
      ipcRenderer.invoke('ifs:list-packs', id),
    importPacks: (id: string): Promise<Result<{ added: number }>> =>
      ipcRenderer.invoke('ifs:import-packs', id),
    browse: (
      id: string,
      relPath: string
    ): Promise<
      Result<{ path: string; entries: Array<{ name: string; isDir: boolean; size: number }> }>
    > => ipcRenderer.invoke('ifs:browse', id, relPath),
    open: (id: string, relPath: string): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('ifs:open', id, relPath)
  },
  skins: {
    upload: (variant: 'classic' | 'slim'): Promise<Result<{ changed: boolean }>> =>
      ipcRenderer.invoke('skins:upload', variant),
    reset: (): Promise<Result<Record<string, never>>> => ipcRenderer.invoke('skins:reset')
  },
  platform: process.platform
}

contextBridge.exposeInMainWorld('nodrift', api)

export type NodriftApi = typeof api
