import { createConnection, type Socket } from 'node:net'
import { randomUUID } from 'node:crypto'

const OP_HANDSHAKE = 0
const OP_FRAME = 1
const OP_CLOSE = 2

export interface Activity {
  details?: string
  state?: string
  startTimestamp?: number
  largeImageKey?: string
  largeImageText?: string
  smallImageKey?: string
  smallImageText?: string
}

/** Discord IPC socket path (tries pipes 0-9; Windows named pipe / unix socket). */
function ipcPath(id: number): string {
  if (process.platform === 'win32') return `\\\\?\\pipe\\discord-ipc-${id}`
  const base =
    process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || process.env.TMP || '/tmp'
  return `${base.replace(/\/$/, '')}/discord-ipc-${id}`
}

function encode(op: number, data: unknown): Buffer {
  const json = Buffer.from(JSON.stringify(data), 'utf8')
  const header = Buffer.alloc(8)
  header.writeInt32LE(op, 0)
  header.writeInt32LE(json.length, 4)
  return Buffer.concat([header, json])
}

/**
 * Minimal Discord Rich Presence client speaking the IPC named-pipe protocol
 * directly — no third-party dependency. Silently no-ops when Discord is closed
 * and retries, so presence appears if Discord is opened later.
 */
export class DiscordPresence {
  private socket: Socket | null = null
  private connected = false
  private current: Activity | null = null
  private retry: NodeJS.Timeout | null = null
  private stopped = false

  constructor(private readonly clientId: string) {}

  start(): void {
    if (!this.clientId) return
    this.stopped = false
    this.tryConnect(0)
  }

  private tryConnect(id: number): void {
    if (this.stopped || this.connected) return
    if (id > 9) {
      this.scheduleRetry()
      return
    }

    const socket = createConnection(ipcPath(id))
    let buffer = Buffer.alloc(0)

    socket.on('connect', () => {
      this.socket = socket
      socket.write(encode(OP_HANDSHAKE, { v: 1, client_id: this.clientId }))
    })

    socket.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk])
      while (buffer.length >= 8) {
        const len = buffer.readInt32LE(4)
        if (buffer.length < 8 + len) break
        const payload = buffer.subarray(8, 8 + len)
        buffer = buffer.subarray(8 + len)
        try {
          const msg = JSON.parse(payload.toString('utf8')) as { cmd?: string; evt?: string }
          if (msg.cmd === 'DISPATCH' && msg.evt === 'READY') {
            this.connected = true
            if (this.current) this.send(this.current)
          }
        } catch {
          // ignore malformed frame
        }
      }
    })

    socket.on('error', () => {
      socket.destroy()
      if (!this.connected && !this.stopped) this.tryConnect(id + 1)
    })

    socket.on('close', () => {
      this.socket = null
      const wasConnected = this.connected
      this.connected = false
      if (!this.stopped && wasConnected) this.scheduleRetry()
    })
  }

  private scheduleRetry(): void {
    if (this.retry || this.stopped) return
    this.retry = setTimeout(() => {
      this.retry = null
      this.tryConnect(0)
    }, 15000)
  }

  setActivity(activity: Activity | null): void {
    this.current = activity
    if (this.connected) this.send(activity)
  }

  private send(activity: Activity | null): void {
    if (!this.socket) return
    const args = activity
      ? {
          pid: process.pid,
          activity: {
            details: activity.details,
            state: activity.state,
            timestamps: activity.startTimestamp ? { start: activity.startTimestamp } : undefined,
            assets: {
              large_image: activity.largeImageKey,
              large_text: activity.largeImageText,
              small_image: activity.smallImageKey,
              small_text: activity.smallImageText
            }
          }
        }
      : { pid: process.pid, activity: null }
    try {
      this.socket.write(encode(OP_FRAME, { cmd: 'SET_ACTIVITY', args, nonce: randomUUID() }))
    } catch {
      // socket went away — the close handler will reconnect
    }
  }

  stop(): void {
    this.stopped = true
    if (this.retry) {
      clearTimeout(this.retry)
      this.retry = null
    }
    if (this.socket) {
      try {
        this.socket.write(encode(OP_CLOSE, {}))
      } catch {
        // ignore
      }
      this.socket.destroy()
      this.socket = null
    }
    this.connected = false
  }
}
