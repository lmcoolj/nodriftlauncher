import { AUTH_CONFIG } from './config'
import { AuthError, type MinecraftProfile, type MinecraftToken } from './types'

interface McLoginResponse {
  access_token: string
  expires_in: number
}

/** Exchange the XSTS token + user hash for a Minecraft Services access token. */
export async function loginWithXbox(
  userHash: string,
  xstsToken: string
): Promise<MinecraftToken> {
  const res = await fetch(AUTH_CONFIG.minecraft.loginWithXboxUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ identityToken: `XBL3.0 x=${userHash};${xstsToken}` })
  })

  if (!res.ok) {
    throw new AuthError(`Minecraft login failed (${res.status})`, 'MC_LOGIN')
  }

  const data = (await res.json()) as McLoginResponse
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  }
}

/**
 * Fetch the player's Minecraft profile. A 404 means the account does not own
 * Minecraft (Java Edition) / has no profile — surfaced as a clear error.
 */
export async function fetchProfile(mcAccessToken: string): Promise<MinecraftProfile> {
  const res = await fetch(AUTH_CONFIG.minecraft.profileUrl, {
    headers: { Authorization: `Bearer ${mcAccessToken}`, Accept: 'application/json' }
  })

  if (res.status === 404) {
    throw new AuthError(
      'This Microsoft account does not own Minecraft: Java Edition.',
      'NO_PROFILE'
    )
  }
  if (!res.ok) {
    throw new AuthError(`Failed to fetch Minecraft profile (${res.status})`, 'PROFILE')
  }

  return (await res.json()) as MinecraftProfile
}

/**
 * Download an image (e.g. a skin texture) and return it as a base64 data URL so
 * the renderer can display it without a remote network request. Returns null on
 * any failure — a missing preview should never block sign-in.
 */
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') ?? 'image/png'
    return `data:${contentType};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}
