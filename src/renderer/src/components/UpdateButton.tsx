import { useEffect, useState } from 'react'

/**
 * Top-bar update control. Checks GitHub releases on mount; when a newer version
 * is available it offers a one-click download, then a "Restart to update". Renders
 * nothing in dev or when already up to date. Real updates require a packaged build
 * running against published releases.
 */
export function UpdateButton(): React.JSX.Element | null {
  const [status, setStatus] = useState<NdUpdateStatus>({ state: 'none' })

  useEffect(() => {
    const off = window.nodrift.update.onStatus(setStatus)
    window.nodrift.update.check().then(setStatus)
    return off
  }, [])

  const download = (): void => {
    setStatus({ state: 'downloading', percent: 0 })
    void window.nodrift.update.download()
  }

  const install = (): void => {
    void window.nodrift.update.install()
  }

  if (status.state === 'available') {
    return (
      <button type="button" className="update-btn no-drag" onClick={download} title="Download update">
        <span className="update-btn__dot" /> Update {status.version}
      </button>
    )
  }
  if (status.state === 'downloading') {
    return (
      <span className="update-btn update-btn--busy no-drag">Updating… {status.percent}%</span>
    )
  }
  if (status.state === 'downloaded') {
    return (
      <button type="button" className="update-btn update-btn--ready no-drag" onClick={install}>
        <span className="update-btn__dot" /> Restart to update
      </button>
    )
  }
  return null
}
