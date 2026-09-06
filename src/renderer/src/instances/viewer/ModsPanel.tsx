import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNotifications } from '../../useNotifications'
import { useNavigation } from '../../useNavigation'

function TrashIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
    </svg>
  )
}

/** Per-instance mod management: search, enable/disable, delete, import. */
export function ModsPanel({ instanceId }: { instanceId: string }): React.JSX.Element {
  const { notify } = useNotifications()
  const { setTab } = useNavigation()
  const [mods, setMods] = useState<NdInstanceMod[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  // `silent` re-reads without blanking the list, so scroll position survives a
  // toggle/delete (and state always mirrors disk — no stale optimistic dupes).
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      const res = await window.nodrift.instanceFs.listMods(instanceId)
      if (res.ok) setMods(res.mods)
      else notify(res.error, 'error')
      if (!silent) setLoading(false)
    },
    [instanceId, notify]
  )

  useEffect(() => {
    void load()
  }, [load])

  const toggle = async (mod: NdInstanceMod): Promise<void> => {
    const res = await window.nodrift.instanceFs.toggleMod(instanceId, mod.actualName)
    if (!res.ok) {
      notify(res.error, 'error')
      return
    }
    await load(true)
  }

  const remove = async (mod: NdInstanceMod): Promise<void> => {
    const label = mod.name || mod.filename
    if (!window.confirm(`Delete "${label}"? This removes the jar from this instance.`)) return
    const res = await window.nodrift.instanceFs.deleteMod(instanceId, mod.actualName)
    if (!res.ok) {
      notify(res.error, 'error')
      return
    }
    notify(`Deleted ${label}`, 'success')
    await load(true)
  }

  const importMods = async (): Promise<void> => {
    const res = await window.nodrift.instanceFs.importMods(instanceId)
    if (res.ok && res.added > 0) {
      notify(`Imported ${res.added} mod${res.added === 1 ? '' : 's'}`, 'success')
    }
    await load(true)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return mods
    return mods.filter(
      (m) =>
        (m.name || m.filename).toLowerCase().includes(q) ||
        m.filename.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    )
  }, [mods, query])

  return (
    <div className="panel-body">
      <div className="panel-body__toolbar">
        <span className="panel-body__count">
          {query.trim() ? `${filtered.length} of ${mods.length}` : mods.length} mod
          {mods.length === 1 ? '' : 's'}
        </span>
        <span className="viewer__spacer" />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => void window.nodrift.instanceFs.open(instanceId, 'mods')}
        >
          Open Folder
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void importMods()}>
          Import Jar
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setTab('mods')}>
          Install Mods
        </button>
      </div>

      {mods.length > 0 && (
        <input
          className="input panel-body__search"
          type="text"
          placeholder="Search installed mods…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {loading ? (
        <p className="mods__hint">Loading…</p>
      ) : mods.length === 0 ? (
        <p className="mods__hint">No mods yet. Use Import Mods, or install from the Mods tab.</p>
      ) : filtered.length === 0 ? (
        <p className="mods__hint">No installed mods match “{query.trim()}”.</p>
      ) : (
        <div className="managed-list">
          {filtered.map((mod) => (
            <div
              key={mod.actualName}
              className={'mod-manage-row' + (mod.enabled ? '' : ' mod-manage-row--off')}
              title={`${mod.filename}${mod.version ? ` · v${mod.version}` : ''}`}
            >
              {mod.icon ? (
                <img className="mod-manage-row__icon" src={mod.icon} alt="" />
              ) : (
                <div className="mod-manage-row__icon mod-manage-row__icon--empty" />
              )}
              <div className="mod-manage-row__info">
                <span className="mod-manage-row__name">{mod.name || mod.filename}</span>
                <span className="mod-manage-row__desc">{mod.description || mod.filename}</span>
              </div>
              {mod.version ? <span className="mod-manage-row__ver">v{mod.version}</span> : null}
              <button
                type="button"
                className="btn btn--ghost btn--sm mod-manage-row__del"
                title="Delete mod"
                aria-label={`Delete ${mod.name || mod.filename}`}
                onClick={() => void remove(mod)}
              >
                <TrashIcon />
              </button>
              <input
                type="checkbox"
                className="mod-manage-row__toggle"
                checked={mod.enabled}
                aria-label={`${mod.enabled ? 'Disable' : 'Enable'} ${mod.name || mod.filename}`}
                onChange={() => void toggle(mod)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
