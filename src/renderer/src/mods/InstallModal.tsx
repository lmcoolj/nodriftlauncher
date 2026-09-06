import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { useInstances } from '../instances/useInstances'
import { useNotifications } from '../useNotifications'

const LOADER_LABELS: Record<NdLoader, string> = {
  vanilla: 'Vanilla',
  fabric: 'Fabric',
  forge: 'Forge',
  neoforge: 'NeoForge'
}

export interface InstallHit {
  project_id: string
  title: string
  icon_url: string | null
  description: string
  categories: string[]
  versions: string[]
}

interface InstallModalProps {
  hits: InstallHit[]
  onClose: () => void
  /** Called after a successful install (e.g. to clear a multi-select). */
  onInstalled?: () => void
}

/**
 * Confirm-and-choose-instance dialog. Handles one or many mods, shows the
 * required dependencies that will be auto-installed (for a single mod), and only
 * offers instances compatible with every selected mod.
 */
export function InstallModal({ hits, onClose, onInstalled }: InstallModalProps): React.JSX.Element {
  const { instances } = useInstances()
  const { notify } = useNotifications()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deps, setDeps] = useState<Array<{ projectId: string; title: string }>>([])

  const batch = hits.length > 1

  // Instances compatible with EVERY selected mod (loader + version supported).
  const compatible = useMemo(
    () =>
      instances.filter(
        (i) =>
          i.loader !== 'vanilla' &&
          hits.every((h) => h.categories.includes(i.loader) && h.versions.includes(i.mcVersion))
      ),
    [instances, hits]
  )

  const [targetId, setTargetId] = useState<string>(compatible[0]?.id ?? '')
  const target = compatible.find((i) => i.id === targetId) ?? compatible[0]

  // Resolve dependencies for a single-mod install (shown + auto-installed).
  useEffect(() => {
    if (batch || !target) {
      setDeps([])
      return
    }
    let active = true
    window.nodrift.mods.resolveDeps(target.id, hits[0].project_id).then((res) => {
      if (active && res.ok) setDeps(res.deps)
    })
    return () => {
      active = false
    }
  }, [batch, target, hits])

  const install = async (): Promise<void> => {
    if (!target) return
    setError(null)
    for (let i = 0; i < hits.length; i++) {
      setBusy(`Installing ${i + 1}/${hits.length}…`)
      const res = await window.nodrift.mods.install(target.id, hits[i].project_id, hits[i].title)
      if (!res.ok) {
        setError(res.error)
        setBusy(null)
        return
      }
    }
    setBusy(null)
    notify(
      batch ? `Installed ${hits.length} mods to ${target.name}` : `Installed ${hits[0].title} to ${target.name}`,
      'success'
    )
    onInstalled?.()
    onClose()
  }

  const title = batch ? `Install ${hits.length} mods?` : `Install ${hits[0].title}?`

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Wait, nevermind
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!target || busy !== null}
            onClick={() => void install()}
          >
            {busy ?? 'Yes, install'}
          </button>
        </>
      }
    >
      {batch ? (
        <ul className="install-modal__list">
          {hits.map((h) => (
            <li key={h.project_id}>{h.title}</li>
          ))}
        </ul>
      ) : (
        <div className="install-modal__mod">
          {hits[0].icon_url ? (
            <img className="install-modal__icon" src={hits[0].icon_url} alt="" />
          ) : (
            <div className="install-modal__icon install-modal__icon--empty" />
          )}
          <div>
            <div className="install-modal__title">{hits[0].title}</div>
            <p className="install-modal__desc">{hits[0].description}</p>
          </div>
        </div>
      )}

      {compatible.length === 0 ? (
        <p className="field__note field__note--warn">
          None of your instances match {batch ? 'all of these mods' : "this mod's"} loader and
          version. Create a compatible instance first.
        </p>
      ) : (
        <>
          <div className="field">
            <label className="field__label" htmlFor="install-target">
              Which instance?
            </label>
            <select
              id="install-target"
              className="input"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {compatible.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          {target && (
            <p className="field__note">
              For Minecraft {target.mcVersion} · {LOADER_LABELS[target.loader]}
              {target.loaderVersion ? ` ${target.loaderVersion}` : ''}
            </p>
          )}
          {deps.length > 0 && (
            <p className="field__note">
              Also installs {deps.length} dependenc{deps.length === 1 ? 'y' : 'ies'}:{' '}
              {deps.map((d) => d.title).join(', ')}
            </p>
          )}
        </>
      )}

      {error && <p className="field__note field__note--warn">{error}</p>}
    </Modal>
  )
}
