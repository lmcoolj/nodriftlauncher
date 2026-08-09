import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import type { MainTab } from './navigation'

export type Tab = MainTab | 'settings'

interface NavigationValue {
  tab: Tab
  /** When set (and tab is 'home'), the Instance Viewer is shown for this id. */
  instanceId: string | null
  setTab: (tab: Tab) => void
  openInstance: (id: string) => void
  backToHome: () => void
}

const NavigationContext = createContext<NavigationValue | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [tab, setTabState] = useState<Tab>('home')
  const [instanceId, setInstanceId] = useState<string | null>(null)

  const setTab = useCallback((next: Tab) => {
    setTabState(next)
    setInstanceId(null) // leaving Home (or re-selecting it) closes the viewer
  }, [])

  const openInstance = useCallback((id: string) => {
    setTabState('home')
    setInstanceId(id)
  }, [])

  const backToHome = useCallback(() => setInstanceId(null), [])

  const value = useMemo<NavigationValue>(
    () => ({ tab, instanceId, setTab, openInstance, backToHome }),
    [tab, instanceId, setTab, openInstance, backToHome]
  )

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation(): NavigationValue {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useNavigation must be used within a NavigationProvider')
  return ctx
}
