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
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[auth] safeStorage unavailable — refresh token not persisted.')
    return
  }
  const encrypted = safeStorage.encryptString(refreshToken)
  await fs.writeFile(tokenFile(), encrypted)
}

export async function loadRefreshToken(): Promise<string | null> {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null
    const buffer = await fs.readFile(tokenFile())
    return safeStorage.decryptString(buffer)
  } catch {
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
