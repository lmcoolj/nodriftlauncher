import { useState } from 'react'
import { useInstances } from './useInstances'
import { useInstanceRuntime, useLaunch } from './useLaunch'
import { useNavigation } from '../useNavigation'
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
}

/**
 * Home instance card. Clicking the body opens the Instance Viewer; the action
 * buttons (Folder / Edit / Export / Launch) stop propagation. Delete and the
 * console live in the Instance Viewer now.
 */
export function InstanceCard({ instance, canPlay, onEdit }: InstanceCardProps): React.JSX.Element {
  const { select, openFolder, exportInstance } = useInstances()
  const { start, stop } = useLaunch()
  const { openInstance } = useNavigation()
  const runtime = useInstanceRuntime(instance.id)
  const [showExport, setShowExport] = useState(false)

  const busy =
    runtime.state === 'preparing' ||
    runtime.state === 'installing' ||
    runtime.state === 'launching'
  const running = runtime.state === 'running'
  const percent = runtime.total > 0 ? Math.round((runtime.done / runtime.total) * 100) : null

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

  const open = (): void => {
    select(instance.id)
    openInstance(instance.id)
  }

  return (
    <div
      className="instance-card"
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') open()
      }}
    >
      <div className="instance-card__head">
        <span
          className={'loader-badge' + (instance.loader === 'vanilla' ? ' loader-badge--vanilla' : '')}
        >
          {LOADER_LABELS[instance.loader]}
        </span>
        <span
          className={'status-dot' + (running || instance.installed ? ' status-dot--ready' : '')}
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
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => openFolder(instance.id)}>
          Folder
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(instance)}>
          Edit
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowExport(true)}>
          Export
        </button>
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
            {busy ? 'Working…' : 'Launch'}
          </button>
        )}
      </div>

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
