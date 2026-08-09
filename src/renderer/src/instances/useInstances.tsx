import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'

interface InstancesContextValue {
  instances: NdInstance[]
  loading: boolean
  error: string | null
  selectedId: string | null
  selected: NdInstance | null
  select: (id: string | null) => void
  refresh: () => Promise<void>
  create: (input: NdCreateInstanceInput) => Promise<NdInstance | null>
  update: (id: string, patch: NdUpdateInstanceInput) => Promise<NdInstance | null>
  remove: (id: string) => Promise<boolean>
  openFolder: (id: string) => void
  exportInstance: (id: string, format: 'zip' | 'mrpack') => Promise<boolean>
  importPack: () => Promise<NdInstance | null>
}

const InstancesContext = createContext<InstancesContextValue | null>(null)

const SELECTED_KEY = 'nodrift.selectedInstanceId'

export function InstancesProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [instances, setInstances] = useState<NdInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    localStorage.getItem(SELECTED_KEY)
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await window.nodrift.instances.list()
    if (res.ok) {
      setInstances(res.instances)
      setError(null)
    } else {
      setError(res.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const select = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id) localStorage.setItem(SELECTED_KEY, id)
    else localStorage.removeItem(SELECTED_KEY)
  }, [])

  const create = useCallback(
    async (input: NdCreateInstanceInput): Promise<NdInstance | null> => {
      const res = await window.nodrift.instances.create(input)
      if (!res.ok) {
        setError(res.error)
        return null
      }
      await refresh()
      select(res.instance.id)
      return res.instance
    },
    [refresh, select]
  )

  const update = useCallback(
    async (id: string, patch: NdUpdateInstanceInput): Promise<NdInstance | null> => {
      const res = await window.nodrift.instances.update(id, patch)
      if (!res.ok) {
        setError(res.error)
        return null
      }
      await refresh()
      return res.instance
    },
    [refresh]
  )

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await window.nodrift.instances.remove(id)
      if (!res.ok) {
        setError(res.error)
        return false
      }
      if (selectedId === id) select(null)
      await refresh()
      return true
    },
    [refresh, select, selectedId]
  )

  const openFolder = useCallback((id: string) => {
    void window.nodrift.instances.openFolder(id)
  }, [])

  const exportInstance = useCallback(
    async (id: string, format: 'zip' | 'mrpack'): Promise<boolean> => {
      const res = await window.nodrift.instances.export(id, format)
      if (!res.ok) {
        setError(res.error)
        return false
      }
      return res.exported
    },
    []
  )

  const importPack = useCallback(async (): Promise<NdInstance | null> => {
    const res = await window.nodrift.instances.import()
    if (!res.ok) {
      setError(res.error)
      return null
    }
    if (res.instance) {
      await refresh()
      select(res.instance.id)
    }
    return res.instance
  }, [refresh, select])

  const selected = useMemo(
    () => instances.find((i) => i.id === selectedId) ?? null,
    [instances, selectedId]
  )

  const value = useMemo<InstancesContextValue>(
    () => ({
      instances,
      loading,
      error,
      selectedId,
      selected,
      select,
      refresh,
      create,
      update,
      remove,
      openFolder,
      exportInstance,
      importPack
    }),
    [
      instances,
      loading,
      error,
      selectedId,
      selected,
      select,
      refresh,
      create,
      update,
      remove,
      openFolder,
      exportInstance,
      importPack
    ]
  )

  return <InstancesContext.Provider value={value}>{children}</InstancesContext.Provider>
}

export function useInstances(): InstancesContextValue {
  const ctx = useContext(InstancesContext)
  if (!ctx) throw new Error('useInstances must be used within an InstancesProvider')
  return ctx
}
