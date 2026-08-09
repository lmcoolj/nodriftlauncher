/** Minimal inline SVG icons so the shell has zero external asset dependencies. */

interface IconProps {
  size?: number
}

export function MinimizeIcon({ size = 12 }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <rect x="2" y="5.5" width="8" height="1.2" fill="currentColor" />
    </svg>
  )
}

export function CloseIcon({ size = 12 }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="square"
      />
    </svg>
  )
}

export function SettingsIcon({ size = 15 }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"
      />
      <path
        fill="currentColor"
        d="m19.4 13-.1-1 .1-1 1.7-1.3-1.7-3-2 .8-1.7-1-.3-2.1h-3.4l-.3 2.1-1.7 1-2-.8-1.7 3L6 11l-.1 1 .1 1-1.7 1.3 1.7 3 2-.8 1.7 1 .3 2.1h3.4l.3-2.1 1.7-1 2 .8 1.7-3L19.4 13Zm-2 .3 1 .8-.6 1-1.2-.5-.7.5-1 .6-.2 1.3h-1.2l-.2-1.3-1-.6-.7-.5-1.2.5-.6-1 1-.8v-.3l.1-1-.1-1v-.3l-1-.8.6-1 1.2.5.7-.5 1-.6.2-1.3h1.2l.2 1.3 1 .6.7.5 1.2-.5.6 1-1 .8v.3l.1 1-.1 1v.3Z"
      />
    </svg>
  )
}
