import { useCallback, useEffect, useState } from 'react'
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

/** Per-instance resource-pack management: list (with pack.png), import, delete. */
export function PacksPanel({ instanceId }: { instanceId: string }): React.JSX.Element {
  const { notify } = useNotifications()
  const { setTab } = useNavigation()
  const [packs, setPacks] = useState<NdInstancePack[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      const res = await window.nodrift.instanceFs.listPacks(instanceId)
      if (res.ok) setPacks(res.packs)
      else notify(res.error, 'error')
      if (!silent) setLoading(false)
    },
    [instanceId, notify]
  )

  useEffect(() => {
    void load()
  }, [load])

  const importPacks = async (): Promise<void> => {
    const res = await window.nodrift.instanceFs.importPacks(instanceId)
    if (res.ok && res.added > 0) {
      notify(`Imported ${res.added} pack${res.added === 1 ? '' : 's'}`, 'success')
    }
    await load(true)
  }

  const remove = async (pack: NdInstancePack): Promise<void> => {
    if (!window.confirm(`Delete "${pack.name}" from this instance?`)) return
    const res = await window.nodrift.instanceFs.deletePack(instanceId, pack.name)
    if (!res.ok) {
      notify(res.error, 'error')
      return
    }
    notify(`Deleted ${pack.name}`, 'success')
    await load(true)
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
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void importPacks()}>
          Import Zip
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setTab('packs')}>
          Download Packs
        </button>
      </div>

      {loading ? (
        <p className="mods__hint">Loading…</p>
      ) : packs.length === 0 ? (
        <p className="mods__hint">No resource packs yet. Import a .zip, or use Download Packs.</p>
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
              <span className="viewer__spacer" />
              <button
                type="button"
                className="btn btn--ghost btn--sm pack-row__del"
                title="Delete pack"
                aria-label={`Delete ${pack.name}`}
                onClick={() => void remove(pack)}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
