import type { LoaderVersion } from './types'

const GAME_URL = 'https://meta.fabricmc.net/v2/versions/game'
const LOADER_URL = 'https://meta.fabricmc.net/v2/versions/loader'

interface FabricGameVersion {
  version: string
  stable: boolean
}

interface FabricLoaderVersion {
  version: string
  stable: boolean
  build: number
  maven: string
  separator: string
}

/** Minecraft versions Fabric supports (used to gate the loader-version list). */
export async function fetchFabricGameVersions(): Promise<string[]> {
  const res = await fetch(GAME_URL)
  if (!res.ok) throw new Error(`Failed to fetch Fabric game versions (${res.status})`)
  const data = (await res.json()) as FabricGameVersion[]
  return data.map((g) => g.version)
}

/**
 * Fabric loader versions. The loader is Minecraft-agnostic (intermediary
 * mappings handle the per-version bridging), so this list applies to any
 * supported game version. Returned newest-first, as the API provides them.
 */
export async function fetchFabricLoaderVersions(): Promise<LoaderVersion[]> {
  const res = await fetch(LOADER_URL)
  if (!res.ok) throw new Error(`Failed to fetch Fabric loader versions (${res.status})`)
  const data = (await res.json()) as FabricLoaderVersion[]
  return data.map((l) => ({ version: l.version, stable: l.stable, raw: l.version }))
}
