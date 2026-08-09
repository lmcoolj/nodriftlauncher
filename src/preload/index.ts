import { contextBridge, ipcRenderer, webUtils } from 'electron'
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

interface ModIndexEntry {
  projectId: string
  versionId: string
  filename: string
  title: string
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
      ipcRenderer.invoke('instances:import')
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
    search: (
      query: string,
      mcVersion: string,
      loader: string,
      offset: number
    ): Promise<Result<{ hits: ModHit[] }>> =>
      ipcRenderer.invoke('mods:search', query, mcVersion, loader, offset),
    installed: (
      instanceId: string
    ): Promise<Result<{ index: Record<string, ModIndexEntry>; files: string[] }>> =>
      ipcRenderer.invoke('mods:installed', instanceId),
    install: (
      instanceId: string,
      projectId: string,
      title: string,
      mcVersion: string,
      loader: string
    ): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('mods:install', instanceId, projectId, title, mcVersion, loader),
    remove: (instanceId: string, filename: string): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('mods:remove', instanceId, filename),
    installLocal: (
      instanceId: string,
      paths: string[]
    ): Promise<Result<{ added: number }>> =>
      ipcRenderer.invoke('mods:install-local', instanceId, paths),
    pickAndInstall: (instanceId: string): Promise<Result<{ added: number }>> =>
      ipcRenderer.invoke('mods:pick-and-install', instanceId),
    /** Resolve the absolute path of a drag-dropped File (Electron webUtils). */
    getFilePath: (file: File): string => webUtils.getPathForFile(file)
  },
  skins: {
    catalog: (): Promise<
      Result<{ skins: Array<{ id: string; name: string; dataUrl: string }> }>
    > => ipcRenderer.invoke('skins:catalog'),
    upload: (variant: 'classic' | 'slim'): Promise<Result<{ changed: boolean }>> =>
      ipcRenderer.invoke('skins:upload', variant),
    applyCatalog: (
      id: string,
      variant: 'classic' | 'slim'
    ): Promise<Result<Record<string, never>>> =>
      ipcRenderer.invoke('skins:apply-catalog', id, variant),
    reset: (): Promise<Result<Record<string, never>>> => ipcRenderer.invoke('skins:reset')
  },
  platform: process.platform
}

contextBridge.exposeInMainWorld('nodrift', api)

export type NodriftApi = typeof api
