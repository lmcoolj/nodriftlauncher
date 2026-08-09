import type { LoaderVersion } from './types'

const NEOFORGE_URL =
  'https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge'

interface NeoforgeResponse {
  isSnapshot: boolean
  versions: string[]
}

export async function fetchNeoforgeVersions(): Promise<string[]> {
  const res = await fetch(NEOFORGE_URL)
  if (!res.ok) throw new Error(`Failed to fetch NeoForge versions (${res.status})`)
  const data = (await res.json()) as NeoforgeResponse
  return data.versions
}

/**
 * Compute the NeoForge version prefix for a Minecraft version, per the official
 * versioning scheme (https://docs.neoforged.net/docs/gettingstarted/versioning/):
 *  - Legacy MC "1.A.B"   -> NeoForge "A.B."     (drop the leading 1; B defaults to 0)
 *  - Calendar MC "A.B.C" -> NeoForge "A.B.C."   (C defaults to 0)
 */
export function neoforgePrefix(mc: string): string {
  const parts = mc.split('.')
  if (parts[0] === '1') {
    const major = parts[1] ?? '0'
    const minor = parts[2] ?? '0'
    return `${major}.${minor}.`
  }
  const major = parts[0]
  const minor = parts[1] ?? '0'
  const patch = parts[2] ?? '0'
  return `${major}.${minor}.${patch}.`
}

/** Filter the full NeoForge list down to builds for a given Minecraft version. */
export function filterNeoforgeForMc(versions: string[], mc: string): LoaderVersion[] {
  const prefix = neoforgePrefix(mc)
  return versions
    .filter((v) => v.startsWith(prefix))
    .map((v) => ({ version: v, stable: !v.includes('-beta'), raw: v }))
    .reverse()
}
