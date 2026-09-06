import { useEffect, useState } from 'react'
import { Modal } from '../../components/Modal'
import { useNotifications } from '../../useNotifications'

interface SwitchVersionModalProps {
  instanceId: string
  projectId: string
  modName: string
  onClose: () => void
  onSwitched: () => void
}

/** Pick a different Modrinth version for an installed mod and swap the jar. */
export function SwitchVersionModal({
  instanceId,
  projectId,
  modName,
  onClose,
  onSwitched
}: SwitchVersionModalProps): React.JSX.Element {
  const { notify } = useNotifications()
  const [versions, setVersions] = useState<Array<{ versionId: string; versionNumber: string }>>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    window.nodrift.mods.modVersions(instanceId, projectId).then((res) => {
      if (!active) return
      if (res.ok) {
        setVersions(res.versions)
        setSelected(res.versions[0]?.versionId ?? '')
      } else setError(res.error)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [instanceId, projectId])

  const doSwitch = async (): Promise<void> => {
    if (!selected) return
    setBusy(true)
    setError(null)
    const res = await window.nodrift.mods.switchVersion(instanceId, projectId, selected)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    notify(`Switched ${modName}`, 'success')
    onSwitched()
    onClose()
  }

  return (
    <Modal
      title={`Switch version — ${modName}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || loading || !selected}
            onClick={() => void doSwitch()}
          >
            {busy ? 'Switching…' : 'Switch'}
          </button>
        </>
      }
    >
      {loading ? (
        <p className="field__note">Loading versions…</p>
      ) : versions.length === 0 ? (
        <p className="field__note field__note--warn">
          No versions of this mod match this instance&apos;s Minecraft version and loader.
        </p>
      ) : (
        <div className="field">
          <label className="field__label" htmlFor="switch-version">
            Version
          </label>
          <select
            id="switch-version"
            className="input"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {versions.map((v) => (
              <option key={v.versionId} value={v.versionId}>
                {v.versionNumber}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && <p className="field__note field__note--warn">{error}</p>}
    </Modal>
  )
}
