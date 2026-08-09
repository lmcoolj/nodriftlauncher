import { EventEmitter } from 'node:events'
import type { BrowserWindow } from 'electron'
import { exchangeCodeForTokens, refreshTokens } from './msaClient'
import { authenticateXbox, authorizeXsts } from './xboxAuth'
import { fetchImageAsDataUrl, fetchProfile, loginWithXbox } from './minecraftAuth'
import { promptMicrosoftLogin } from './loginWindow'
import { clearRefreshToken, loadRefreshToken, saveRefreshToken } from './tokenStore'
import { AuthError } from './types'
import type { AuthSession, MinecraftProfile, MinecraftToken, MsaTokens } from './types'

interface CachedSession {
  msa: MsaTokens
  mc: MinecraftToken
  profile: MinecraftProfile
  session: AuthSession
  xuid: string
}

/** Everything the launcher needs to pass to the game, or null if signed out. */
export interface LaunchCredentials {
  name: string
  uuid: string
  accessToken: string
  xuid: string
}

/**
 * Orchestrates the full auth chain, keeps the live session in memory, and emits
 * a `changed` event whenever the signed-in account changes so the IPC layer can
 * push updates to the renderer.
 */
class AuthService extends EventEmitter {
  private current: CachedSession | null = null

  getSession(): AuthSession | null {
    return this.current?.session ?? null
  }

  /** The current Minecraft access token, or null when signed out. */
  getMinecraftToken(): string | null {
    return this.current?.mc.accessToken ?? null
  }

  /** Re-fetch the profile (e.g. after a skin change) and broadcast the update. */
  async refreshProfile(): Promise<void> {
    if (!this.current) return
    const profile = await fetchProfile(this.current.mc.accessToken)
    const session = await this.toSession(profile)
    this.current = { ...this.current, profile, session }
    this.emit('changed', session)
  }

  /** Launch credentials from the live session, or null when signed out. */
  getLaunchCredentials(): LaunchCredentials | null {
    if (!this.current) return null
    return {
      name: this.current.profile.name,
      uuid: this.current.profile.id,
      accessToken: this.current.mc.accessToken,
      xuid: this.current.xuid
    }
  }

  /** Interactive sign-in via the Microsoft login window. */
  async login(parent?: BrowserWindow): Promise<AuthSession> {
    const code = await promptMicrosoftLogin(parent)
    const msa = await exchangeCodeForTokens(code)
    const cached = await this.runChain(msa)
    return cached.session
  }

  /**
   * Silent sign-in from a stored refresh token. Returns null (and clears the
   * stored token) if no valid token is available.
   */
  async restore(): Promise<AuthSession | null> {
    const refreshToken = await loadRefreshToken()
    if (!refreshToken) return null
    try {
      const msa = await refreshTokens(refreshToken)
      const cached = await this.runChain(msa)
      return cached.session
    } catch (err) {
      this.current = null
      // Only discard the stored token when Microsoft actually rejected it.
      // Transient/network errors keep it so a later launch can retry.
      if (err instanceof AuthError && err.code === 'MSA_TOKEN') {
        await clearRefreshToken()
      }
      console.error('[auth] restore failed:', err instanceof Error ? err.message : err)
      return null
    }
  }

  async logout(): Promise<void> {
    this.current = null
    await clearRefreshToken()
    this.emit('changed', null)
  }

  /** Runs MSA tokens through Xbox → XSTS → Minecraft → profile. */
  private async runChain(msa: MsaTokens): Promise<CachedSession> {
    const xbl = await authenticateXbox(msa.accessToken)
    const xsts = await authorizeXsts(xbl.token)
    const mc = await loginWithXbox(xsts.userHash, xsts.token)
    const profile = await fetchProfile(mc.accessToken)
    const session = await this.toSession(profile)

    const cached: CachedSession = { msa, mc, profile, session, xuid: xsts.xuid }
    this.current = cached
    await saveRefreshToken(msa.refreshToken)
    this.emit('changed', session)
    return cached
  }

  /** Build the token-free, renderer-safe session (with embedded skin preview). */
  private async toSession(profile: MinecraftProfile): Promise<AuthSession> {
    const activeSkin =
      profile.skins.find((s) => s.state === 'ACTIVE') ?? profile.skins[0] ?? null
    const activeCape = profile.capes.find((c) => c.state === 'ACTIVE') ?? null
    const dataUrl = activeSkin ? await fetchImageAsDataUrl(activeSkin.url) : null

    return {
      uuid: profile.id,
      username: profile.name,
      skin: activeSkin
        ? { url: activeSkin.url, variant: activeSkin.variant, dataUrl }
        : null,
      capeUrl: activeCape?.url ?? null
    }
  }
}

export const authService = new AuthService()
