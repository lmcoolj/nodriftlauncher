import { useCallback, useEffect, useState } from 'react'
import { ModDetail } from '../mods/ModDetail'
import { PackInstallModal, type PackHit } from '../packs/PackInstallModal'
import { useInstances } from '../instances/useInstances'

type PackType = 'resourcepack' | 'shader'

const PACK_TYPES: Array<{ id: PackType; label: string }> = [
  { id: 'resourcepack', label: 'Resource Packs' },
  { id: 'shader', label: 'Shaders' }
]

const SEARCH_PLACEHOLDER: Record<PackType, string> = {
  resourcepack: 'Search Resource Packs…',
  shader: 'Search Shaders…'
}

/** Turn a Modrinth category slug ("vanilla-like") into a label ("Vanilla Like"). */
function labelForCategory(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function toPackHit(hit: NdModHit): PackHit {
  return {
    project_id: hit.project_id,
    title: hit.title,
    icon_url: hit.icon_url,
    description: hit.description,
    versions: hit.versions
  }
}

/**
 * Modrinth resource pack / shader browser. Mirrors the Mods tab but drops the
 * loader filter (packs aren't loader-specific) and adds a content-type switch.
 * Categories are pulled live from Modrinth's tag list for the current type.
 */
export function PacksTab(): React.JSX.Element {
  const { instances } = useInstances()

  const [packType, setPackType] = useState<PackType>('resourcepack')
  const [query, setQuery] = useState('')
  const [mcVersion, setMcVersion] = useState('')
  const [filterInstanceId, setFilterInstanceId] = useState('')
  const [categories, setCategories] = useState<string[]>([])

  const [available, setAvailable] = useState<string[]>([])
  const [hits, setHits] = useState<NdModHit[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, NdModHit>>({})
  const [installHits, setInstallHits] = useState<PackHit[] | null>(null)

  const filterInstance = instances.find((i) => i.id === filterInstanceId) ?? null
  const lockedToInstance = Boolean(filterInstance)

  const toggleCategory = (id: string): void => {
    setCategories((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelect = (hit: NdModHit): void => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[hit.project_id]) delete next[hit.project_id]
      else next[hit.project_id] = hit
      return next
    })
  }

  // Load the category list for the current pack type; reset any stale selection.
  useEffect(() => {
    setCategories([])
    window.nodrift.mods.categories(packType).then((res) => {
      if (res.ok) setAvailable(res.categories)
    })
  }, [packType])

  const PAGE = 30

  const buildOptions = useCallback(
    (offset: number): NdModSearchOptions => {
      const effectiveMc = filterInstance ? filterInstance.mcVersion : mcVersion.trim() || undefined
      return {
        query,
        projectType: packType,
        mcVersion: effectiveMc,
        categories: categories.length ? categories : undefined,
        offset
      }
    },
    [query, packType, mcVersion, categories, filterInstance]
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
          backLabel="← Back to Packs"
          urlType={packType}
          onBack={() => setDetailId(null)}
          onInstall={(hit) =>
            setInstallHits([
              {
                project_id: hit.project_id,
                title: hit.title,
                icon_url: hit.icon_url,
                description: hit.description,
                versions: hit.versions
              }
            ])
          }
        />
        {installHits && (
          <PackInstallModal
            hits={installHits}
            projectType={packType}
            onClose={() => setInstallHits(null)}
          />
        )}
      </>
    )
  }

  return (
    <div className="mods-layout">
      <div className="mods-main">
        <input
          className="input mods-search-input"
          type="text"
          placeholder={SEARCH_PLACEHOLDER[packType]}
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
              onClick={() => setInstallHits(selectedList.map(toPackHit))}
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
                      setInstallHits([toPackHit(hit)])
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
          <span className="filter-group__label">Type</span>
          {PACK_TYPES.map((t) => (
            <label key={t.id} className="filter-row">
              <input
                type="radio"
                name="pack-type"
                checked={packType === t.id}
                onChange={() => setPackType(t.id)}
              />
              {t.label}
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
            {instances.map((i) => (
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

        {available.length > 0 && (
          <div className="filter-group">
            <span className="filter-group__label">Category</span>
            {available.map((c) => (
              <label key={c} className="filter-row">
                <input
                  type="checkbox"
                  checked={categories.includes(c)}
                  onChange={() => toggleCategory(c)}
                />
                {labelForCategory(c)}
              </label>
            ))}
          </div>
        )}
      </aside>

      {installHits && (
        <PackInstallModal
          hits={installHits}
          projectType={packType}
          onClose={() => setInstallHits(null)}
        />
      )}
    </div>
  )
}
