import { useEffect, useState } from 'react'
import { useTheme } from '../theme/ThemeProvider'
import { useAuth } from '../auth/useAuth'

const REPO_URL = 'https://github.com/lmcoolj/nodriftlauncher'

const openExternal = (url: string): void => {
  void window.nodrift.mods.openUrl(url)
}

/** Settings: theme switcher, account, updates, and credits. */
export function SettingsTab(): React.JSX.Element {
  const { theme, themes, setThemeId } = useTheme()
  const { status, session, login, logout } = useAuth()

  const [version, setVersion] = useState('')
  const [update, setUpdate] = useState<NdUpdateStatus | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    window.nodrift.app.getVersion().then(setVersion)
    return window.nodrift.update.onStatus(setUpdate)
  }, [])

  const checkForUpdates = async (): Promise<void> => {
    setChecking(true)
    setUpdate(await window.nodrift.update.check())
    setChecking(false)
  }

  const updateMessage = (): string => {
    if (checking) return 'Checking for updates…'
    switch (update?.state) {
      case 'dev':
        return 'In-app updates are only available in the installed app.'
      case 'none':
        return "You're on the latest version."
      case 'available':
        return `Version ${update.version} is available.`
      case 'downloading':
        return `Downloading… ${update.percent}%`
      case 'downloaded':
        return 'Update downloaded — restart to finish.'
      case 'error':
        return `Couldn't check for updates: ${update.message}`
      default:
        return ''
    }
  }

  return (
    <div className="settings">
      <div className="placeholder__badge">Settings</div>
      <h1 className="settings__title">Settings</h1>

      <section className="settings__section">
        <h2 className="settings__heading">Account</h2>
        {status === 'signed-in' && session ? (
          <div className="settings__account">
            <span className="settings__hint">
              Signed in as <strong>{session.username}</strong>
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="settings__account">
            <span className="settings__hint">Not signed in.</span>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={status === 'signing-in'}
              onClick={() => void login()}
            >
              {status === 'signing-in' ? 'Waiting for Microsoft…' : 'Sign In'}
            </button>
          </div>
        )}
      </section>

      <section className="settings__section">
        <h2 className="settings__heading">Updates</h2>
        <div className="settings__account">
          <span className="settings__hint">
            Current version <strong>v{version}</strong>
            {updateMessage() ? ` · ${updateMessage()}` : ''}
          </span>
          {update?.state === 'available' ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void window.nodrift.update.download()}
            >
              Download
            </button>
          ) : update?.state === 'downloaded' ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => void window.nodrift.update.install()}
            >
              Restart &amp; update
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={checking || update?.state === 'downloading'}
              onClick={() => void checkForUpdates()}
            >
              {checking ? 'Checking…' : 'Check for updates'}
            </button>
          )}
        </div>
      </section>

      <section className="settings__section">
        <h2 className="settings__heading">Theme</h2>
        <p className="settings__hint">
          Choose a theme. Themes are plain token sets — adding a new one is a
          single file.
        </p>

        <div className="theme-grid">
          {themes.map((t) => {
            const active = t.id === theme.id
            return (
              <button
                key={t.id}
                type="button"
                className={'theme-card' + (active ? ' theme-card--active' : '')}
                onClick={() => setThemeId(t.id)}
                aria-pressed={active}
              >
                <div className="theme-card__swatches">
                  <span style={{ background: t.tokens.bg }} />
                  <span style={{ background: t.tokens.surfaceRaised }} />
                  <span style={{ background: t.tokens.accent }} />
                  <span style={{ background: t.tokens.accent2 }} />
                  <span style={{ background: t.tokens.text }} />
                </div>
                <div className="theme-card__meta">
                  <span className="theme-card__name">{t.name}</span>
                  <span className="theme-card__scheme">{t.scheme}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="settings__section">
        <h2 className="settings__heading">Credits</h2>
        <p className="settings__hint">
          Nodrift Client v{version} — a Minecraft: Java Edition launcher for Windows.
        </p>

        <div className="credits">
          <div className="credits__row">
            <span className="credits__label">Created by</span>
            <span className="credits__value">lmcoolj</span>
          </div>
          <div className="credits__row">
            <span className="credits__label">Source</span>
            <button type="button" className="credits__link" onClick={() => openExternal(REPO_URL)}>
              github.com/lmcoolj/nodriftlauncher
            </button>
          </div>
        </div>

        <p className="settings__hint credits__thanks">
          Built with Electron &amp; React. Mod, resource-pack and shader data from{' '}
          <button
            type="button"
            className="credits__link"
            onClick={() => openExternal('https://modrinth.com')}
          >
            Modrinth
          </button>
          . Not affiliated with Mojang or Microsoft.
        </p>
      </section>
    </div>
  )
}
