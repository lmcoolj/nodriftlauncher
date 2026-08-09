import { useEffect, useRef } from 'react'
import { Modal } from './Modal'

interface ConsoleProps {
  title: string
  logs: string[]
  onClose: () => void
}

/** A read-only, auto-scrolling log console for a launched instance. */
export function Console({ title, logs, onClose }: ConsoleProps): React.JSX.Element {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [logs])

  return (
    <Modal title={title} onClose={onClose}>
      <div className="console">
        {logs.length === 0 ? (
          <p className="console__empty">No output yet.</p>
        ) : (
          logs.map((line, i) => (
            <div key={i} className="console__line">
              {line}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </Modal>
  )
}
