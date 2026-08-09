import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { useInstances } from './useInstances'

const LOADERS: Array<{ value: NdLoader; label: string }> = [
  { value: 'vanilla', label: 'Vanilla' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'forge', label: 'Forge' },
  { value: 'neoforge', label: 'NeoForge' }
]

interface CreateInstanceDialogProps {
  /** Provide an instance to edit; omit to create a new one. */
  instance?: NdInstance
  onClose: () => void
}

export function CreateInstanceDialog({
  instance,
  onClose
}: CreateInstanceDialogProps): React.JSX.Element {
  const { create, update } = useInstances()
  const editing = Boolean(instance)

  const [name, setName] = useState(instance?.name ?? '')
  const [loader, setLoader] = useState<NdLoader>(instance?.loader ?? 'vanilla')
  const [mcVersion, setMcVersion] = useState<string>(instance?.mcVersion ?? '')
  const [loaderVersion, setLoaderVersion] = useState<string | null>(
    instance?.loaderVersion ?? null
  )
  const [showSnapshots, setShowSnapshots] = useState(false)

  const [mcVersions, setMcVersions] = useState<NdMinecraftVersion[]>([])
  const [loaderVersions, setLoaderVersions] = useState<NdLoaderVersion[]>([])
  const [loadingMc, setLoadingMc] = useState(true)
  const [loadingLoader, setLoadingLoader] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // The loader version is auto-chosen; the manual picker stays hidden unless the
  // user explicitly asks to change it. When editing a non-default build, reveal
  // it so the current choice is visible.
  const [showVersionPicker, setShowVersionPicker] = useState(false)

  // Load the Minecraft version list once.
  useEffect(() => {
    let active = true
    window.nodrift.metadata.minecraftVersions().then((res) => {
      if (!active) return
      if (res.ok) {
        setMcVersions(res.versions)
        // Default to latest release when creating.
        if (!mcVersion) {
          const latestRelease = res.versions.find((v) => v.type === 'release')
          if (latestRelease) setMcVersion(latestRelease.id)
        } else {
          // Editing a snapshot/old version: reveal it in the list.
          const current = res.versions.find((v) => v.id === mcVersion)
          if (current && current.type !== 'release') setShowSnapshots(true)
        }
      } else {
        setError(res.error)
      }
      setLoadingMc(false)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // (Re)load loader versions whenever loader or MC version changes.
  useEffect(() => {
    if (loader === 'vanilla' || !mcVersion) {
      setLoaderVersions([])
      setLoaderVersion(null)
      return
    }
    let active = true
    setLoadingLoader(true)
    // Collapse back to the auto choice whenever the loader / MC version changes.
    setShowVersionPicker(false)
    window.nodrift.metadata.loaderVersions(loader, mcVersion).then((res) => {
      if (!active) return
      if (res.ok) {
        setLoaderVersions(res.versions)
        // Auto-choose the recommended build: newest stable, falling back to the
        // newest available. Keep a still-valid existing selection (e.g. editing).
        setLoaderVersion((prev) => {
          if (prev && res.versions.some((v) => v.raw === prev)) return prev
          const stable = res.versions.find((v) => v.stable)
          return (stable ?? res.versions[0])?.raw ?? null
        })
        setError(null)
      } else {
        setLoaderVersions([])
        setError(res.error)
      }
      setLoadingLoader(false)
    })
    return () => {
      active = false
    }
  }, [loader, mcVersion])

  const visibleMcVersions = useMemo(() => {
    const base = showSnapshots
      ? mcVersions
      : mcVersions.filter((v) => v.type === 'release')
    // Always include the currently-selected version even if filtered out.
    if (mcVersion && !base.some((v) => v.id === mcVersion)) {
      const current = mcVersions.find((v) => v.id === mcVersion)
      if (current) return [current, ...base]
    }
    return base
  }, [mcVersions, showSnapshots, mcVersion])

  const needsLoaderVersion = loader !== 'vanilla'
  const noLoaderVersions = needsLoaderVersion && !loadingLoader && loaderVersions.length === 0
  const chosenLoaderVersion = useMemo(
    () => loaderVersions.find((v) => v.raw === loaderVersion) ?? null,
    [loaderVersions, loaderVersion]
  )
  const canSave =
    name.trim().length > 0 &&
    mcVersion.length > 0 &&
    (!needsLoaderVersion || (loaderVersion !== null && loaderVersions.length > 0)) &&
    !saving

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    const input: NdCreateInstanceInput = {
      name: name.trim(),
      mcVersion,
      loader,
      loaderVersion: needsLoaderVersion ? loaderVersion : null
    }
    const result = editing && instance
      ? await update(instance.id, input)
      : await create(input)
    setSaving(false)
    if (result) onClose()
    else setError((prev) => prev ?? 'Failed to save instance.')
  }

  return (
    <Modal
      title={editing ? 'Edit Instance' : 'Create Instance'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            {editing ? 'Save changes' : 'Create instance'}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="field__label" htmlFor="inst-name">
          Name
        </label>
        <input
          id="inst-name"
          className="input"
          type="text"
          value={name}
          placeholder="e.g. Survival"
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="inst-loader">
            Mod loader
          </label>
          <select
            id="inst-loader"
            className="input"
            value={loader}
            onChange={(e) => setLoader(e.target.value as NdLoader)}
          >
            {LOADERS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="inst-mc">
            Minecraft version
          </label>
          <select
            id="inst-mc"
            className="input"
            value={mcVersion}
            disabled={loadingMc}
            onChange={(e) => setMcVersion(e.target.value)}
          >
            {loadingMc && <option>Loading…</option>}
            {visibleMcVersions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id}
                {v.type !== 'release' ? ` (${v.type.replace('old_', '')})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={showSnapshots}
          onChange={(e) => setShowSnapshots(e.target.checked)}
        />
        Show snapshots &amp; old versions
      </label>

      {needsLoaderVersion && loaderVersions.length > 0 && (
        <div className="field">
          <label className="field__label" htmlFor="inst-loader-version">
            Loader version
          </label>
          {showVersionPicker ? (
            <select
              id="inst-loader-version"
              className="input"
              value={loaderVersion ?? ''}
              onChange={(e) => setLoaderVersion(e.target.value)}
            >
              {loaderVersions.map((v) => (
                <option key={v.raw} value={v.raw}>
                  {v.version}
                  {v.stable ? '' : ' (beta)'}
                </option>
              ))}
            </select>
          ) : (
            <div className="auto-value">
              <span className="auto-value__text">
                {chosenLoaderVersion?.version ?? '—'}
                {chosenLoaderVersion && !chosenLoaderVersion.stable ? ' (beta)' : ''}
                <span className="auto-value__tag">auto</span>
              </span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowVersionPicker(true)}
              >
                Change
              </button>
            </div>
          )}
        </div>
      )}

      {needsLoaderVersion && loadingLoader && (
        <p className="field__note">Finding the latest {LOADERS.find((l) => l.value === loader)?.label} build…</p>
      )}

      {noLoaderVersions && (
        <p className="field__note field__note--warn">
          No {LOADERS.find((l) => l.value === loader)?.label} builds are available for
          Minecraft {mcVersion}. Pick another version or loader.
        </p>
      )}

      <p className="field__note">
        The runtime for this version + loader is shared across instances and
        downloaded on first launch.
      </p>

      {error && <p className="field__note field__note--warn">{error}</p>}
    </Modal>
  )
}
