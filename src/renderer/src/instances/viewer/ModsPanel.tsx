import { useCallback, useEffect, useState } from 'react'
import { useNotifications } from '../../useNotifications'

/** Per-instance mod management: enable/disable, import, open folder. */
export function ModsPanel({ instanceId }: { instanceId: string }): React.JSX.Element {
  const { notify } = useNotifications()
  const [mods, setMods] = useState<NdInstanceMod[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await window.nodrift.instanceFs.listMods(instanceId)
    if (res.ok) setMods(res.mods)
    setLoading(false)
  }, [instanceId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const toggle = async (mod: NdInstanceMod): Promise<void> => {
    await window.nodrift.instanceFs.toggleMod(instanceId, mod.actualName)
    await refresh()
  }

  const importMods = async (): Promise<void> => {
    const res = await window.nodrift.instanceFs.importMods(instanceId)
    if (res.ok && res.added > 0) notify(`Imported ${res.added} mod${res.added === 1 ? '' : 's'}`, 'success')
    await refresh()
  }

  return (
    <div className="panel-body">
      <div className="panel-body__toolbar">
        <span className="panel-body__count">{mods.length} mod{mods.length === 1 ? '' : 's'}</span>
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

      {loading ? (
        <p className="mods__hint">Loading…</p>
      ) : mods.length === 0 ? (
        <p className="mods__hint">No mods yet. Use Import Mods, or install from the Mods tab.</p>
      ) : (
        <div className="managed-list">
          {mods.map((mod) => (
            <label
              key={mod.actualName}
              className={'mod-manage-row' + (mod.enabled ? '' : ' mod-manage-row--off')}
            >
              {mod.icon ? (
                <img className="mod-manage-row__icon" src={mod.icon} alt="" />
              ) : (
                <div className="mod-manage-row__icon mod-manage-row__icon--empty" />
              )}
              <div className="mod-manage-row__info">
                <span className="mod-manage-row__name">{mod.name || mod.filename}</span>
                <span className="mod-manage-row__desc">
                  {mod.description || mod.filename}
                </span>
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
