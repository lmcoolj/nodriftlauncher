import { useState } from 'react'
import { useInstances } from './useInstances'
import { useInstanceRuntime, useLaunch } from './useLaunch'
import { Console } from '../components/Console'
import { Modal } from '../components/Modal'

const LOADER_LABELS: Record<NdLoader, string> = {
  vanilla: 'Vanilla',
  fabric: 'Fabric',
  forge: 'Forge',
  neoforge: 'NeoForge'
}

const PHASE_LABELS: Record<NdInstallPhase, string> = {
  version: 'Reading version',
  client: 'Downloading client',
  libraries: 'Downloading libraries',
  natives: 'Extracting natives',
  assets: 'Downloading assets',
  java: 'Downloading Java',
  processors: 'Patching (loader)'
}

interface InstanceCardProps {
  instance: NdInstance
  canPlay: boolean
  onEdit: (instance: NdInstance) => void
  onDelete: (instance: NdInstance) => void
}

export function InstanceCard({
  instance,
  canPlay,
  onEdit,
  onDelete
}: InstanceCardProps): React.JSX.Element {
  const { selectedId, select, openFolder, exportInstance } = useInstances()
  const { start, stop } = useLaunch()
  const runtime = useInstanceRuntime(instance.id)
  const [showConsole, setShowConsole] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const isSelected = instance.id === selectedId
  const busy =
    runtime.state === 'preparing' ||
    runtime.state === 'installing' ||
    runtime.state === 'launching'
  const running = runtime.state === 'running'

  const percent =
    runtime.total > 0 ? Math.round((runtime.done / runtime.total) * 100) : null

  const statusText = (): string => {
    switch (runtime.state) {
      case 'preparing':
        return 'Preparing…'
      case 'installing':
        return runtime.phase ? PHASE_LABELS[runtime.phase] : 'Installing…'
      case 'launching':
        return 'Launching…'
      case 'running':
        return 'Running'
      case 'exited':
        return runtime.exitCode ? `Exited (code ${runtime.exitCode})` : 'Stopped'
      case 'error':
        return runtime.errorMessage ?? 'Error'
      default:
        return instance.installed ? 'Ready' : 'Not installed'
    }
  }

  return (
    <div
      className={'instance-card' + (isSelected ? ' instance-card--selected' : '')}
      onClick={() => select(instance.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') select(instance.id)
      }}
    >
      <div className="instance-card__head">
        <span
          className={
            'loader-badge' + (instance.loader === 'vanilla' ? ' loader-badge--vanilla' : '')
          }
        >
          {LOADER_LABELS[instance.loader]}
        </span>
        <span
          className={
            'status-dot' + (running || instance.installed ? ' status-dot--ready' : '')
          }
          title={statusText()}
        />
      </div>

      <h3 className="instance-card__name">{instance.name}</h3>
      <p className="instance-card__meta">
        {instance.mcVersion}
        {instance.loaderVersion ? ` · ${instance.loaderVersion}` : ''}
      </p>

      <p
        className={
          'instance-card__status' + (runtime.state === 'error' ? ' instance-card__status--error' : '')
        }
      >
        {statusText()}
        {busy && percent !== null ? ` · ${runtime.done}/${runtime.total}` : ''}
      </p>

      {busy && (
        <div className="progress">
          <div
            className={'progress__bar' + (percent === null ? ' progress__bar--indeterminate' : '')}
            style={percent !== null ? { width: `${percent}%` } : undefined}
          />
        </div>
      )}

      <div className="instance-card__actions" onClick={(e) => e.stopPropagation()}>
        {running ? (
          <button type="button" className="btn btn--danger btn--sm" onClick={() => stop(instance.id)}>
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={busy || !canPlay}
            title={canPlay ? undefined : 'Sign in to play'}
            onClick={() => void start(instance.id)}
          >
            {busy ? 'Working…' : 'Play'}
          </button>
        )}

        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowConsole(true)}>
          Console
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(instance)}>
          Edit
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => openFolder(instance.id)}>
          Folder
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowExport(true)}>
          Export
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm btn--danger"
          disabled={running || busy}
          onClick={() => onDelete(instance)}
        >
          Delete
        </button>
      </div>

      {showConsole && (
        <Console
          title={`${instance.name} — Console`}
          logs={runtime.logs}
          onClose={() => setShowConsole(false)}
        />
      )}

      {showExport && (
        <div onClick={(e) => e.stopPropagation()}>
          <Modal title={`Export ${instance.name}`} onClose={() => setShowExport(false)}>
            <p className="export-hint">
              Choose a format. Both bundle mods, configs and resource packs (not saves).
            </p>
            <div className="export-choices">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setShowExport(false)
                  void exportInstance(instance.id, 'mrpack')
                }}
              >
                Modrinth .mrpack
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setShowExport(false)
                  void exportInstance(instance.id, 'zip')
                }}
              >
                Plain .zip
              </button>
            </div>
          </Modal>
        </div>
      )}
    </div>
  )
}
