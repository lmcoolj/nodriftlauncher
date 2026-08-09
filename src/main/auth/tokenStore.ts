import { app, safeStorage } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

/**
 * Persists only the long-lived Microsoft refresh token, encrypted at rest with
 * the OS keystore (DPAPI on Windows) via Electron's safeStorage. Access/Xbox/
 * Minecraft tokens are never written to disk — they are re-derived in memory.
 *
 * If OS encryption is unavailable we deliberately do NOT fall back to plaintext;
 * the session simply won't survive a restart, which is the safe default.
 */
function tokenFile(): string {
  return join(app.getPath('userData'), 'auth.bin')
}

export async function saveRefreshToken(refreshToken: string): Promise<void> {
  if (!refreshToken) {
    console.warn('[auth] no refresh token to persist (empty).')
    return
  }
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[auth] safeStorage unavailable — refresh token not persisted.')
    return
  }
  try {
    const encrypted = safeStorage.encryptString(refreshToken)
    await fs.writeFile(tokenFile(), encrypted)
    console.log('[auth] refresh token saved to', tokenFile())
  } catch (err) {
    console.error('[auth] failed to save refresh token:', err)
  }
}

export async function loadRefreshToken(): Promise<string | null> {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[auth] safeStorage unavailable — cannot restore session.')
      return null
    }
    const buffer = await fs.readFile(tokenFile())
    const token = safeStorage.decryptString(buffer)
    console.log('[auth] loaded stored refresh token from', tokenFile())
    return token
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') console.error('[auth] failed to load refresh token:', err)
    return null
  }
}

export async function clearRefreshToken(): Promise<void> {
  try {
    await fs.unlink(tokenFile())
  } catch {
    // No stored token to clear — fine.
  }
}
