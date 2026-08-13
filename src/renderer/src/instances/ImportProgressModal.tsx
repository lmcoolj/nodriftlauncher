const PHASE_LABELS: Record<NdImportProgress['phase'], string> = {
  reading: 'Reading pack…',
  downloading: 'Downloading files…',
  extracting: 'Extracting files…'
}

/**
 * Non-dismissable progress modal shown while a modpack imports. The download
 * phase is determinate (files done / total); reading and extracting are shown
 * as an indeterminate sweep since their duration isn't known up front.
 */
export function ImportProgressModal({
  progress
}: {
  progress: NdImportProgress
}): React.JSX.Element {
  const determinate = progress.phase === 'downloading' && progress.total > 0
  const pct = determinate ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="modal-backdrop">
      <div className="modal import-modal" role="dialog" aria-modal="true" aria-label="Importing pack">
        <header className="modal__header">
          <h2 className="modal__title">Importing pack</h2>
        </header>
        <div className="modal__body">
          <p className="field__note">{PHASE_LABELS[progress.phase]}</p>
          <div className={'progress' + (determinate ? '' : ' progress--indeterminate')}>
            <div className="progress__fill" style={determinate ? { width: `${pct}%` } : undefined} />
          </div>
          {determinate && (
            <p className="import-modal__count">
              {progress.done} / {progress.total} files
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
