export {}

// Mirrors the surface exposed by the preload bridge (src/preload/index.ts).
// Kept as an explicit declaration so the renderer never imports from the
// Node-side preload build.
declare global {
  interface NdSkin {
    url: string
    variant: 'CLASSIC' | 'SLIM'
    dataUrl: string | null
  }

  interface NdAuthSession {
    uuid: string
    username: string
    skin: NdSkin | null
    capeUrl: string | null
  }

  type NdAuthResult =
    | { ok: true; session: NdAuthSession | null }
    | { ok: false; error: { message: string; code?: string } }

  type NdLoader = 'vanilla' | 'fabric' | 'forge' | 'neoforge'

  interface NdMinecraftVersion {
    id: string
    type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha'
    releaseTime: string
    url: string
  }

  interface NdLoaderVersion {
    version: string
    stable: boolean
    raw: string
  }

  interface NdInstance {
    id: string
    name: string
    mcVersion: string
    loader: NdLoader
    loaderVersion: string | null
    runtimeKey: string
    installed: boolean
    created: number
    lastPlayed: number | null
  }

  interface NdCreateInstanceInput {
    name: string
    mcVersion: string
    loader: NdLoader
    loaderVersion: string | null
  }

  interface NdUpdateInstanceInput {
    name?: string
    mcVersion?: string
    loader?: NdLoader
    loaderVersion?: string | null
  }

  type NdResult<T> = ({ ok: true } & T) | { ok: false; error: string }

  type NdInstallPhase =
    | 'version'
    | 'client'
    | 'libraries'
    | 'natives'
    | 'assets'
    | 'java'
    | 'processors'

  interface NdLaunchProgress {
    instanceId: string
    phase: NdInstallPhase
    done: number
    total: number
  }

  type NdLaunchState =
    | { instanceId: string; state: 'preparing' }
    | { instanceId: string; state: 'installing' }
    | { instanceId: string; state: 'launching' }
    | { instanceId: string; state: 'running' }
    | { instanceId: string; state: 'exited'; code: number | null }
    | { instanceId: string; state: 'error'; message: string }

  interface NdLaunchLog {
    instanceId: string
    line: string
    stream: 'out' | 'err'
  }

  interface NdModHit {
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

  interface NdModIndexEntry {
    projectId: string
    versionId: string
    filename: string
    title: string
  }

  interface NdCatalogSkin {
    id: string
    name: string
    dataUrl: string
  }

  interface Window {
    nodrift: {
      window: {
        minimize: () => void
        close: () => void
        toggleMaximize: () => void
        isMaximized: () => Promise<boolean>
      }
      auth: {
        getSession: () => Promise<NdAuthSession | null>
        restore: () => Promise<NdAuthResult>
        login: () => Promise<NdAuthResult>
        logout: () => Promise<{ ok: true }>
        onChanged: (callback: (session: NdAuthSession | null) => void) => () => void
      }
      metadata: {
        minecraftVersions: () => Promise<NdResult<{ versions: NdMinecraftVersion[] }>>
        loaderVersions: (
          loader: NdLoader,
          mcVersion: string
        ) => Promise<NdResult<{ versions: NdLoaderVersion[] }>>
      }
      instances: {
        list: () => Promise<NdResult<{ instances: NdInstance[] }>>
        create: (input: NdCreateInstanceInput) => Promise<NdResult<{ instance: NdInstance }>>
        update: (
          id: string,
          patch: NdUpdateInstanceInput
        ) => Promise<NdResult<{ instance: NdInstance }>>
        remove: (id: string) => Promise<NdResult<Record<string, never>>>
        openFolder: (id: string) => Promise<NdResult<Record<string, never>>>
        export: (
          id: string,
          format: 'zip' | 'mrpack'
        ) => Promise<NdResult<{ exported: boolean }>>
        import: () => Promise<NdResult<{ instance: NdInstance | null }>>
      }
      launch: {
        start: (instanceId: string) => Promise<NdResult<Record<string, never>>>
        stop: (instanceId: string) => Promise<NdResult<Record<string, never>>>
        isRunning: (instanceId: string) => Promise<boolean>
        onProgress: (callback: (p: NdLaunchProgress) => void) => () => void
        onState: (callback: (s: NdLaunchState) => void) => () => void
        onLog: (callback: (l: NdLaunchLog) => void) => () => void
      }
      mods: {
        search: (
          query: string,
          mcVersion: string,
          loader: string,
          offset: number
        ) => Promise<NdResult<{ hits: NdModHit[] }>>
        installed: (
          instanceId: string
        ) => Promise<NdResult<{ index: Record<string, NdModIndexEntry>; files: string[] }>>
        install: (
          instanceId: string,
          projectId: string,
          title: string,
          mcVersion: string,
          loader: string
        ) => Promise<NdResult<Record<string, never>>>
        remove: (
          instanceId: string,
          filename: string
        ) => Promise<NdResult<Record<string, never>>>
        installLocal: (
          instanceId: string,
          paths: string[]
        ) => Promise<NdResult<{ added: number }>>
        pickAndInstall: (instanceId: string) => Promise<NdResult<{ added: number }>>
        getFilePath: (file: File) => string
      }
      skins: {
        catalog: () => Promise<NdResult<{ skins: NdCatalogSkin[] }>>
        upload: (variant: 'classic' | 'slim') => Promise<NdResult<{ changed: boolean }>>
        applyCatalog: (
          id: string,
          variant: 'classic' | 'slim'
        ) => Promise<NdResult<Record<string, never>>>
        reset: () => Promise<NdResult<Record<string, never>>>
      }
      platform: string
    }
  }
}
