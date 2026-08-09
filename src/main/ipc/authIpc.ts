import { BrowserWindow, ipcMain } from 'electron'
import { authService } from '../auth/authService'
import { AuthError } from '../auth/types'

function serializeError(err: unknown): { message: string; code?: string } {
  if (err instanceof AuthError) return { message: err.message, code: err.code }
  if (err instanceof Error) return { message: err.message }
  return { message: 'Unknown error' }
}

/**
 * IPC surface for authentication. All handlers return a discriminated result
 * ({ ok: true, ... } | { ok: false, error }) so the renderer never has to catch
 * raw IPC rejections for expected failures like a cancelled sign-in.
 */
export function registerAuthIpc(): void {
  ipcMain.handle('auth:get-session', () => authService.getSession())

  ipcMain.handle('auth:restore', async () => {
    try {
      return { ok: true as const, session: await authService.restore() }
    } catch (err) {
      return { ok: false as const, error: serializeError(err) }
    }
  })

  ipcMain.handle('auth:login', async (event) => {
    const parent = BrowserWindow.fromWebContents(event.sender) ?? undefined
    try {
      return { ok: true as const, session: await authService.login(parent) }
    } catch (err) {
      return { ok: false as const, error: serializeError(err) }
    }
  })

  ipcMain.handle('auth:logout', async () => {
    await authService.logout()
    return { ok: true as const }
  })

  // Broadcast session changes to every renderer window.
  authService.on('changed', (session) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('auth:changed', session)
    }
  })
}
