import type { Loader } from '../metadata/types'

export interface Instance {
  id: string
  name: string
  mcVersion: string
  loader: Loader
  /** null for vanilla. */
  loaderVersion: string | null
  /**
   * Dedup key identifying the SHARED runtime this instance uses. Instances with
   * the same key reference the same runtime install (never a private copy).
   */
  runtimeKey: string
  /** Whether the shared runtime has been downloaded (populated in Step 4). */
  installed: boolean
  created: number
  lastPlayed: number | null
}

export interface CreateInstanceInput {
  name: string
  mcVersion: string
  loader: Loader
  loaderVersion: string | null
}

export interface UpdateInstanceInput {
  name?: string
  mcVersion?: string
  loader?: Loader
  loaderVersion?: string | null
}

/** The shared-runtime dedup key. Vanilla omits the loader version. */
export function runtimeKey(
  mc: string,
  loader: Loader,
  loaderVersion: string | null
): string {
  return loader === 'vanilla'
    ? `vanilla_${mc}`
    : `${loader}_${mc}_${loaderVersion ?? 'unknown'}`
}
