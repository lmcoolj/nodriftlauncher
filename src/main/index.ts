import { app, shell, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { createMainWindow, registerWindowControls } from './platform/window'
import { registerAuthIpc } from './ipc/authIpc'
import { registerMetadataIpc } from './ipc/metadataIpc'
import { registerInstanceIpc } from './ipc/instanceIpc'
import { registerLaunchIpc } from './ipc/launchIpc'
import { registerModsIpc } from './ipc/modsIpc'
import { registerSkinsIpc } from './ipc/skinsIpc'
import { registerInstanceFsIpc } from './ipc/instanceFsIpc'
import { registerUpdateIpc } from './ipc/updateIpc'
import { initDiscordPresence, stopDiscordPresence } from './discord/presence'

function createWindow(): void {
  const mainWindow = createMainWindow()

  // Only reveal the window once the first paint is ready to avoid a white flash.
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Open any target=_blank / external links in the user's real browser, never in-app.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // In dev, electron-vite injects the renderer dev-server URL for HMR.
  // In production we load the built HTML file from disk.
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    mainWindow.loadURL(devUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Lock down a strict Content-Security-Policy for the packaged app. We skip this
  // in dev because Vite's HMR needs an inline/websocket channel to localhost.
  if (app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            // Allow https images so Modrinth mod icons load; everything else stays local.
            "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'"
          ]
        }
      })
    })
  }

  registerWindowControls()
  registerAuthIpc()
  registerMetadataIpc()
  registerInstanceIpc()
  registerLaunchIpc()
  registerModsIpc()
  registerSkinsIpc()
  registerInstanceFsIpc()
  registerUpdateIpc()
  initDiscordPresence()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  stopDiscordPresence()
})

app.on('window-all-closed', () => {
  // On Windows/Linux, closing all windows quits the app. macOS convention differs
  // and is handled here so the platform behaviour stays centralised.
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
