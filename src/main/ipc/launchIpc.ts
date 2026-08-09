import { BrowserWindow, ipcMain } from 'electron'
import { launchService } from '../launch/launchService'

/** Relay a launch-service event to every renderer window. */
function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerLaunchIpc(): void {
  ipcMain.handle('launch:start', async (_event, instanceId: string) => {
    try {
      await launchService.launch(instanceId)
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, error: (err as Error).message }
    }
  })

  ipcMain.handle('launch:stop', (_event, instanceId: string) => {
    launchService.stop(instanceId)
    return { ok: true as const }
  })

  ipcMain.handle('launch:is-running', (_event, instanceId: string) =>
    launchService.isRunning(instanceId)
  )

  launchService.on('progress', (p) => broadcast('launch:progress', p))
  launchService.on('state', (s) => broadcast('launch:state', s))
  launchService.on('log', (l) => broadcast('launch:log', l))
}
