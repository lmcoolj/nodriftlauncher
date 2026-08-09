import { MinimizeIcon, CloseIcon } from './icons'

/**
 * Custom minimize + close buttons (top-right of the title bar). These drive the
 * native window through the preload bridge. No maximize button is shown per the
 * design sketch, though double-clicking the title bar still toggles maximize.
 */
export function WindowControls(): React.JSX.Element {
  return (
    <div className="win-controls">
      <button
        type="button"
        className="win-btn win-btn--min"
        aria-label="Minimize"
        title="Minimize"
        onClick={() => window.nodrift.window.minimize()}
      >
        <MinimizeIcon />
      </button>
      <button
        type="button"
        className="win-btn win-btn--close"
        aria-label="Close"
        title="Close"
        onClick={() => window.nodrift.window.close()}
      >
        <CloseIcon />
      </button>
    </div>
  )
}
