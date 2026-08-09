import { promises as fs } from 'node:fs'
import { authService } from '../auth/authService'

const SKIN_URL = 'https://api.minecraftservices.com/minecraft/profile/skins'
const SKIN_ACTIVE_URL = 'https://api.minecraftservices.com/minecraft/profile/skins/active'

export type SkinVariant = 'classic' | 'slim'

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
