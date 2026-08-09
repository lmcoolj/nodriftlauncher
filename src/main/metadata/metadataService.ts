import type { Loader, LoaderVersion, MinecraftVersion } from './types'
import { fetchMinecraftVersions } from './mojang'
import { fetchFabricGameVersions, fetchFabricLoaderVersions } from './fabric'
import { fetchNeoforgeVersions, filterNeoforgeForMc } from './neoforge'
import { fetchForgeVersions, filterForgeForMc } from './forge'

/**
 * Unified access to version metadata across loaders, with simple in-memory
 * caching so the dropdowns don't re-hit the network on every open. Caches live
 * for the app session; a relaunch refreshes them.
 */

let mcCache: MinecraftVersion[] | null = null
let fabricGameCache: string[] | null = null
let fabricLoaderCache: LoaderVersion[] | null = null
let neoforgeCache: string[] | null = null
let forgeCache: string[] | null = null

export async function getMinecraftVersions(): Promise<MinecraftVersion[]> {
  if (!mcCache) mcCache = await fetchMinecraftVersions()
  return mcCache
}

export async function getLoaderVersions(
  loader: Loader,
  mcVersion: string
): Promise<LoaderVersion[]> {
  switch (loader) {
    case 'vanilla':
      return []
    case 'fabric': {
      if (!fabricGameCache) fabricGameCache = await fetchFabricGameVersions()
      if (!fabricGameCache.includes(mcVersion)) return []
      if (!fabricLoaderCache) fabricLoaderCache = await fetchFabricLoaderVersions()
      return fabricLoaderCache
    }
    case 'neoforge': {
      if (!neoforgeCache) neoforgeCache = await fetchNeoforgeVersions()
      return filterNeoforgeForMc(neoforgeCache, mcVersion)
    }
    case 'forge': {
      if (!forgeCache) forgeCache = await fetchForgeVersions()
      return filterForgeForMc(forgeCache, mcVersion)
    }
  }
}
