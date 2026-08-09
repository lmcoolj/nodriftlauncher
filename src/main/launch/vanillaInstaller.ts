import { join } from 'node:path'
import { promises as fs } from 'node:fs'
import { runtimeDir } from '../paths'
import { downloadFile, fetchJson, pool } from './net'
import { resolveLibraries } from './libraries'
import { installAssets } from './assets'
import { ensureJava } from './java'
import type { InstallPhase, VersionData } from './types'

export function versionDir(id: string): string {
  return join(runtimeDir(), 'versions', id)
}
export function versionJarPath(id: string): string {
  return join(versionDir(id), `${id}.jar`)
}
export function versionJsonPath(id: string): string {
  return join(versionDir(id), `${id}.json`)
}
function installMarkerPath(id: string): string {
  return join(versionDir(id), '.installed')
}

export type ProgressReporter = (phase: InstallPhase, done: number, total: number) => void

/** Read a cached version JSON from disk, if present. */
async function readCachedVersion(id: string): Promise<VersionData | null> {
  try {
    const raw = await fs.readFile(versionJsonPath(id), 'utf-8')
    return JSON.parse(raw) as VersionData
  } catch {
    return null
  }
}

/**
 * True if this runtime has already been fully installed (marker present and the
 * client jar + java executable exist). Lets relaunch skip the whole pipeline —
 * and enables offline relaunch of an already-downloaded version.
 */
export async function isVanillaInstalled(versionId: string): Promise<boolean> {
  try {
    await fs.access(installMarkerPath(versionId))
    await fs.access(versionJarPath(versionId))
    return true
  } catch {
    return false
  }
}

/**
 * Download everything a vanilla version needs into the SHARED runtime store:
 * version JSON, client jar, libraries, natives, assets and the matching Java
 * runtime. Returns the parsed version data used to build launch args.
 */
export async function installVanilla(
  versionId: string,
  versionUrl: string,
  report: ProgressReporter
): Promise<VersionData> {
  // 1. Version JSON.
  report('version', 0, 1)
  const version = await fetchJson<VersionData>(versionUrl)
  await fs.mkdir(versionDir(versionId), { recursive: true })
  await fs.writeFile(versionJsonPath(versionId), JSON.stringify(version), 'utf-8')
  report('version', 1, 1)

  // 2. Client jar.
  report('client', 0, 1)
  await downloadFile(version.downloads.client.url, versionJarPath(versionId), version.downloads.client.sha1)
  report('client', 1, 1)

  // 3. Libraries (includes native jars; natives are extracted at launch time so
  //    the version's expected layout is honoured and installs self-repair).
  const libs = resolveLibraries(version.libraries)
  let libDone = 0
  report('libraries', 0, libs.length)
  await pool(libs, 8, async (lib) => {
    if (lib.url) await downloadFile(lib.url, lib.path, lib.sha1)
    libDone += 1
    report('libraries', libDone, libs.length)
  })

  // 4. Assets.
  await installAssets(version.assetIndex, (done, total) => report('assets', done, total))

  // 5. Java runtime.
  const component = version.javaVersion?.component ?? 'jre-legacy'
  await ensureJava(component, (done, total) => report('java', done, total))

  // Mark complete so relaunch (and offline launch) can skip this pipeline.
  await fs.writeFile(
    installMarkerPath(versionId),
    JSON.stringify({ assetIndex: version.assetIndex.id, at: Date.now() }),
    'utf-8'
  )

  return version
}

/** Load the version data for an already-installed runtime (for fast relaunch). */
export async function loadInstalledVersion(versionId: string): Promise<VersionData> {
  const cached = await readCachedVersion(versionId)
  if (!cached) throw new Error(`Version ${versionId} is not installed.`)
  return cached
}
