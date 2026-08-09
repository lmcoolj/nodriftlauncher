import type { LoaderVersion } from './types'

const FORGE_METADATA_URL =
  'https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml'

/**
 * Forge publishes only a maven-metadata.xml (no JSON API). We fetch and extract
 * the <version> entries; each is of the form "<mcVersion>-<forgeVersion>".
 */
export async function fetchForgeVersions(): Promise<string[]> {
  const res = await fetch(FORGE_METADATA_URL)
  if (!res.ok) throw new Error(`Failed to fetch Forge versions (${res.status})`)
  const xml = await res.text()
  const versions: string[] = []
  const regex = /<version>([^<]+)<\/version>/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(xml)) !== null) {
    versions.push(match[1])
  }
  return versions
}

/**
 * Filter Forge versions to a Minecraft version and strip the "<mc>-" prefix so
 * the dropdown shows just the Forge build (the full string is kept in `raw`).
 */
export function filterForgeForMc(versions: string[], mc: string): LoaderVersion[] {
  const prefix = `${mc}-`
  return versions
    .filter((v) => v.startsWith(prefix))
    .map((v) => ({ version: v.slice(prefix.length), stable: true, raw: v }))
    .reverse()
}
