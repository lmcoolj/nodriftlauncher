import { useCallback, useEffect, useState } from 'react'
import { InstallModal, type InstallHit } from '../mods/InstallModal'
import { ModDetail } from '../mods/ModDetail'
import { useInstances } from '../instances/useInstances'

type Environment = 'all' | 'client' | 'server' | 'both'

const ENVIRONMENTS: Array<{ id: Environment; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'client', label: 'Client-Side Only' },
  { id: 'server', label: 'Server-Side Only' },
  { id: 'both', label: 'Both-Sides' }
]

const LOADERS = [
  { id: 'fabric', label: 'Fabric' },
  { id: 'forge', label: 'Forge' },
  { id: 'neoforge', label: 'NeoForge' }
]

const CATEGORIES = [
  { id: 'optimization', label: 'Performance' },
  { id: 'utility', label: 'Utility' },
  { id: 'decoration', label: 'Decoration' },
  { id: 'library', label: 'Library' },
  { id: 'management', label: 'Management' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'magic', label: 'Magic' },
  { id: 'technology', label: 'Technology' },
  { id: 'storage', label: 'Storage' },
  { id: 'food', label: 'Food' }
]

/** Modrinth mod browser: instant search, filters (incl. per-instance), multi-select, details. */
export function ModsTab(): React.JSX.Element {
  const { instances } = useInstances()

  const [query, setQuery] = useState('')
  const [environment, setEnvironment] = useState<Environment>('all')
  const [mcVersion, setMcVersion] = useState('')
  const [loaders, setLoaders] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [filterInstanceId, setFilterInstanceId] = useState('')

  const [hits, setHits] = useState<NdModHit[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, NdModHit>>({})
  const [installHits, setInstallHits] = useState<InstallHit[] | null>(null)

  const filterInstance = instances.find((i) => i.id === filterInstanceId) ?? null
  const lockedToInstance = Boolean(filterInstance)

  const toggle = (list: string[], set: (v: string[]) => void, id: string): void => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  const toggleSelect = (hit: NdModHit): void => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[hit.project_id]) delete next[hit.project_id]
      else next[hit.project_id] = hit
      return next
    })
  }

  const PAGE = 30

  // Build the search options for a given offset (page). When an instance is
  // chosen, its version + loader drive the query (only mods that work for it).
  const buildOptions = useCallback(
    (offset: number): NdModSearchOptions => {
      const effectiveMc = filterInstance ? filterInstance.mcVersion : mcVersion.trim() || undefined
      const effectiveLoaders = filterInstance
        ? [filterInstance.loader]
        : loaders.length
          ? loaders
          : undefined
      return {
        query,
        mcVersion: effectiveMc,
        loaders: effectiveLoaders,
        categories: categories.length ? categories : undefined,
        environment: environment === 'all' ? null : environment,
        offset
      }
    },
    [query, mcVersion, loaders, categories, environment, filterInstance]
  )

  // Instant search, debounced — always fetches page 0.
  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true)
      setError(null)
      window.nodrift.mods.search(buildOptions(0)).then((res) => {
        if (res.ok) {
          setHits(res.hits)
          setHasMore(res.hits.length === PAGE)
        } else setError(res.error)
        setLoading(false)
      })
    }, 300)
    return () => clearTimeout(handle)
  }, [buildOptions])

  const loadMore = (): void => {
    setLoadingMore(true)
    window.nodrift.mods.search(buildOptions(hits.length)).then((res) => {
      if (res.ok) {
        setHits((prev) => [...prev, ...res.hits])
        setHasMore(res.hits.length === PAGE)
      } else setError(res.error)
      setLoadingMore(false)
    })
  }

  const selectedList = Object.values(selected)

  if (detailId) {
    return (
      <>
        <ModDetail
          projectId={detailId}
          onBack={() => setDetailId(null)}
          onInstall={(hit) => setInstallHits([hit])}
        />
        {installHits && <InstallModal hits={installHits} onClose={() => setInstallHits(null)} />}
      </>
    )
  }

  return (
    <div className="mods-layout">
      <div className="mods-main">
        <input
          className="input mods-search-input"
          type="text"
          placeholder="Search Mods…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {selectedList.length > 0 && (
          <div className="select-bar">
            <span>{selectedList.length} selected</span>
            <span className="viewer__spacer" />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected({})}>
              Clear
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setInstallHits(selectedList)}
            >
              Install selected
            </button>
          </div>
        )}

        {error && <p className="mods__error">{error}</p>}

        {loading && hits.length === 0 ? (
          <p className="mods__hint">Searching…</p>
        ) : hits.length === 0 ? (
          <p className="mods__hint">No results.</p>
        ) : (
          <div className="mod-grid">
            {hits.map((hit) => {
              const isSelected = Boolean(selected[hit.project_id])
              return (
                <div
                  key={hit.project_id}
                  className={'mod-card' + (isSelected ? ' mod-card--selected' : '')}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailId(hit.project_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setDetailId(hit.project_id)
                  }}
                >
                  <input
                    type="checkbox"
                    className="mod-card__select"
                    checked={isSelected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(hit)}
                  />
                  {hit.icon_url ? (
                    <img className="mod-card__icon" src={hit.icon_url} alt="" />
                  ) : (
                    <div className="mod-card__icon mod-card__icon--empty" />
                  )}
                  <div className="mod-card__info">
                    <div className="mod-card__title">{hit.title}</div>
                    <p className="mod-card__desc">{hit.description}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setInstallHits([hit])
                    }}
                  >
                    Install
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {hasMore && (
          <div className="load-more">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      <aside className="mods-filters">
        <h2 className="mods-filters__title">Filters</h2>

        <div className="filter-group">
          <span className="filter-group__label">Environment</span>
          {ENVIRONMENTS.map((e) => (
            <label key={e.id} className="filter-row">
              <input
                type="radio"
                name="environment"
                checked={environment === e.id}
                onChange={() => setEnvironment(e.id)}
              />
              {e.label}
            </label>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-group__label">Version</span>
          <select
            className="input"
            value={filterInstanceId}
            onChange={(e) => setFilterInstanceId(e.target.value)}
          >
            <option value="">Any version</option>
            {instances
              .filter((i) => i.loader !== 'vanilla')
              .map((i) => (
                <option key={i.id} value={i.id}>
                  Only for: {i.name}
                </option>
              ))}
          </select>
          <input
            className="input"
            type="text"
            placeholder="e.g. 1.21.1"
            value={mcVersion}
            disabled={lockedToInstance}
            onChange={(e) => setMcVersion(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <span className="filter-group__label">Mod Loader</span>
          {lockedToInstance && (
            <span className="filter-note">Set by instance: {filterInstance?.loader}</span>
          )}
          {LOADERS.map((l) => (
            <label key={l.id} className={'filter-row' + (lockedToInstance ? ' filter-row--off' : '')}>
              <input
                type="checkbox"
                checked={loaders.includes(l.id)}
                disabled={lockedToInstance}
                onChange={() => toggle(loaders, setLoaders, l.id)}
              />
              {l.label}
            </label>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-group__label">Category</span>
          {CATEGORIES.map((c) => (
            <label key={c.id} className="filter-row">
              <input
                type="checkbox"
                checked={categories.includes(c.id)}
                onChange={() => toggle(categories, setCategories, c.id)}
              />
              {c.label}
            </label>
          ))}
        </div>
      </aside>

      {installHits && <InstallModal hits={installHits} onClose={() => setInstallHits(null)} />}
    </div>
  )
}
