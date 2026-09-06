import { WindowControls } from './WindowControls'
import { UpdateButton } from './UpdateButton'

/**
 * Slim top strip over the main area: a draggable region, the in-app update
 * control, and the native window controls. Navigation + branding live in the
 * Sidebar, so this bar only carries the drag handle, updates, and min/close.
 */
export function TitleBar(): React.JSX.Element {
  const handleDoubleClick = (): void => {
    window.nodrift.window.toggleMaximize()
  }

  return (
    <header className="titlebar" onDoubleClick={handleDoubleClick}>
      <div className="titlebar__spacer" />
      <div className="titlebar__actions no-drag" onDoubleClick={(e) => e.stopPropagation()}>
        <UpdateButton />
        <WindowControls />
      </div>
    </header>
  )
}
