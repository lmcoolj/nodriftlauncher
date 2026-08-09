import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { authService } from '../auth/authService'

const SKIN_URL = 'https://api.minecraftservices.com/minecraft/profile/skins'
const SKIN_ACTIVE_URL = 'https://api.minecraftservices.com/minecraft/profile/skins/active'

export type SkinVariant = 'classic' | 'slim'

/** Location of the bundled skin catalog PNGs. */
export function catalogDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'skins')
    : join(app.getAppPath(), 'resources', 'skins')
}

export interface CatalogSkin {
  id: string
  name: string
  dataUrl: string
}

export async function listCatalog(): Promise<CatalogSkin[]> {
  let files: string[]
  try {
    files = await fs.readdir(catalogDir())
  } catch {
    return []
  }
  const skins: CatalogSkin[] = []
  for (const file of files.filter((f) => f.toLowerCase().endsWith('.png'))) {
    const buf = await fs.readFile(join(catalogDir(), file))
    const name = file
      .replace(/\.png$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
    skins.push({ id: file, name, dataUrl: `data:image/png;base64,${buf.toString('base64')}` })
  }
  return skins
}

async function uploadSkin(buffer: Buffer, variant: SkinVariant): Promise<void> {
  const token = authService.getMinecraftToken()
  if (!token) throw new Error('Sign in to change your skin.')

  const form = new FormData()
  form.append('variant', variant)
  form.append('file', new Blob([new Uint8Array(buffer)], { type: 'image/png' }), 'skin.png')

  const res = await fetch(SKIN_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  })
  if (!res.ok) throw new Error(`Skin upload failed (${res.status}).`)
  await authService.refreshProfile()
}

export async function uploadSkinFromFile(path: string, variant: SkinVariant): Promise<void> {
  await uploadSkin(await fs.readFile(path), variant)
}

export async function applyCatalogSkin(id: string, variant: SkinVariant): Promise<void> {
  const safeId = id.replace(/[\\/]/g, '') // no path traversal
  await uploadSkin(await fs.readFile(join(catalogDir(), safeId)), variant)
}

export async function resetSkin(): Promise<void> {
  const token = authService.getMinecraftToken()
  if (!token) throw new Error('Sign in to reset your skin.')
  const res = await fetch(SKIN_ACTIVE_URL, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`Skin reset failed (${res.status}).`)
  await authService.refreshProfile()
}
