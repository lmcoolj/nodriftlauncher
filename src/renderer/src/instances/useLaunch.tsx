import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'

export type RuntimeState =
  | 'idle'
  | 'preparing'
  | 'installing'
  | 'launching'
  | 'running'
  | 'exited'
  | 'error'

export interface InstanceRuntime {
  state: RuntimeState
  phase?: NdInstallPhase
  done: number
  total: number
  logs: string[]
  exitCode?: number | null
  errorMessage?: string
}

interface LaunchContextValue {
  runtimes: Record<string, InstanceRuntime>
  start: (instanceId: string) => Promise<void>
  stop: (instanceId: string) => void
}

const LaunchContext = createContext<LaunchContextValue | null>(null)

export const IDLE_RUNTIME: InstanceRuntime = { state: 'idle', done: 0, total: 0, logs: [] }
const MAX_LOG_LINES = 2000

export function LaunchProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [runtimes, setRuntimes] = useState<Record<string, InstanceRuntime>>({})

  const patch = useCallback((id: string, next: Partial<InstanceRuntime>) => {
    setRuntimes((prev) => {
      const current = prev[id] ?? IDLE_RUNTIME
      return { ...prev, [id]: { ...current, ...next } }
    })
  }, [])

  useEffect(() => {
    const offProgress = window.nodrift.launch.onProgress((p) => {
      patch(p.instanceId, { state: 'installing', phase: p.phase, done: p.done, total: p.total })
    })

    const offState = window.nodrift.launch.onState((s) => {
      if (s.state === 'exited') {
        patch(s.instanceId, { state: 'exited', exitCode: s.code })
      } else if (s.state === 'error') {
        patch(s.instanceId, { state: 'error', errorMessage: s.message })
      } else {
        patch(s.instanceId, { state: s.state })
      }
    })

    const offLog = window.nodrift.launch.onLog((l) => {
      setRuntimes((prev) => {
        const current = prev[l.instanceId] ?? IDLE_RUNTIME
        const lines = current.logs.concat(l.line.split(/\r?\n/).filter(Boolean))
        const trimmed = lines.length > MAX_LOG_LINES ? lines.slice(-MAX_LOG_LINES) : lines
        return { ...prev, [l.instanceId]: { ...current, logs: trimmed } }
      })
    })

    return () => {
      offProgress()
      offState()
      offLog()
    }
  }, [patch])

  const start = useCallback(
    async (instanceId: string) => {
      setRuntimes((prev) => ({
        ...prev,
        [instanceId]: { ...IDLE_RUNTIME, state: 'preparing', logs: [] }
      }))
      const res = await window.nodrift.launch.start(instanceId)
      if (!res.ok) patch(instanceId, { state: 'error', errorMessage: res.error })
    },
    [patch]
  )

  const stop = useCallback((instanceId: string) => {
    void window.nodrift.launch.stop(instanceId)
  }, [])

  const value = useMemo<LaunchContextValue>(
    () => ({ runtimes, start, stop }),
    [runtimes, start, stop]
  )

  return <LaunchContext.Provider value={value}>{children}</LaunchContext.Provider>
}

export function useLaunch(): LaunchContextValue {
  const ctx = useContext(LaunchContext)
  if (!ctx) throw new Error('useLaunch must be used within a LaunchProvider')
  return ctx
}

/** Convenience: the runtime for one instance (never undefined). */
export function useInstanceRuntime(instanceId: string): InstanceRuntime {
  const { runtimes } = useLaunch()
  return runtimes[instanceId] ?? IDLE_RUNTIME
}
