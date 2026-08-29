import { WindowControls } from './WindowControls'

/**
 * Slim top strip over the main area: a draggable region plus the native window
 * controls. Navigation and branding now live in the Sidebar, so this bar only
 * carries the drag handle and min/close.
 */
export function TitleBar(): React.JSX.Element {
  const handleDoubleClick = (): void => {
    window.nodrift.window.toggleMaximize()
  }

  return (
    <header className="titlebar" onDoubleClick={handleDoubleClick}>
      <div className="titlebar__spacer" />
      <div className="titlebar__actions no-drag" onDoubleClick={(e) => e.stopPropagation()}>
        <WindowControls />
      </div>
    </header>
  )
}
