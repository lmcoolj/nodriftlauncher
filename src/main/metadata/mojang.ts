import type { McVersionType, MinecraftVersion } from './types'

const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'

interface RawManifest {
  latest: { release: string; snapshot: string }
  versions: Array<{ id: string; type: string; url: string; releaseTime: string }>
}

/** Fetch the full list of Minecraft versions from Mojang's piston-meta manifest. */
export async function fetchMinecraftVersions(): Promise<MinecraftVersion[]> {
  const res = await fetch(MANIFEST_URL)
  if (!res.ok) {
    throw new Error(`Failed to fetch Minecraft version manifest (${res.status})`)
  }
  const data = (await res.json()) as RawManifest
  return data.versions.map((v) => ({
    id: v.id,
    type: v.type as McVersionType,
    releaseTime: v.releaseTime,
    url: v.url
  }))
}
