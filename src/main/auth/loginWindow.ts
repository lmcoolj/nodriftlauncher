import { BrowserWindow, session } from 'electron'
import { AUTH_CONFIG } from './config'
import { AuthError } from './types'
import { buildAuthorizeUrl } from './msaClient'

/**
 * Opens a controlled window pointed at the genuine Microsoft login page and
 * resolves with the OAuth authorization code once Microsoft redirects to the
 * desktop redirect URI. Rejects if the user closes the window or Microsoft
 * returns an error.
 *
 * A fresh in-memory session partition is used per attempt so no Microsoft
 * cookies persist to disk and the user can sign in with a different account.
 */
export function promptMicrosoftLogin(parent?: BrowserWindow): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const partitionName = `msa-login-${Date.now()}`
    const authSession = session.fromPartition(partitionName)

    const win = new BrowserWindow({
      width: 520,
      height: 720,
      parent,
      modal: Boolean(parent),
      show: true,
      autoHideMenuBar: true,
      title: 'Sign in to Microsoft',
      backgroundColor: '#ffffff',
      webPreferences: {
        session: authSession,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    let settled = false
    const settle = (action: () => void): void => {
      if (settled) return
      settled = true
      action()
      if (!win.isDestroyed()) win.close()
    }

    const inspect = (url: string): void => {
      if (!url.startsWith(AUTH_CONFIG.redirectUri)) return
      const parsed = new URL(url)
      const code = parsed.searchParams.get('code')
      const error = parsed.searchParams.get('error')
      const errorDescription = parsed.searchParams.get('error_description')
      if (code) {
        settle(() => resolve(code))
      } else if (error) {
        settle(() => reject(new AuthError(errorDescription || error, 'OAUTH')))
      }
    }

    win.webContents.on('will-redirect', (_event, url) => inspect(url))
    win.webContents.on('will-navigate', (_event, url) => inspect(url))

    win.on('closed', () => {
      if (!settled) {
        settled = true
        reject(new AuthError('Sign-in was cancelled.', 'CANCELLED'))
      }
    })

    void win.loadURL(buildAuthorizeUrl())
  })
}
