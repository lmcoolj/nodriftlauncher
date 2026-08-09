/** Types mirroring the Mojang per-version JSON (piston-meta) that we consume. */

export interface OsRule {
  name?: string
  arch?: string
  version?: string
}

export interface Rule {
  action: 'allow' | 'disallow'
  os?: OsRule
  features?: Record<string, boolean>
}

export type Argument = string | { rules: Rule[]; value: string | string[] }

export interface ArtifactDownload {
  path?: string
  sha1: string
  size: number
  url: string
}

export interface Library {
  name: string
  downloads?: {
    artifact?: ArtifactDownload
    classifiers?: Record<string, ArtifactDownload>
  }
  rules?: Rule[]
  /** Legacy (<1.13) natives map: os key -> classifier (may contain ${arch}). */
  natives?: Record<string, string>
  extract?: { exclude?: string[] }
  /** Legacy maven base URL for libraries lacking a downloads block. */
  url?: string
}

export interface AssetIndexRef {
  id: string
  sha1: string
  size: number
  totalSize: number
  url: string
}

export interface VersionData {
  id: string
  type: string
  mainClass: string
  assetIndex: AssetIndexRef
  assets: string
  javaVersion?: { component: string; majorVersion: number }
  downloads: {
    client: ArtifactDownload
    server?: ArtifactDownload
    [key: string]: ArtifactDownload | undefined
  }
  libraries: Library[]
  /** Modern (1.13+) argument arrays. */
  arguments?: { game: Argument[]; jvm: Argument[] }
  /** Legacy (<1.13) space-separated game argument string. */
  minecraftArguments?: string
  /** Set on loader profiles (Fabric/Forge/NeoForge) — handled in later steps. */
  inheritsFrom?: string
}

/**
 * A loader profile (Fabric/Forge/NeoForge) that layers on top of a vanilla
 * version via `inheritsFrom`. It contributes libraries, a main class and extra
 * arguments; assets/downloads/java come from the inherited vanilla version.
 */
export interface LoaderProfile {
  id: string
  inheritsFrom: string
  mainClass: string
  libraries: Library[]
  arguments?: { game?: Argument[]; jvm?: Argument[] }
}

/** Progress event phases during install. */
export type InstallPhase =
  | 'version'
  | 'client'
  | 'libraries'
  | 'natives'
  | 'assets'
  | 'java'
  | 'processors'

export interface LaunchCredentials {
  name: string
  uuid: string
  accessToken: string
  xuid: string
}
