import AdmZip from 'adm-zip'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { delimiter, dirname, join } from 'node:path'
import { dataRoot, runtimeDir } from '../paths'
import { downloadFile, pool } from './net'
import { librariesRoot, mavenCoordToPath, resolveLibraries } from './libraries'
import { mergeProfile } from './fabricInstaller'
import { versionDir, versionJarPath, versionJsonPath, type ProgressReporter } from './vanillaInstaller'
import type { Library, LoaderProfile, VersionData } from './types'

type ForgeLikeLoader = 'forge' | 'neoforge'

interface Processor {
  sides?: string[]
  jar: string
  classpath: string[]
  args: string[]
  outputs?: Record<string, string>
}

interface InstallProfile {
  spec?: number
  /** Path inside the installer jar to the launch profile JSON. */
  json: string
  minecraft: string
  data: Record<string, { client: string; server: string }>
  processors: Processor[]
  libraries: Library[]
}

export function forgeLikeVersionId(loader: ForgeLikeLoader, raw: string): string {
  return `${loader}-${raw}`
}

function installerUrl(loader: ForgeLikeLoader, raw: string): string {
  return loader === 'neoforge'
    ? `https://maven.neoforged.net/releases/net/neoforged/neoforge/${raw}/neoforge-${raw}-installer.jar`
    : `https://maven.minecraftforge.net/net/minecraftforge/forge/${raw}/forge-${raw}-installer.jar`
}

function markerPath(id: string): string {
  return join(versionDir(id), '.installed')
}

export async function isForgeLikeInstalled(id: string): Promise<boolean> {
  try {
    await fs.access(markerPath(id))
    await fs.access(versionJsonPath(id))
    return true
  } catch {
    return false
  }
}

export async function loadForgeLikeVersion(id: string): Promise<VersionData> {
  const raw = await fs.readFile(versionJsonPath(id), 'utf-8')
  return JSON.parse(raw) as VersionData
}

function readEntryText(zip: AdmZip, name: string): string {
  const entry = zip.getEntry(name)
  if (!entry) throw new Error(`Installer is missing ${name}`)
  return entry.getData().toString('utf-8')
}

/** Extract every entry under a prefix (e.g. "maven/") into a destination root. */
async function extractPrefix(zip: AdmZip, prefix: string, destRoot: string): Promise<void> {
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    if (!entry.entryName.startsWith(prefix)) continue
    const rel = entry.entryName.slice(prefix.length)
    const dest = join(destRoot, rel)
    await fs.mkdir(dirname(dest), { recursive: true })
    await fs.writeFile(dest, entry.getData())
  }
}

/** Read the Main-Class from a jar's manifest. */
function readMainClass(jarPath: string): string {
  const zip = new AdmZip(jarPath)
  const entry = zip.getEntry('META-INF/MANIFEST.MF')
  if (!entry) throw new Error(`No manifest in ${jarPath}`)
  const match = entry.getData().toString('utf-8').match(/Main-Class:\s*(\S+)/)
  if (!match) throw new Error(`No Main-Class in ${jarPath}`)
  return match[1]
}

/** Resolve a single data-map value (maven bracket / quoted literal / jar path). */
async function resolveDataValue(zip: AdmZip, raw: string, tempDir: string): Promise<string> {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return join(librariesRoot(), mavenCoordToPath(raw.slice(1, -1)))
  }
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1)
  }
  if (raw.startsWith('/')) {
    const internal = raw.slice(1)
    const entry = zip.getEntry(internal)
    if (!entry) throw new Error(`Installer is missing data file ${internal}`)
    const dest = join(tempDir, internal.replace(/\//g, '_'))
    await fs.writeFile(dest, entry.getData())
    return dest
  }
  return raw
}

interface DataContext {
  mcJar: string
  mcVersion: string
  installerPath: string
}

async function buildDataMap(
  zip: AdmZip,
  data: InstallProfile['data'],
  tempDir: string,
  ctx: DataContext
): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  for (const [key, value] of Object.entries(data)) {
    map[key] = await resolveDataValue(zip, value.client, tempDir)
  }
  // Injected variables available to every processor.
  map.SIDE = 'client'
  map.MINECRAFT_JAR = ctx.mcJar
  map.MINECRAFT_VERSION = ctx.mcVersion
  map.ROOT = dataRoot()
  map.INSTALLER = ctx.installerPath
  map.LIBRARY_DIR = librariesRoot()
  return map
}

function substituteArg(arg: string, dataMap: Record<string, string>): string {
  if (arg.startsWith('[') && arg.endsWith(']')) {
    return join(librariesRoot(), mavenCoordToPath(arg.slice(1, -1)))
  }
  return arg.replace(/\{(\w+)\}/g, (_match, key: string) => dataMap[key] ?? `{${key}}`)
}

/** Run one processor as a Java subprocess; reject on non-zero exit. */
function runProcessor(
  proc: Processor,
  dataMap: Record<string, string>,
  javaExe: string
): Promise<void> {
  const jarPath = join(librariesRoot(), mavenCoordToPath(proc.jar))
  const classpath = [jarPath, ...proc.classpath.map((c) => join(librariesRoot(), mavenCoordToPath(c)))]
  const mainClass = readMainClass(jarPath)
  const args = proc.args.map((a) => substituteArg(a, dataMap))

  return new Promise<void>((resolve, reject) => {
    const child = spawn(javaExe, ['-cp', classpath.join(delimiter), mainClass, ...args])
    let output = ''
    child.stdout?.on('data', (d: Buffer) => {
      output += d.toString()
    })
    child.stderr?.on('data', (d: Buffer) => {
      output += d.toString()
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Processor ${mainClass} failed (exit ${code}):\n${output.slice(-2000)}`))
    })
  })
}

/**
 * Install Forge or NeoForge on top of an already-installed vanilla version by
 * running the installer's processors (which patch/remap the client), then write
 * the merged launch profile. Returns the merged version data.
 */
export async function installForgeLike(
  loader: ForgeLikeLoader,
  mcVersion: string,
  raw: string,
  vanilla: VersionData,
  javaExe: string,
  report: ProgressReporter
): Promise<VersionData> {
  const id = forgeLikeVersionId(loader, raw)
  const installerDir = join(runtimeDir(), 'installers')
  await fs.mkdir(installerDir, { recursive: true })
  const installerPath = join(installerDir, `${id}-installer.jar`)

  // 1. Download the installer jar and open it.
  report('libraries', 0, 1)
  await downloadFile(installerUrl(loader, raw), installerPath)
  const zip = new AdmZip(installerPath)

  const profile = JSON.parse(readEntryText(zip, 'install_profile.json')) as InstallProfile
  const versionJsonName = profile.json.replace(/^\//, '')
  const versionProfile = JSON.parse(readEntryText(zip, versionJsonName)) as LoaderProfile

  // 2. Extract any bundled maven artifacts (fat installers ship these).
  await extractPrefix(zip, 'maven/', librariesRoot())

  // 3. Download install-profile + version libraries (skip processor outputs and
  //    anything already provided by the extracted maven/ folder).
  const libs = [
    ...resolveLibraries(profile.libraries),
    ...resolveLibraries(versionProfile.libraries)
  ]
  let done = 0
  report('libraries', 0, libs.length)
  await pool(libs, 8, async (lib) => {
    if (lib.url) {
      try {
        await downloadFile(lib.url, lib.path, lib.sha1)
      } catch (err) {
        // Some artifacts are only bundled; tolerate a 404 if the file exists.
        try {
          await fs.access(lib.path)
        } catch {
          throw err
        }
      }
    }
    done += 1
    report('libraries', done, libs.length)
  })

  // 4. Resolve the data map and run the client processors in order.
  const tempDir = join(installerDir, `${id}-data`)
  await fs.mkdir(tempDir, { recursive: true })
  const dataMap = await buildDataMap(zip, profile.data, tempDir, {
    mcJar: versionJarPath(mcVersion),
    mcVersion,
    installerPath
  })

  const clientProcessors = profile.processors.filter(
    (p) => !p.sides || p.sides.includes('client')
  )
  report('processors', 0, clientProcessors.length)
  let pdone = 0
  for (const proc of clientProcessors) {
    await runProcessor(proc, dataMap, javaExe)
    pdone += 1
    report('processors', pdone, clientProcessors.length)
  }

  // 5. Write the merged launch profile.
  const merged = mergeProfile(vanilla, versionProfile)
  await fs.mkdir(versionDir(id), { recursive: true })
  await fs.writeFile(versionJsonPath(id), JSON.stringify(merged), 'utf-8')
  await fs.writeFile(markerPath(id), JSON.stringify({ at: Date.now() }), 'utf-8')
  return merged
}
