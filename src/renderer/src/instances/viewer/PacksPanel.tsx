import { useCallback, useEffect, useState } from 'react'
import { useNotifications } from '../../useNotifications'

/** Per-instance resource-pack management: list (with pack.png), import, open folder. */
export function PacksPanel({ instanceId }: { instanceId: string }): React.JSX.Element {
  const { notify } = useNotifications()
  const [packs, setPacks] = useState<NdInstancePack[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await window.nodrift.instanceFs.listPacks(instanceId)
    if (res.ok) setPacks(res.packs)
    setLoading(false)
  }, [instanceId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const importPacks = async (): Promise<void> => {
    const res = await window.nodrift.instanceFs.importPacks(instanceId)
    if (res.ok && res.added > 0) {
      notify(`Imported ${res.added} pack${res.added === 1 ? '' : 's'}`, 'success')
    }
    await refresh()
  }

  return (
    <div className="panel-body">
      <div className="panel-body__toolbar">
        <span className="panel-body__count">{packs.length} pack{packs.length === 1 ? '' : 's'}</span>
        <span className="viewer__spacer" />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => void window.nodrift.instanceFs.open(instanceId, 'resourcepacks')}
        >
          Open Folder
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => void importPacks()}>
          Import Packs
        </button>
      </div>

      {loading ? (
        <p className="mods__hint">Loading…</p>
      ) : packs.length === 0 ? (
        <p className="mods__hint">No resource packs yet.</p>
      ) : (
        <div className="managed-list">
          {packs.map((pack) => (
            <div key={pack.name} className="pack-row">
              {pack.icon ? (
                <img className="pack-row__icon" src={pack.icon} alt="" />
              ) : (
                <div className="pack-row__icon pack-row__icon--empty" />
              )}
              <span className="pack-row__name">{pack.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
