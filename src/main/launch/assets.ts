import { join } from 'node:path'
import { runtimeDir } from '../paths'
import { downloadFile, fetchJson, pool } from './net'
import type { AssetIndexRef } from './types'

const RESOURCES_HOST = 'https://resources.download.minecraft.net'

interface AssetIndexFile {
  objects: Record<string, { hash: string; size: number }>
  virtual?: boolean
  map_to_resources?: boolean
}

export function assetsRoot(): string {
  return join(runtimeDir(), 'assets')
}

/**
 * Download the asset index and every referenced object into the shared asset
 * store. Objects are content-addressed by their SHA-1, so downloadFile's sha1
 * check makes this fully resumable and dedup-safe.
 */
export async function installAssets(
  index: AssetIndexRef,
  onProgress: (done: number, total: number) => void
): Promise<void> {
  const indexPath = join(assetsRoot(), 'indexes', `${index.id}.json`)
  await downloadFile(index.url, indexPath, index.sha1)

  const data = await fetchJson<AssetIndexFile>(index.url)
  const objects = Object.values(data.objects)
  let done = 0

  await pool(objects, 16, async (obj) => {
    const sub = obj.hash.slice(0, 2)
    const dest = join(assetsRoot(), 'objects', sub, obj.hash)
    await downloadFile(`${RESOURCES_HOST}/${sub}/${obj.hash}`, dest, obj.hash)
    done += 1
    onProgress(done, objects.length)
  })
}
