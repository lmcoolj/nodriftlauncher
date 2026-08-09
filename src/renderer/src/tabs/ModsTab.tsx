import { useCallback, useEffect, useState, type FormEvent, type DragEvent } from 'react'
import { useInstances } from '../instances/useInstances'

/**
 * Mods view. Operates on the currently-selected instance (from Home), filtering
 * Modrinth results to that instance's Minecraft version + loader, tracking
 * per-mod install state, and supporting manual .jar install (picker + drag-drop).
 */
export function ModsTab(): React.JSX.Element {
  const { selected } = useInstances()

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<NdModHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  const [installedFiles, setInstalledFiles] = useState<string[]>([])
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState(false)

  const canMod = selected && selected.loader !== 'vanilla'

  const refreshInstalled = useCallback(async () => {
    if (!selected) return
    const res = await window.nodrift.mods.installed(selected.id)
    if (res.ok) {
      setInstalledIds(new Set(Object.keys(res.index)))
      setInstalledFiles(res.files)
    }
  }, [selected])

  const runSearch = useCallback(
    async (q: string) => {
      if (!canMod || !selected) return
      setLoading(true)
      setError(null)
      const res = await window.nodrift.mods.search(q, selected.mcVersion, selected.loader, 0)
      if (res.ok) setHits(res.hits)
      else setError(res.error)
      setLoading(false)
    },
    [canMod, selected]
  )

  // Load installed + a default listing whenever the target instance changes.
  useEffect(() => {
    if (!canMod) {
      setHits([])
      return
    }
    void refreshInstalled()
    void runSearch('')
  }, [canMod, refreshInstalled, runSearch])

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault()
    void runSearch(query)
  }

  const install = async (hit: NdModHit): Promise<void> => {
    if (!selected) return
    setBusyIds((prev) => new Set(prev).add(hit.project_id))
    const res = await window.nodrift.mods.install(
      selected.id,
      hit.project_id,
      hit.title,
      selected.mcVersion,
      selected.loader
    )
    if (!res.ok) setError(res.error)
    await refreshInstalled()
    setBusyIds((prev) => {
      const next = new Set(prev)
      next.delete(hit.project_id)
      return next
    })
  }

  const removeFile = async (filename: string): Promise<void> => {
    if (!selected) return
    await window.nodrift.mods.remove(selected.id, filename)
    await refreshInstalled()
  }

  const pickJars = async (): Promise<void> => {
    if (!selected) return
    const res = await window.nodrift.mods.pickAndInstall(selected.id)
    if (res.ok) await refreshInstalled()
    else setError(res.error)
  }

  const onDrop = async (e: DragEvent): Promise<void> => {
    e.preventDefault()
    setDragging(false)
    if (!selected) return
    const paths = Array.from(e.dataTransfer.files).map((f) => window.nodrift.mods.getFilePath(f))
    const jars = paths.filter((p) => p.toLowerCase().endsWith('.jar'))
    if (jars.length === 0) return
    const res = await window.nodrift.mods.installLocal(selected.id, jars)
    if (res.ok) await refreshInstalled()
    else setError(res.error)
  }

  if (!selected) {
    return (
      <div className="placeholder">
        <div className="placeholder__badge">Mods</div>
        <h1 className="placeholder__title">Mods</h1>
        <p className="placeholder__text">Select an instance on the Home tab to manage its mods.</p>
      </div>
    )
  }

  if (!canMod) {
    return (
      <div className="placeholder">
        <div className="placeholder__badge">Mods</div>
        <h1 className="placeholder__title">Mods</h1>
        <p className="placeholder__text">
          <strong>{selected.name}</strong> is a Vanilla instance, which can&apos;t load mods. Edit it
          to use Fabric, Forge or NeoForge.
        </p>
      </div>
    )
  }

  return (
    <div
      className={'mods' + (dragging ? ' mods--dragging' : '')}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => void onDrop(e)}
    >
      <div className="mods__header">
        <div>
          <h1 className="mods__title">Mods</h1>
          <p className="mods__context">
            {selected.name} · {selected.mcVersion} · {selected.loader}
          </p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void pickJars()}>
          + Add .jar
        </button>
      </div>

      <form className="mods__search" onSubmit={onSubmit}>
        <input
          className="input"
          type="text"
          placeholder="Search Modrinth…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn btn--primary btn--sm">
          Search
        </button>
      </form>

      {error && <p className="mods__error">{error}</p>}
      {installedFiles.length > 0 && (
        <div className="mods__installed">
          <span className="mods__installed-label">Installed ({installedFiles.length})</span>
          <div className="mods__chips">
            {installedFiles.map((f) => (
              <span key={f} className="mod-chip" title={f}>
                {f}
                <button
                  type="button"
                  className="mod-chip__remove"
                  aria-label={`Remove ${f}`}
                  onClick={() => void removeFile(f)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="mods__hint">Searching…</p>
      ) : hits.length === 0 ? (
        <p className="mods__hint">No results.</p>
      ) : (
        <div className="mod-list">
          {hits.map((hit) => {
            const isInstalled = installedIds.has(hit.project_id)
            const isBusy = busyIds.has(hit.project_id)
            return (
              <div key={hit.project_id} className="mod-row">
                {hit.icon_url ? (
                  <img className="mod-row__icon" src={hit.icon_url} alt="" />
                ) : (
                  <div className="mod-row__icon mod-row__icon--empty" />
                )}
                <div className="mod-row__info">
                  <div className="mod-row__title">
                    {hit.title}
                    <span className="mod-row__author">by {hit.author}</span>
                  </div>
                  <p className="mod-row__desc">{hit.description}</p>
                </div>
                <button
                  type="button"
                  className={'btn btn--sm ' + (isInstalled ? 'btn--ghost' : 'btn--primary')}
                  disabled={isInstalled || isBusy}
                  onClick={() => void install(hit)}
                >
                  {isInstalled ? 'Installed' : isBusy ? 'Installing…' : 'Install'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
