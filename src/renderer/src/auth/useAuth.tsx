import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'

type Status = 'restoring' | 'signed-out' | 'signing-in' | 'signed-in'

interface AuthContextValue {
  status: Status
  session: NdAuthSession | null
  error: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<NdAuthSession | null>(null)
  const [status, setStatus] = useState<Status>('restoring')
  const [error, setError] = useState<string | null>(null)
  // Guards against a signing-in flow being clobbered by an async event.
  const busy = useRef(false)

  // Attempt silent sign-in on mount and subscribe to session changes from main.
  useEffect(() => {
    let active = true

    window.nodrift.auth
      .restore()
      .then((result) => {
        if (!active) return
        if (result.ok && result.session) {
          setSession(result.session)
          setStatus('signed-in')
        } else {
          setStatus('signed-out')
          if (!result.ok) setError(result.error.message)
        }
      })
      .catch(() => {
        if (active) setStatus('signed-out')
      })

    const unsubscribe = window.nodrift.auth.onChanged((next) => {
      if (busy.current) return
      setSession(next)
      setStatus(next ? 'signed-in' : 'signed-out')
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const login = useCallback(async () => {
    busy.current = true
    setError(null)
    setStatus('signing-in')
    try {
      const result = await window.nodrift.auth.login()
      if (result.ok && result.session) {
        setSession(result.session)
        setStatus('signed-in')
      } else {
        setStatus('signed-out')
        if (!result.ok && result.error.code !== 'CANCELLED') {
          setError(result.error.message)
        }
      }
    } finally {
      busy.current = false
    }
  }, [])

  const logout = useCallback(async () => {
    await window.nodrift.auth.logout()
    setSession(null)
    setStatus('signed-out')
    setError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, error, login, logout }),
    [status, session, error, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
