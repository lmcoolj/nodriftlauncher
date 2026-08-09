import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'

export type NotificationKind = 'info' | 'success' | 'error'

interface Notification {
  id: number
  message: string
  kind: NotificationKind
}

interface NotificationsValue {
  notify: (message: string, kind?: NotificationKind) => void
}

const NotificationsContext = createContext<NotificationsValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [items, setItems] = useState<Notification[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, kind: NotificationKind = 'info') => {
      const id = nextId.current++
      setItems((prev) => [...prev, { id, message, kind }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss]
  )

  const value = useMemo<NotificationsValue>(() => ({ notify }), [notify])

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div className="toasts">
        {items.map((n) => (
          <div key={n.id} className={`toast toast--${n.kind}`} onClick={() => dismiss(n.id)}>
            {n.message}
          </div>
        ))}
      </div>
    </NotificationsContext.Provider>
  )
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider')
  return ctx
}
