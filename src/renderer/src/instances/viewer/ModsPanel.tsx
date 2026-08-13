import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNotifications } from '../../useNotifications'

/** Per-instance mod management: search, enable/disable, import, open folder. */
export function ModsPanel({ instanceId }: { instanceId: string }): React.JSX.Element {
  const { notify } = useNotifications()
  const [mods, setMods] = useState<NdInstanceMod[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await window.nodrift.instanceFs.listMods(instanceId)
    if (res.ok) setMods(res.mods)
    setLoading(false)
  }, [instanceId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Toggle updates the one row in place (instead of reloading the whole list),
  // so the scroll position is preserved when disabling several mods in a row.
  const toggle = async (mod: NdInstanceMod): Promise<void> => {
    const res = await window.nodrift.instanceFs.toggleMod(instanceId, mod.actualName)
    if (!res.ok) {
      notify(res.error, 'error')
      return
    }
    setMods((prev) =>
      prev.map((m) =>
        m.actualName === mod.actualName
          ? {
              ...m,
              enabled: !m.enabled,
              actualName: m.enabled
                ? `${m.actualName}.disabled`
                : m.actualName.replace(/\.disabled$/i, '')
            }
          : m
      )
    )
  }

  const importMods = async (): Promise<void> => {
    const res = await window.nodrift.instanceFs.importMods(instanceId)
    if (res.ok && res.added > 0) {
      notify(`Imported ${res.added} mod${res.added === 1 ? '' : 's'}`, 'success')
    }
    await refresh()
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
        <button type="button" className="btn btn--primary btn--sm" onClick={() => void importMods()}>
          Import Mods
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
            <label
              key={mod.filename}
              className={'mod-manage-row' + (mod.enabled ? '' : ' mod-manage-row--off')}
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
              <input
                type="checkbox"
                className="mod-manage-row__toggle"
                checked={mod.enabled}
                onChange={() => void toggle(mod)}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
