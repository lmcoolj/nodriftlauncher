import AdmZip from 'adm-zip'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { runtimeDir } from '../paths'
import type { VersionData } from './types'

/** Base natives folder for a shared-runtime key. */
export function nativesDir(runtimeKey: string): string {
  return join(runtimeDir(), 'natives', runtimeKey)
}

const NATIVE_EXT = /\.(dll|so|dylib|jnilib)$/i

export interface NativesLayout {
  /**
   * The directory the game's `-Djava.library.path` points at — where we must
   * place extracted native binaries. For old versions this is the base natives
   * dir; for the newest versions it is a subdir (e.g. `<base>/java`).
   */
  libraryPath: string
  /** All natives subdirectories referenced by the version's JVM args. */
  dirs: string[]
}

/**
 * Work out the natives layout a version expects by reading its JVM args. The
 * newest versions split natives across subdirectories (java/jna/lwjgl/netty);
 * older ones use the flat base directory. We honour whatever the version asks
 * for so both keep working.
 */
export function computeNativesLayout(version: VersionData, baseDir: string): NativesLayout {
  const dirs = new Set<string>([baseDir])
  let libraryPath = baseDir

  for (const arg of version.arguments?.jvm ?? []) {
    if (typeof arg !== 'string') continue
    const match = arg.match(/\$\{natives_directory\}(?:\/([A-Za-z0-9_]+))?/)
    if (!match) continue
    const dir = match[1] ? join(baseDir, match[1]) : baseDir
    dirs.add(dir)
    if (arg.startsWith('-Djava.library.path=')) libraryPath = dir
  }

  return { libraryPath, dirs: [...dirs] }
}

/** Extract native binaries from the given jars into destDir (flattened). */
export async function extractNatives(jarPaths: string[], destDir: string): Promise<void> {
  await fs.mkdir(destDir, { recursive: true })
  for (const jarPath of jarPaths) {
    const zip = new AdmZip(jarPath)
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue
      const name = entry.entryName
      if (name.startsWith('META-INF/')) continue
      if (!NATIVE_EXT.test(name)) continue
      const fileName = name.split('/').pop()
      if (!fileName) continue
      await fs.writeFile(join(destDir, fileName), entry.getData())
    }
  }
}

/**
 * Ensure all natives directories exist and the native binaries are extracted to
 * the version's expected library path. Idempotent and cheap, so it runs on every
 * launch and repairs installs made before this layout was understood.
 */
export async function ensureNatives(
  nativeJarPaths: string[],
  layout: NativesLayout
): Promise<void> {
  for (const dir of layout.dirs) {
    await fs.mkdir(dir, { recursive: true })
  }
  await extractNatives(nativeJarPaths, layout.libraryPath)
}
