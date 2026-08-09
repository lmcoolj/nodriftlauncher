export type Loader = 'vanilla' | 'fabric' | 'forge' | 'neoforge'

export type McVersionType = 'release' | 'snapshot' | 'old_beta' | 'old_alpha'

export interface MinecraftVersion {
  id: string
  type: McVersionType
  releaseTime: string
  /** Per-version manifest URL (used in Step 4 to download the version). */
  url: string
}

export interface LoaderVersion {
  /** Human-facing version to display and select. */
  version: string
  stable: boolean
  /**
   * The full artifact version string used downstream. For Fabric this equals
   * `version`; for Forge it is `<mc>-<forge>`; for NeoForge the full maven
   * version. Kept so Step 4 can resolve the exact artifact.
   */
  raw: string
}
