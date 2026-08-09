import { useState } from 'react'
import { useNavigation } from '../useNavigation'
import { useNotifications } from '../useNotifications'
import { useAuth } from '../auth/useAuth'
import { useInstances } from './useInstances'
import { useInstanceRuntime, useLaunch } from './useLaunch'
import { Modal } from '../components/Modal'
import { LogsPanel } from './viewer/LogsPanel'
import { ModsPanel } from './viewer/ModsPanel'
import { FilesPanel } from './viewer/FilesPanel'
import { PacksPanel } from './viewer/PacksPanel'

type ViewerTab = 'logs' | 'mods' | 'files' | 'packs'
const TABS: ViewerTab[] = ['logs', 'mods', 'files', 'packs']

const PHASE_LABELS: Record<NdInstallPhase, string> = {
  version: 'Reading version',
  client: 'Downloading client',
  libraries: 'Downloading libraries',
  natives: 'Extracting natives',
  assets: 'Downloading assets',
  java: 'Downloading Java',
  processors: 'Patching (loader)'
}

export function InstanceViewer({ instanceId }: { instanceId: string }): React.JSX.Element {
  const { backToHome } = useNavigation()
  const { notify } = useNotifications()
  const { status } = useAuth()
  const { instances, remove, openFolder } = useInstances()
  const { start, stop } = useLaunch()
  const runtime = useInstanceRuntime(instanceId)

  const [tab, setTab] = useState<ViewerTab>('logs')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const instance = instances.find((i) => i.id === instanceId)
  if (!instance) {
    // Instance was deleted or not found — bounce home.
    backToHome()
    return <div className="viewer" />
  }

  const busy =
    runtime.state === 'preparing' ||
    runtime.state === 'installing' ||
    runtime.state === 'launching'
  const running = runtime.state === 'running'

  const launch = (): void => {
    setTab('logs') // logs trail the install + game output
    void start(instanceId)
  }

  const launchLabel = running
    ? 'Running'
    : runtime.state === 'installing'
      ? runtime.phase
        ? PHASE_LABELS[runtime.phase]
        : 'Installing…'
      : busy
        ? 'Working…'
        : 'Launch'

  return (
    <div className="viewer">
      <button type="button" className="viewer__back" onClick={backToHome}>
        ← Back To Home
      </button>

      <div className="viewer__header">
        <h1 className="viewer__title">Instance: {instance.name}</h1>
        <div className="viewer__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => openFolder(instance.id)}>
            Open Folder
          </button>
          {running ? (
            <button type="button" className="btn btn--danger btn--sm" onClick={() => stop(instance.id)}>
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy || status !== 'signed-in'}
              title={status === 'signed-in' ? undefined : 'Sign in to launch'}
              onClick={launch}
            >
              {launchLabel}
            </button>
          )}
        </div>
      </div>

      <div className="viewer__meta">
        {instance.mcVersion}
        {instance.loaderVersion ? ` · ${instance.loader} ${instance.loaderVersion}` : ` · ${instance.loader}`}
      </div>

      <nav className="viewer__tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={'subtab' + (tab === t ? ' subtab--active' : '')}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <span className="viewer__spacer" />
        <button
          type="button"
          className="btn btn--ghost btn--sm btn--danger"
          onClick={() => setConfirmDelete(true)}
        >
          Delete Instance
        </button>
      </nav>

      <div className="viewer__panel">
        {tab === 'logs' && <LogsPanel logs={runtime.logs} />}
        {tab === 'mods' && <ModsPanel instanceId={instance.id} />}
        {tab === 'files' && <FilesPanel instanceId={instance.id} />}
        {tab === 'packs' && <PacksPanel instanceId={instance.id} />}
      </div>

      {confirmDelete && (
        <Modal
          title="Delete instance"
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary btn--danger"
                onClick={() => {
                  setConfirmDelete(false)
                  void remove(instance.id).then(() => {
                    notify(`Deleted "${instance.name}"`, 'info')
                    backToHome()
                  })
                }}
              >
                Delete
              </button>
            </>
          }
        >
          <p>
            Delete <strong>{instance.name}</strong>? This removes its saves, configs, mods and
            resource packs. The shared runtime is not affected. This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  )
}
