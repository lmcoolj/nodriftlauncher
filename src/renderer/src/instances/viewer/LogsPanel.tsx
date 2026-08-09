import { useEffect, useRef } from 'react'

/** Live, auto-scrolling log view for the instance's latest run. */
export function LogsPanel({ logs }: { logs: string[] }): React.JSX.Element {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [logs])

  return (
    <div className="console console--full">
      {logs.length === 0 ? (
        <p className="console__empty">No output yet. Press Launch to start the game.</p>
      ) : (
        logs.map((line, i) => (
          <div key={i} className="console__line">
            {line}
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  )
}
