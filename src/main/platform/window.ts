import { app, BrowserWindow, ipcMain } from 'electron'
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { join } from 'path'

/** App icon: assets/logo.png in dev, bundled beside resources when packaged. */
function iconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'logo.png')
    : join(app.getAppPath(), 'assets', 'logo.png')
}

/**
 * Platform layer for window creation and native window controls.
 *
 * All OS-conditional window behaviour lives here so the renderer and the rest of
 * the app stay platform-agnostic. When Linux/macOS support is added, this is the
 * primary file that needs per-platform branches — nothing in the UI should need
 * to know which OS it is running on.
 */

const isWin = process.platform === 'win32'

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 940,
    minHeight: 600,
    show: false,
    // Frameless: we draw our own title bar and window controls.
    frame: false,
    resizable: true,
    // No rounded corners (per design). roundedCorners only affects macOS; on
    // Windows the frameless window is already square.
    roundedCorners: false,
    // thickFrame keeps the native resize border on Windows so the window can be
    // resized from its edges/corners even though the frame is hidden.
    ...(isWin ? { thickFrame: true } : {}),
    icon: iconPath(),
    backgroundColor: '#0e0f13',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  return win
}

function windowFromEvent(
  event: IpcMainEvent | IpcMainInvokeEvent
): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

/**
 * Wire the IPC channels the custom title bar uses to drive the native window.
 * Call once, after the app is ready.
 */
export function registerWindowControls(): void {
  ipcMain.on('window:minimize', (event) => {
    windowFromEvent(event)?.minimize()
  })

  ipcMain.on('window:close', (event) => {
    windowFromEvent(event)?.close()
  })

  ipcMain.on('window:toggle-maximize', (event) => {
    const win = windowFromEvent(event)
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.handle('window:is-maximized', (event) => {
    return windowFromEvent(event)?.isMaximized() ?? false
  })
}
