import { useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { SkinFace } from '../components/SkinFace'

type Variant = 'classic' | 'slim'

/**
 * Cosmetics view: shows the current skin and lets the user change it by uploading
 * a PNG (or reset to default). Uses Microsoft's authenticated skin endpoints.
 */
export function CosmeticsTab(): React.JSX.Element {
  const { status, session } = useAuth()
  const [variant, setVariant] = useState<Variant>('classic')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.skin?.variant) setVariant(session.skin.variant === 'SLIM' ? 'slim' : 'classic')
  }, [session?.skin?.variant])

  if (status !== 'signed-in' || !session) {
    return (
      <div className="placeholder">
        <div className="placeholder__badge">Cosmetics</div>
        <h1 className="placeholder__title">Cosmetics</h1>
        <p className="placeholder__text">Sign in on the Home tab to manage your skin.</p>
      </div>
    )
  }

  const run = async (
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string }>
  ): Promise<void> => {
    setBusy(label)
    setError(null)
    const res = await fn()
    if (!res.ok && res.error) setError(res.error)
    setBusy(null)
  }

  const upload = (): Promise<void> => run('upload', () => window.nodrift.skins.upload(variant))
  const reset = (): Promise<void> => run('reset', () => window.nodrift.skins.reset())

  return (
    <div className="cosmetics">
      <div className="placeholder__badge">Cosmetics</div>
      <h1 className="cosmetics__title">Your skin</h1>

      <div className="cosmetics__grid">
        <div className="cosmetics__panel">
          <span className="cosmetics__panel-label">Current</span>
          <SkinFace dataUrl={session.skin?.dataUrl ?? null} size={160} fallbackLabel={session.username} />
          {session.skin?.dataUrl && (
            <img className="cosmetics__texture" src={session.skin.dataUrl} alt="Skin texture" />
          )}
        </div>

        <div className="cosmetics__panel">
          <span className="cosmetics__panel-label">Change skin</span>

          <div className="variant-toggle">
            <button
              type="button"
              className={'variant-btn' + (variant === 'classic' ? ' variant-btn--active' : '')}
              onClick={() => setVariant('classic')}
            >
              Classic
            </button>
            <button
              type="button"
              className={'variant-btn' + (variant === 'slim' ? ' variant-btn--active' : '')}
              onClick={() => setVariant('slim')}
            >
              Slim
            </button>
          </div>

          <button
            type="button"
            className="btn btn--primary"
            disabled={busy !== null}
            onClick={() => void upload()}
          >
            {busy === 'upload' ? 'Uploading…' : 'Upload PNG…'}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={busy !== null}
            onClick={() => void reset()}
          >
            {busy === 'reset' ? 'Resetting…' : 'Reset to default'}
          </button>

          {error && <p className="field__note field__note--warn">{error}</p>}
        </div>
      </div>
    </div>
  )
}
