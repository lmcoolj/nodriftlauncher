import { join } from 'node:path'
import { runtimeDir } from '../paths'
import { currentOsKey, rulesAllow } from './rules'
import type { Library } from './types'

export function librariesRoot(): string {
  return join(runtimeDir(), 'libraries')
}

/**
 * Deduplicate libraries by group:artifact(:classifier), keeping the FIRST
 * occurrence. When a loader profile is merged over vanilla with the loader's
 * libraries first, this keeps the loader's version and drops vanilla's duplicate
 * — required by Forge/NeoForge's module system, which rejects duplicate jars.
 */
export function dedupeLibraries(libraries: Library[]): Library[] {
  const seen = new Set<string>()
  const out: Library[] = []
  for (const lib of libraries) {
    const parts = lib.name.split(':')
    const key = `${parts[0]}:${parts[1]}:${parts[3] ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(lib)
  }
  return out
}

export interface ResolvedLibrary {
  /** Absolute local path within the shared libraries store. */
  path: string
  url: string
  sha1?: string
  size?: number
  /** True for native binaries that get extracted rather than put on classpath. */
  isNative: boolean
}

const MAVEN_CENTRAL = 'https://repo1.maven.org/maven2/'

/**
 * Convert maven coordinates to a repo-relative path. Supports the full form used
 * by Forge/NeoForge data entries: group:artifact:version[:classifier][@ext].
 */
export function mavenCoordToPath(coord: string): string {
  let ext = 'jar'
  let body = coord
  const at = body.indexOf('@')
  if (at >= 0) {
    ext = body.slice(at + 1)
    body = body.slice(0, at)
  }
  const parts = body.split(':')
  const [group, artifact, version] = parts
  const classifier = parts[3]
  const dir = `${group.replace(/\./g, '/')}/${artifact}/${version}`
  const file = classifier
    ? `${artifact}-${version}-${classifier}.${ext}`
    : `${artifact}-${version}.${ext}`
  return `${dir}/${file}`
}

/**
 * Resolve the libraries that apply to the current OS into concrete download
 * targets. Handles both modern layouts (natives are their own OS-gated library
 * entries with ":natives-<os>" in the name) and the legacy `natives` classifier
 * map (<1.13).
 */
export function resolveLibraries(libraries: Library[]): ResolvedLibrary[] {
  const resolved: ResolvedLibrary[] = []

  // NOTE: no dedupe here — installer processor library sets legitimately contain
  // multiple versions of the same artifact (e.g. jopt-simple 5.0.4 AND 6.0-alpha-3),
  // and all must be downloaded. Dedupe is applied only to the launch classpath.
  for (const lib of libraries) {
    if (!rulesAllow(lib.rules)) continue

    // Modern: a single artifact per library entry. Native entries are gated by
    // their own rules (already applied above) and marked by name. The URL may be
    // empty for Forge/NeoForge libraries that are produced locally by processors
    // — we still record the path (for the classpath) and skip the download.
    const artifact = lib.downloads?.artifact
    if (artifact?.path) {
      resolved.push({
        path: join(librariesRoot(), artifact.path),
        url: artifact.url ?? '',
        sha1: artifact.sha1,
        size: artifact.size,
        isNative: lib.name.includes(':natives-')
      })
    } else if (lib.name) {
      // Maven-style entry (Fabric/Forge/NeoForge loader libraries): resolve the
      // path from the coordinates and download from the library's repo URL.
      const rel = mavenCoordToPath(lib.name)
      const base = lib.url ?? MAVEN_CENTRAL
      const url = lib.url === '' ? '' : (base.endsWith('/') ? base : base + '/') + rel
      resolved.push({
        path: join(librariesRoot(), rel),
        url,
        isNative: lib.name.includes(':natives-')
      })
    }

    // Legacy: natives classifier map -> downloads.classifiers[<classifier>].
    if (lib.natives) {
      const rawClassifier = lib.natives[currentOsKey()]
      if (rawClassifier) {
        const classifier = rawClassifier.replace(
          '${arch}',
          process.arch === 'ia32' ? '32' : '64'
        )
        const nativeArtifact = lib.downloads?.classifiers?.[classifier]
        if (nativeArtifact?.path && nativeArtifact.url) {
          resolved.push({
            path: join(librariesRoot(), nativeArtifact.path),
            url: nativeArtifact.url,
            sha1: nativeArtifact.sha1,
            size: nativeArtifact.size,
            isNative: true
          })
        }
      }
    }
  }

  return resolved
}
