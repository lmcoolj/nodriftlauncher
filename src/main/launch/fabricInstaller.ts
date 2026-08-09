import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { downloadFile, fetchJson, pool } from './net'
import { resolveLibraries } from './libraries'
import { versionDir, versionJsonPath, type ProgressReporter } from './vanillaInstaller'
import type { LoaderProfile, VersionData } from './types'

const FABRIC_META = 'https://meta.fabricmc.net/v2'

/** The synthetic version id for a Fabric runtime (matches Fabric's own profile id). */
export function fabricVersionId(mcVersion: string, loaderVersion: string): string {
  return `fabric-loader-${loaderVersion}-${mcVersion}`
}

function markerPath(id: string): string {
  return join(versionDir(id), '.installed')
}

export async function isFabricInstalled(id: string): Promise<boolean> {
  try {
    await fs.access(markerPath(id))
    await fs.access(versionJsonPath(id))
    return true
  } catch {
    return false
  }
}

/** Fetch the launcher profile for a Fabric loader + MC version pair. */
async function fetchFabricProfile(
  mcVersion: string,
  loaderVersion: string
): Promise<LoaderProfile> {
  const url = `${FABRIC_META}/versions/loader/${mcVersion}/${loaderVersion}/profile/json`
  return fetchJson<LoaderProfile>(url)
}

/**
 * Merge a loader profile over a vanilla version: the loader supplies extra
 * libraries (prepended so they take classpath precedence), the main class, and
 * extra arguments; everything else (assets, downloads, java) is inherited.
 */
export function mergeProfile(vanilla: VersionData, profile: LoaderProfile): VersionData {
  return {
    ...vanilla,
    id: profile.id,
    mainClass: profile.mainClass,
    // Loader libraries first so they win classpath dedupe (applied at launch).
    libraries: [...profile.libraries, ...vanilla.libraries],
    arguments: {
      jvm: [...(vanilla.arguments?.jvm ?? []), ...(profile.arguments?.jvm ?? [])],
      game: [...(vanilla.arguments?.game ?? []), ...(profile.arguments?.game ?? [])]
    }
  }
}

/**
 * Install Fabric on top of an already-installed vanilla version: download the
 * Fabric libraries and write the merged version JSON. Returns the merged data.
 */
export async function installFabric(
  vanilla: VersionData,
  mcVersion: string,
  loaderVersion: string,
  report: ProgressReporter
): Promise<VersionData> {
  const id = fabricVersionId(mcVersion, loaderVersion)
  const profile = await fetchFabricProfile(mcVersion, loaderVersion)

  const libs = resolveLibraries(profile.libraries)
  let done = 0
  report('libraries', 0, libs.length)
  await pool(libs, 8, async (lib) => {
    if (lib.url) await downloadFile(lib.url, lib.path, lib.sha1)
    done += 1
    report('libraries', done, libs.length)
  })

  const merged = mergeProfile(vanilla, profile)
  await fs.mkdir(versionDir(id), { recursive: true })
  await fs.writeFile(versionJsonPath(id), JSON.stringify(merged), 'utf-8')
  await fs.writeFile(markerPath(id), JSON.stringify({ at: Date.now() }), 'utf-8')
  return merged
}

export async function loadFabricVersion(id: string): Promise<VersionData> {
  const raw = await fs.readFile(versionJsonPath(id), 'utf-8')
  return JSON.parse(raw) as VersionData
}
