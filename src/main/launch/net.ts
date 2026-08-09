import { promises as fs } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname } from 'node:path'

/** SHA-1 of a file, or null if it doesn't exist / can't be read. */
export async function fileSha1(path: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(path)
    return createHash('sha1').update(buf).digest('hex')
  } catch {
    return null
  }
}

/**
 * Download a URL to disk. If a sha1 is given and the destination already matches
 * it, the download is skipped (this is what gives us dedup + resume for free).
 * When present, the sha1 is also verified after downloading.
 */
export async function downloadFile(url: string, dest: string, sha1?: string): Promise<void> {
  if (sha1) {
    const existing = await fileSha1(dest)
    if (existing === sha1) return
  } else {
    try {
      await fs.access(dest)
      return
    } catch {
      // not present — download it
    }
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())

  if (sha1) {
    const got = createHash('sha1').update(buf).digest('hex')
    if (got !== sha1) throw new Error(`SHA-1 mismatch for ${url} (expected ${sha1}, got ${got})`)
  }

  await fs.mkdir(dirname(dest), { recursive: true })
  await fs.writeFile(dest, buf)
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`)
  return (await res.json()) as T
}

/** Run an async worker over items with bounded concurrency. */
export async function pool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let next = 0
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++
        await worker(items[index], index)
      }
    }
  )
  await Promise.all(runners)
}
