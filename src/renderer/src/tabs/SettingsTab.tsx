import { useTheme } from '../theme/ThemeProvider'

/**
 * Settings view. For Step 1 this hosts the working theme switcher, which proves
 * the CSS-variable theme system end to end. Layout switching and other settings
 * are added later.
 */
export function SettingsTab(): React.JSX.Element {
  const { theme, themes, setThemeId } = useTheme()

  return (
    <div className="settings">
      <div className="placeholder__badge">Settings</div>
      <h1 className="settings__title">Settings</h1>

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
    </div>
  )
}
