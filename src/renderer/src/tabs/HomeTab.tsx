import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { useInstances } from '../instances/useInstances'
import { useNotifications } from '../useNotifications'
import { CreateInstanceDialog } from '../instances/CreateInstanceDialog'
import { InstanceCard } from '../instances/InstanceCard'
import { SkinFace } from '../components/SkinFace'

/**
 * Home view: account area + the instance grid. Clicking a card opens the Instance
 * Viewer; create / import live in the header. Delete and console are in the viewer.
 */
export function HomeTab(): React.JSX.Element {
  const { status, session, error: authError, login, logout } = useAuth()
  const { instances, loading, error, importPack } = useInstances()
  const { notify } = useNotifications()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<NdInstance | null>(null)

  const handleImport = async (): Promise<void> => {
    const instance = await importPack()
    if (instance) notify(`Successfully imported "${instance.name}"`, 'success')
  }

  return (
    <div className="home">
      <div className="home__topbar">
        <div className="home__heading">
          <h1 className="home__title">Your Instances</h1>
          <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
            + New Instance
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => void handleImport()}>
            Import Instance
          </button>
        </div>

        <div className="account-area">
          {status === 'signed-in' && session ? (
            <div className="account-chip">
              <SkinFace dataUrl={session.skin?.dataUrl ?? null} size={32} fallbackLabel={session.username} />
              <span className="account-chip__name">{session.username}</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void logout()}>
                Sign out
              </button>
            </div>
          ) : status === 'restoring' ? (
            <span className="account-area__hint">Checking sign-in…</span>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void login()}
              disabled={status === 'signing-in'}
            >
              {status === 'signing-in' ? 'Waiting for Microsoft…' : 'Sign In'}
            </button>
          )}
        </div>
      </div>

      {authError && <p className="home__error">{authError}</p>}
      {error && <p className="home__error">{error}</p>}

      {loading ? (
        <p className="home__hint">Loading instances…</p>
      ) : instances.length === 0 ? (
        <div className="empty">
          <p className="empty__title">No instances yet</p>
          <p className="empty__text">
            Create your first instance — pick a Minecraft version and loader.
          </p>
          <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
            + New Instance
          </button>
        </div>
      ) : (
        <div className="instance-grid">
          {instances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              canPlay={status === 'signed-in'}
              onEdit={setEditing}
            />
          ))}
        </div>
      )}

      {creating && <CreateInstanceDialog onClose={() => setCreating(false)} />}
      {editing && <CreateInstanceDialog instance={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
