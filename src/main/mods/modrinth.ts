const API = 'https://api.modrinth.com/v2'
// Modrinth asks API consumers to send a descriptive User-Agent.
const USER_AGENT = 'nodrift_labs/NodriftLauncher/0.1.0'

export interface ModHit {
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

interface SearchResponse {
  hits: ModHit[]
  total_hits: number
}

function headers(): Record<string, string> {
  return { 'User-Agent': USER_AGENT, Accept: 'application/json' }
}

/** Search Modrinth for mods compatible with a given MC version + loader. */
export async function searchMods(
  query: string,
  mcVersion: string,
  loader: string,
  offset = 0
): Promise<ModHit[]> {
  const facets: string[][] = [['project_type:mod']]
  if (mcVersion) facets.push([`versions:${mcVersion}`])
  if (loader && loader !== 'vanilla') facets.push([`categories:${loader}`])

  const params = new URLSearchParams({
    query,
    facets: JSON.stringify(facets),
    limit: '30',
    offset: String(offset),
    index: 'relevance'
  })
  const res = await fetch(`${API}/search?${params.toString()}`, { headers: headers() })
  if (!res.ok) throw new Error(`Modrinth search failed (${res.status})`)
  const data = (await res.json()) as SearchResponse
  return data.hits
}

interface ModrinthFile {
  url: string
  filename: string
  primary: boolean
  size: number
  hashes: { sha1?: string; sha512?: string }
}

interface ModrinthVersion {
  id: string
  version_number: string
  date_published: string
  loaders: string[]
  game_versions: string[]
  files: ModrinthFile[]
}

export interface ResolvedMod {
  versionId: string
  url: string
  filename: string
  sha1?: string
  sha512?: string
  fileSize: number
}

/** Pick the newest project version matching the loader + MC version, and its primary file. */
export async function resolveBestVersion(
  projectId: string,
  mcVersion: string,
  loader: string
): Promise<ResolvedMod | null> {
  const params = new URLSearchParams({
    loaders: JSON.stringify([loader]),
    game_versions: JSON.stringify([mcVersion])
  })
  const res = await fetch(`${API}/project/${projectId}/version?${params.toString()}`, {
    headers: headers()
  })
  if (!res.ok) throw new Error(`Modrinth version lookup failed (${res.status})`)
  const versions = (await res.json()) as ModrinthVersion[]
  if (versions.length === 0) return null

  // Newest first by publish date.
  versions.sort((a, b) => (a.date_published < b.date_published ? 1 : -1))
  const version = versions[0]
  const file = version.files.find((f) => f.primary) ?? version.files[0]
  if (!file) return null

  return {
    versionId: version.id,
    url: file.url,
    filename: file.filename,
    sha1: file.hashes.sha1,
    sha512: file.hashes.sha512,
    fileSize: file.size
  }
}
