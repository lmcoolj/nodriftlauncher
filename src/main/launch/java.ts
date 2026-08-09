import { join } from 'node:path'
import { promises as fs } from 'node:fs'
import { runtimeDir } from '../paths'
import { downloadFile, fetchJson, pool } from './net'

// Mojang's Java runtime index. It maps OS -> component name -> [runtime info].
const ALL_JSON =
  'https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json'

interface JreRuntimeInfo {
  manifest: { url: string; sha1: string; size: number }
  version: { name: string; released: string }
}

type AllJson = Record<string, Record<string, JreRuntimeInfo[]>>

interface JreManifest {
  files: Record<
    string,
    {
      type: 'file' | 'directory' | 'link'
      executable?: boolean
      target?: string
      downloads?: { raw: { url: string; sha1: string; size: number } }
    }
  >
}

/** Map the current platform/arch to Mojang's Java-runtime OS key. */
function javaOsKey(): string {
  const arch = process.arch
  switch (process.platform) {
    case 'win32':
      if (arch === 'arm64') return 'windows-arm64'
      if (arch === 'ia32') return 'windows-x86'
      return 'windows-x64'
    case 'darwin':
      return arch === 'arm64' ? 'mac-os-arm64' : 'mac-os'
    default:
      if (arch === 'ia32') return 'linux-i386'
      return 'linux' // Mojang's 64-bit Linux key is just "linux"
  }
}

export function javaHome(component: string): string {
  return join(runtimeDir(), 'java', component, javaOsKey())
}

export function javaExecutable(component: string): string {
  const home = javaHome(component)
  return process.platform === 'win32'
    ? join(home, 'bin', 'java.exe')
    : join(home, 'bin', 'java')
}

/**
 * Ensure the requested Java runtime component is installed and return the path
 * to its `java` executable. Downloads the per-OS component manifest and every
 * file it lists. Idempotent: if the executable already exists we skip straight
 * to returning it.
 */
export async function ensureJava(
  component: string,
  onProgress: (done: number, total: number) => void
): Promise<string> {
  const exe = javaExecutable(component)
  try {
    await fs.access(exe)
    return exe
  } catch {
    // needs installing
  }

  const all = await fetchJson<AllJson>(ALL_JSON)
  const info = all[javaOsKey()]?.[component]?.[0]
  if (!info) {
    throw new Error(`No Java runtime "${component}" available for ${javaOsKey()}.`)
  }

  const manifest = await fetchJson<JreManifest>(info.manifest.url)
  const home = javaHome(component)
  const entries = Object.entries(manifest.files)

  // Create directory tree first.
  for (const [rel, file] of entries) {
    if (file.type === 'directory') {
      await fs.mkdir(join(home, rel), { recursive: true })
    }
  }

  const fileEntries = entries.filter(([, f]) => f.type === 'file')
  let done = 0
  await pool(fileEntries, 8, async ([rel, file]) => {
    const raw = file.downloads?.raw
    if (raw) {
      const dest = join(home, rel)
      await downloadFile(raw.url, dest, raw.sha1)
      if (file.executable && process.platform !== 'win32') {
        try {
          await fs.chmod(dest, 0o755)
        } catch {
          // best effort
        }
      }
    }
    done += 1
    onProgress(done, fileEntries.length)
  })

  // Symlinks (posix runtimes only).
  for (const [rel, file] of entries) {
    if (file.type === 'link' && file.target) {
      const linkPath = join(home, rel)
      try {
        await fs.unlink(linkPath)
      } catch {
        // no existing link
      }
      try {
        await fs.symlink(file.target, linkPath)
      } catch {
        // best effort
      }
    }
  }

  return exe
}
