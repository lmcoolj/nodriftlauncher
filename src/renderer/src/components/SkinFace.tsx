import { useEffect, useRef } from 'react'

interface SkinFaceProps {
  dataUrl: string | null
  /** Rendered pixel size (square). */
  size?: number
  fallbackLabel?: string
}

/**
 * Renders the player's face from a Minecraft skin texture. The face is the 8×8
 * region at (8,8) with the hat/overlay layer at (40,8) composited on top — a
 * mapping that is stable across all skin formats (64×64 and legacy 64×32).
 * Nearest-neighbour scaling keeps the pixels crisp.
 */
export function SkinFace({ dataUrl, size = 96, fallbackLabel }: SkinFaceProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!dataUrl) return

    const img = new Image()
    img.onload = () => {
      ctx.imageSmoothingEnabled = false
      // Base face, then the hat overlay composited over it.
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size)
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size)
    }
    img.src = dataUrl
  }, [dataUrl, size])

  if (!dataUrl) {
    const initial = (fallbackLabel ?? '?').trim().charAt(0).toUpperCase() || '?'
    return (
      <div
        className="skin-face skin-face--fallback"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-hidden="true"
      >
        {initial}
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="skin-face"
      style={{ width: size, height: size }}
    />
  )
}
