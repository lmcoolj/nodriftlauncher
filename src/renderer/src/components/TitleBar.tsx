import { WindowControls } from './WindowControls'
import { SettingsIcon } from './icons'
import { MAIN_TABS, TAB_LABELS, type MainTab, type View } from '../navigation'

interface TitleBarProps {
  view: View
  onSelect: (view: View) => void
}

/**
 * The custom, draggable title bar: brand on the left, the main tab row in the
 * middle, and settings + window controls on the right. The bar itself is a drag
 * region; every interactive element opts out via the `no-drag` class.
 */
export function TitleBar({ view, onSelect }: TitleBarProps): React.JSX.Element {
  const handleDoubleClick = (): void => {
    window.nodrift.window.toggleMaximize()
  }

  return (
    <header className="titlebar" onDoubleClick={handleDoubleClick}>
      <div className="titlebar__brand no-drag" onDoubleClick={(e) => e.stopPropagation()}>
        <span className="brand__mark">NodriftLauncher</span>
      </div>

      <nav className="tabs no-drag" onDoubleClick={(e) => e.stopPropagation()}>
        {MAIN_TABS.map((tab: MainTab) => (
          <button
            key={tab}
            type="button"
            className={'tab' + (view === tab ? ' tab--active' : '')}
            aria-current={view === tab ? 'page' : undefined}
            onClick={() => onSelect(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      <div className="titlebar__spacer" />

      <div className="titlebar__actions no-drag" onDoubleClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={'icon-btn' + (view === 'settings' ? ' icon-btn--active' : '')}
          aria-label="Settings"
          title="Settings"
          onClick={() => onSelect('settings')}
        >
          <SettingsIcon />
        </button>
        <WindowControls />
      </div>
    </header>
  )
}
