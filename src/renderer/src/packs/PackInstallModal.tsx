import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { useInstances } from '../instances/useInstances'
import { useNotifications } from '../useNotifications'

export interface PackHit {
  project_id: string
  title: string
  icon_url: string | null
  description: string
  versions: string[]
}

interface PackInstallModalProps {
  hits: PackHit[]
  projectType: 'resourcepack' | 'shader'
  onClose: () => void
}

const KIND_LABEL: Record<'resourcepack' | 'shader', string> = {
  resourcepack: 'resource pack',
  shader: 'shader'
}

/**
 * Confirm-and-choose-instance dialog for packs. Unlike mods, packs aren't tied to
 * a loader, so any instance (including vanilla) whose Minecraft version the pack
 * supports is a valid target.
 */
export function PackInstallModal({
  hits,
  projectType,
  onClose
}: PackInstallModalProps): React.JSX.Element {
  const { instances } = useInstances()
  const { notify } = useNotifications()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const batch = hits.length > 1
  const kind = KIND_LABEL[projectType]

  const compatible = useMemo(
    () => instances.filter((i) => hits.every((h) => h.versions.includes(i.mcVersion))),
    [instances, hits]
  )

  const [targetId, setTargetId] = useState<string>(compatible[0]?.id ?? '')
  const target = compatible.find((i) => i.id === targetId) ?? compatible[0]

  const install = async (): Promise<void> => {
    if (!target) return
    setError(null)
    for (let i = 0; i < hits.length; i++) {
      setBusy(`Installing ${i + 1}/${hits.length}…`)
      const res = await window.nodrift.packs.install(
        target.id,
        hits[i].project_id,
        projectType,
        hits[i].title
      )
      if (!res.ok) {
        setError(res.error)
        setBusy(null)
        return
      }
    }
    setBusy(null)
    notify(
      batch
        ? `Installed ${hits.length} ${kind}s to ${target.name}`
        : `Installed ${hits[0].title} to ${target.name}`,
      'success'
    )
    onClose()
  }

  const title = batch
    ? `Install ${hits.length} ${kind}s?`
    : `Install ${hits[0].title}?`

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
          None of your instances match {batch ? 'all of these packs' : "this pack's"} Minecraft
          version. Create a compatible instance first.
        </p>
      ) : (
        <>
          <div className="field">
            <label className="field__label" htmlFor="pack-install-target">
              Which instance?
            </label>
            <select
              id="pack-install-target"
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
          {target && <p className="field__note">For Minecraft {target.mcVersion}</p>}
          {projectType === 'shader' && (
            <p className="field__note">
              Shaders need a shader loader in-game (Iris or OptiFine) to take effect.
            </p>
          )}
        </>
      )}

      {error && <p className="field__note field__note--warn">{error}</p>}
    </Modal>
  )
}
