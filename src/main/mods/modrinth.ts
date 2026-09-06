import { app } from 'electron'

const API = 'https://api.modrinth.com/v2'
// Modrinth asks API consumers to send a descriptive User-Agent.
const USER_AGENT = `nodrift_labs/NodriftClient/${app.getVersion()}`

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

/** Modrinth project types this launcher browses. */
export type ProjectType = 'mod' | 'resourcepack' | 'shader'

export interface SearchOptions {
  query: string
  /** What to search — mods (default), resource packs, or shaders. */
  projectType?: ProjectType
  /** Manual MC version filter (empty = any). */
  mcVersion?: string
  /** Loader categories to OR together (fabric/forge/neoforge). */
  loaders?: string[]
  /** Content categories to OR together (optimization/decoration/…). */
  categories?: string[]
  /** Environment filter. */
  environment?: 'client' | 'server' | 'both' | null
  offset?: number
}

/**
 * Search Modrinth. Facets are AND-ed across sub-arrays and OR-ed within one.
 * Loaders and content categories both live in the `categories` facet.
 */
export async function searchMods(options: SearchOptions): Promise<ModHit[]> {
  const facets: string[][] = [[`project_type:${options.projectType ?? 'mod'}`]]
  if (options.mcVersion) facets.push([`versions:${options.mcVersion}`])
  if (options.loaders?.length) facets.push(options.loaders.map((l) => `categories:${l}`))
  if (options.categories?.length) facets.push(options.categories.map((c) => `categories:${c}`))
  if (options.environment === 'client') facets.push(['server_side:unsupported'])
  else if (options.environment === 'server') facets.push(['client_side:unsupported'])
  else if (options.environment === 'both') {
    facets.push(['client_side:required'])
    facets.push(['server_side:required'])
  }

  const params = new URLSearchParams({
    query: options.query,
    facets: JSON.stringify(facets),
    limit: '30',
    offset: String(options.offset ?? 0),
    index: 'relevance'
  })
  const res = await fetch(`${API}/search?${params.toString()}`, { headers: headers() })
  if (!res.ok) throw new Error(`Modrinth search failed (${res.status})`)
  const data = (await res.json()) as SearchResponse
  return data.hits
}

export interface ModProject {
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

/** Fetch a project's full details for the mod detail page. */
export async function getProject(id: string): Promise<ModProject> {
  const res = await fetch(`${API}/project/${id}`, { headers: headers() })
  if (!res.ok) throw new Error(`Modrinth project lookup failed (${res.status})`)
  const d = (await res.json()) as Record<string, unknown>
  return {
    id: String(d.id),
    slug: String(d.slug),
    title: String(d.title),
    description: String(d.description ?? ''),
    body: String(d.body ?? ''),
    icon_url: (d.icon_url as string | null) ?? null,
    downloads: Number(d.downloads ?? 0),
    categories: (d.categories as string[]) ?? [],
    game_versions: (d.game_versions as string[]) ?? [],
    loaders: (d.loaders as string[]) ?? [],
    gallery: ((d.gallery as Array<{ url: string; title: string | null }>) ?? []).map((g) => ({
      url: g.url,
      title: g.title ?? null
    }))
  }
}

interface ModrinthFile {
  url: string
  filename: string
  primary: boolean
  size: number
  hashes: { sha1?: string; sha512?: string }
}

interface ModrinthDependency {
  project_id: string | null
  version_id: string | null
  dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded'
}

interface ModrinthVersion {
  id: string
  version_number: string
  date_published: string
  loaders: string[]
  game_versions: string[]
  files: ModrinthFile[]
  dependencies: ModrinthDependency[]
}

export interface ResolvedMod {
  versionId: string
  url: string
  filename: string
  sha1?: string
  sha512?: string
  fileSize: number
  /** project ids of required dependencies. */
  requiredDependencies: string[]
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
    fileSize: file.size,
    requiredDependencies: (version.dependencies ?? [])
      .filter((d) => d.dependency_type === 'required' && d.project_id)
      .map((d) => d.project_id as string)
  }
}

/**
 * Resolve the newest project version compatible with an MC version, ignoring the
 * mod loader. Used for resource packs / shaders, which aren't tied to a loader.
 */
export async function resolvePackVersion(
  projectId: string,
  mcVersion: string
): Promise<ResolvedMod | null> {
  const params = new URLSearchParams({ game_versions: JSON.stringify([mcVersion]) })
  const res = await fetch(`${API}/project/${projectId}/version?${params.toString()}`, {
    headers: headers()
  })
  if (!res.ok) throw new Error(`Modrinth version lookup failed (${res.status})`)
  const versions = (await res.json()) as ModrinthVersion[]
  if (versions.length === 0) return null

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
    fileSize: file.size,
    requiredDependencies: []
  }
}

interface CategoryTag {
  name: string
  project_type: string
}

/** Fetch Modrinth's category tags for a project type (populates the Packs filters). */
export async function getCategories(projectType: ProjectType): Promise<string[]> {
  const res = await fetch(`${API}/tag/category`, { headers: headers() })
  if (!res.ok) throw new Error(`Modrinth category lookup failed (${res.status})`)
  const tags = (await res.json()) as CategoryTag[]
  return tags.filter((t) => t.project_type === projectType).map((t) => t.name)
}

export interface ModVersionOption {
  versionId: string
  versionNumber: string
  datePublished: string
  url: string
  filename: string
  sha1?: string
  sha512?: string
  fileSize: number
}

/** List all versions of a project compatible with an instance's MC + loader. */
export async function getProjectVersions(
  projectId: string,
  mcVersion: string,
  loader: string
): Promise<ModVersionOption[]> {
  const params = new URLSearchParams({
    loaders: JSON.stringify([loader]),
    game_versions: JSON.stringify([mcVersion])
  })
  const res = await fetch(`${API}/project/${projectId}/version?${params.toString()}`, {
    headers: headers()
  })
  if (!res.ok) throw new Error(`Modrinth version list failed (${res.status})`)
  const versions = (await res.json()) as ModrinthVersion[]
  const options: ModVersionOption[] = []
  for (const v of versions) {
    const file = v.files.find((f) => f.primary) ?? v.files[0]
    if (!file) continue
    options.push({
      versionId: v.id,
      versionNumber: v.version_number,
      datePublished: v.date_published,
      url: file.url,
      filename: file.filename,
      sha1: file.hashes.sha1,
      sha512: file.hashes.sha512,
      fileSize: file.size
    })
  }
  options.sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1))
  return options
}

/** Fetch just a project's title (for dependency lists). */
export async function getProjectTitle(id: string): Promise<string> {
  try {
    const res = await fetch(`${API}/project/${id}`, { headers: headers() })
    if (!res.ok) return id
    const d = (await res.json()) as { title?: string }
    return d.title ?? id
  } catch {
    return id
  }
}
