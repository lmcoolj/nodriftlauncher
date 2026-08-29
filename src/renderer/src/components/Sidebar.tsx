import { useAuth } from '../auth/useAuth'
import { useNavigation } from '../useNavigation'
import { SkinFace } from './SkinFace'
import { SettingsIcon } from './icons'
import { MAIN_TABS, TAB_LABELS, type MainTab } from '../navigation'

const APP_VERSION = 'v0.3.0'

/** Blocky pixel "N" mark — placeholder until the real logo lands. */
function BrandMark(): React.JSX.Element {
  return (
    <span className="brand__mark">
      <svg width="18" height="18" viewBox="0 0 6 6" fill="#fff" shapeRendering="crispEdges">
        <rect x="1" y="0" width="1" height="6" />
        <rect x="4" y="0" width="1" height="6" />
        <rect x="2" y="1" width="1" height="1" />
        <rect x="2" y="2" width="1" height="1" />
        <rect x="3" y="3" width="1" height="1" />
        <rect x="3" y="4" width="1" height="1" />
      </svg>
    </span>
  )
}

const NAV_ICONS: Record<MainTab, React.JSX.Element> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  ),
  mods: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 3 7v10l9 5 9-5V7z" />
      <path d="M3 7l9 5 9-5" />
      <path d="M12 12v10" />
    </svg>
  ),
  packs: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 3 8l9 5 9-5z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  ),
  cosmetics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3 4 6v4l3-1v12h10V9l3 1V6l-4-3a4 4 0 0 1-8 0Z" />
    </svg>
  )
}

/**
 * Left navigation rail: brand, the main tabs, and the account chip + settings
 * gear pinned to the bottom (Dawn-style layout). Replaces the old titlebar tabs.
 */
export function Sidebar(): React.JSX.Element {
  const { tab, setTab } = useNavigation()
  const { status, session, login } = useAuth()

  return (
    <aside className="sidebar">
      <div className="brand">
        <BrandMark />
        <span className="brand__name">
          Nodrift <b>Client</b>
          <span className="brand__tag">{APP_VERSION}</span>
        </span>
      </div>

      <nav className="nav no-drag">
        <span className="nav__label">Menu</span>
        {MAIN_TABS.map((t: MainTab) => (
          <button
            key={t}
            type="button"
            className={'nav__item' + (tab === t ? ' nav__item--active' : '')}
            aria-current={tab === t ? 'page' : undefined}
            onClick={() => setTab(t)}
          >
            {NAV_ICONS[t]}
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      <div className="sidebar__spacer" />

      <div className="sidebar__foot no-drag">
        {status === 'signed-in' && session ? (
          <button
            type="button"
            className={'account' + (tab === 'settings' ? ' account--active' : '')}
            onClick={() => setTab('settings')}
            title="Account settings"
          >
            <SkinFace dataUrl={session.skin?.dataUrl ?? null} size={34} fallbackLabel={session.username} />
            <span className="account__meta">
              <span className="account__name">{session.username}</span>
              <span className="account__state">
                <span className="dot" /> Signed in
              </span>
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="account account--signin"
            disabled={status === 'signing-in' || status === 'restoring'}
            onClick={() => void login()}
          >
            <span className="account__meta">
              <span className="account__name">
                {status === 'signing-in'
                  ? 'Waiting…'
                  : status === 'restoring'
                    ? 'Checking…'
                    : 'Sign In'}
              </span>
              <span className="account__state">Microsoft account</span>
            </span>
          </button>
        )}
        <button
          type="button"
          className={'gear' + (tab === 'settings' ? ' gear--active' : '')}
          aria-label="Settings"
          title="Settings"
          onClick={() => setTab('settings')}
        >
          <SettingsIcon />
        </button>
      </div>
    </aside>
  )
}
