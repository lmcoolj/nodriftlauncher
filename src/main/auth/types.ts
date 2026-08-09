/** Microsoft OAuth token set from login.live.com. `expiresAt` is epoch ms. */
export interface MsaTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/** An Xbox Live / XSTS token paired with its user hash (uhs). */
export interface XboxAuth {
  token: string
  userHash: string
}

/** Minecraft Services access token. `expiresAt` is epoch ms. */
export interface MinecraftToken {
  accessToken: string
  expiresAt: number
}

export interface MinecraftProfileSkin {
  id: string
  state: string
  url: string
  variant: 'CLASSIC' | 'SLIM'
}

export interface MinecraftProfileCape {
  id: string
  state: string
  url: string
  alias?: string
}

export interface MinecraftProfile {
  id: string
  name: string
  skins: MinecraftProfileSkin[]
  capes: MinecraftProfileCape[]
}

/**
 * The trimmed, token-free view of the signed-in account that is safe to send to
 * the renderer. Skin bytes are embedded as a data URL so the renderer never has
 * to load a remote image (keeps the CSP tight).
 */
export interface AuthSession {
  uuid: string
  username: string
  skin: { url: string; variant: 'CLASSIC' | 'SLIM'; dataUrl: string | null } | null
  capeUrl: string | null
}

/** Error carrying a machine-readable code for the UI to branch on. */
export class AuthError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}
