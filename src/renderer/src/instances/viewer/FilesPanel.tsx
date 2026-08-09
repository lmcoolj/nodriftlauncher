import { useCallback, useEffect, useState } from 'react'

/** A read-only file browser of the instance's minecraft directory. */
export function FilesPanel({ instanceId }: { instanceId: string }): React.JSX.Element {
  const [path, setPath] = useState('')
  const [entries, setEntries] = useState<NdDirEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (relPath: string) => {
      const res = await window.nodrift.instanceFs.browse(instanceId, relPath)
      if (res.ok) {
        setPath(res.path)
        setEntries(res.entries)
        setError(null)
      } else {
        setError(res.error)
      }
    },
    [instanceId]
  )

  useEffect(() => {
    void load('')
  }, [load])

  const parts = path ? path.split('/').filter(Boolean) : []
  const goTo = (index: number): void => {
    void load(parts.slice(0, index + 1).join('/'))
  }
  const open = (entry: NdDirEntry): void => {
    const next = path ? `${path}/${entry.name}` : entry.name
    if (entry.isDir) void load(next)
    else void window.nodrift.instanceFs.open(instanceId, next)
  }

  return (
    <div className="panel-body">
      <div className="panel-body__toolbar">
        <div className="breadcrumb">
          <button type="button" className="breadcrumb__item" onClick={() => void load('')}>
            minecraft
          </button>
          {parts.map((p, i) => (
            <span key={i}>
              <span className="breadcrumb__sep">/</span>
              <button type="button" className="breadcrumb__item" onClick={() => goTo(i)}>
                {p}
              </button>
            </span>
          ))}
        </div>
        <span className="viewer__spacer" />
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => void window.nodrift.instanceFs.open(instanceId, path)}
        >
          Open Folder
        </button>
      </div>

      {error && <p className="mods__error">{error}</p>}
      {entries.length === 0 ? (
        <p className="mods__hint">Empty folder.</p>
      ) : (
        <div className="file-list">
          {entries.map((entry) => (
            <button key={entry.name} type="button" className="file-row" onClick={() => open(entry)}>
              <span className="file-row__icon">{entry.isDir ? '📁' : '📄'}</span>
              <span className="file-row__name">{entry.name}</span>
              {!entry.isDir && <span className="file-row__size">{formatSize(entry.size)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
