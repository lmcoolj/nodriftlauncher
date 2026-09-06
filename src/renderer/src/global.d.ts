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

  interface NdImportProgress {
    phase: 'reading' | 'downloading' | 'extracting'
    done: number
    total: number
  }

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

  type NdProjectType = 'mod' | 'resourcepack' | 'shader'

  interface NdModSearchOptions {
    query: string
    projectType?: NdProjectType
    mcVersion?: string
    loaders?: string[]
    categories?: string[]
    environment?: 'client' | 'server' | 'both' | null
    offset?: number
  }

  interface NdModProject {
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

  interface NdCatalogSkin {
    id: string
    name: string
    dataUrl: string
  }

  interface NdInstanceMod {
    filename: string
    actualName: string
    enabled: boolean
    name: string
    description: string
    icon: string | null
    version: string
  }

  interface NdInstancePack {
    name: string
    icon: string | null
  }

  interface NdDirEntry {
    name: string
    isDir: boolean
    size: number
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
        onImportProgress: (callback: (p: NdImportProgress) => void) => () => void
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
        search: (options: NdModSearchOptions) => Promise<NdResult<{ hits: NdModHit[] }>>
        categories: (projectType: NdProjectType) => Promise<NdResult<{ categories: string[] }>>
        project: (id: string) => Promise<NdResult<{ project: NdModProject }>>
        resolveDeps: (
          instanceId: string,
          projectId: string
        ) => Promise<NdResult<{ deps: Array<{ projectId: string; title: string }> }>>
        install: (
          instanceId: string,
          projectId: string,
          title: string
        ) => Promise<NdResult<Record<string, never>>>
        openUrl: (url: string) => Promise<NdResult<Record<string, never>>>
      }
      packs: {
        install: (
          instanceId: string,
          projectId: string,
          projectType: 'resourcepack' | 'shader',
          title: string
        ) => Promise<NdResult<Record<string, never>>>
      }
      instanceFs: {
        listMods: (id: string) => Promise<NdResult<{ mods: NdInstanceMod[] }>>
        toggleMod: (
          id: string,
          actualName: string
        ) => Promise<NdResult<Record<string, never>>>
        deleteMod: (
          id: string,
          actualName: string
        ) => Promise<NdResult<Record<string, never>>>
        deletePack: (id: string, name: string) => Promise<NdResult<Record<string, never>>>
        importMods: (id: string) => Promise<NdResult<{ added: number }>>
        listPacks: (id: string) => Promise<NdResult<{ packs: NdInstancePack[] }>>
        importPacks: (id: string) => Promise<NdResult<{ added: number }>>
        browse: (
          id: string,
          relPath: string
        ) => Promise<NdResult<{ path: string; entries: NdDirEntry[] }>>
        open: (id: string, relPath: string) => Promise<NdResult<Record<string, never>>>
      }
      skins: {
        upload: (variant: 'classic' | 'slim') => Promise<NdResult<{ changed: boolean }>>
        reset: () => Promise<NdResult<Record<string, never>>>
      }
      platform: string
    }
  }
}
