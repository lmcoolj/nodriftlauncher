import { app, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

/** Update lifecycle, mirrored to the renderer so the top-bar button can react. */
export type UpdateStatus =
  | { state: 'dev' }
  | { state: 'none' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }

function broadcast(status: UpdateStatus): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('update:status', status)
  }
}

let wired = false
function wire(): void {
  if (wired) return
  wired = true
  // User-driven: check + download only when asked, but install any downloaded
  // update on the next quit as a fallback.
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) =>
    broadcast({ state: 'available', version: info.version })
  )
  autoUpdater.on('update-not-available', () => broadcast({ state: 'none' }))
  autoUpdater.on('download-progress', (p) =>
    broadcast({ state: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info) =>
    broadcast({ state: 'downloaded', version: info.version })
  )
  autoUpdater.on('error', (err) => broadcast({ state: 'error', message: err.message }))
}

/** Check GitHub releases for a newer version. No-op in dev (no update feed). */
export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) return { state: 'dev' }
  wire()
  try {
    const result = await autoUpdater.checkForUpdates()
    const latest = result?.updateInfo?.version
    if (latest && latest !== app.getVersion()) {
      return { state: 'available', version: latest }
    }
    return { state: 'none' }
  } catch (err) {
    return { state: 'error', message: (err as Error).message }
  }
}

export async function downloadUpdate(): Promise<void> {
  if (!app.isPackaged) return
  wire()
  await autoUpdater.downloadUpdate()
}

export function quitAndInstall(): void {
  if (!app.isPackaged) return
  autoUpdater.quitAndInstall()
}
