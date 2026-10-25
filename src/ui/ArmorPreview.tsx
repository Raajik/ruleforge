/**
 * The 3D armor preview beside a colour requirement (specs/armor-preview.md).
 * It loads the three.js scene on mount and shows the text alternative when
 * the browser has no WebGL.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { ArmorView } from '../core/gamedata/armorpreview'
import type { ArmorScene } from './armorScene'

const DRAG_RADIANS_PER_PIXEL = 0.012
const KEY_RADIANS = Math.PI / 12

export function ArmorPreview({ view }: { view: ArmorView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<ArmorScene | null>(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const dragX = useRef<number | null>(null)
  // jsdom and browsers without WebGL lack the constructor; skip the import then.
  const [failed, setFailed] = useState(() => typeof WebGLRenderingContext === 'undefined')

  useEffect(() => {
    if (failed) return
    let closed = false
    import('./armorScene')
      .then(({ createArmorScene }) => {
        if (closed || !canvasRef.current) return
        const scene = createArmorScene(canvasRef.current)
        sceneRef.current = scene
        scene.show(viewRef.current)
      })
      .catch(() => {
        if (!closed) setFailed(true)
      })
    return () => {
      closed = true
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [failed])

  useEffect(() => {
    sceneRef.current?.show(view)
  }, [view])

  function pointerDown(e: PointerEvent<HTMLCanvasElement>) {
    dragX.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function pointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (dragX.current === null) return
    sceneRef.current?.turn((e.clientX - dragX.current) * DRAG_RADIANS_PER_PIXEL)
    dragX.current = e.clientX
  }

  function pointerUp() {
    dragX.current = null
  }

  function keyDown(e: KeyboardEvent<HTMLCanvasElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    sceneRef.current?.turn(e.key === 'ArrowLeft' ? -KEY_RADIANS : KEY_RADIANS)
  }

  return (
    <figure className="armor-preview">
      {failed ? (
        <p className="armor-preview-text">{view.label}</p>
      ) : (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={view.label}
          tabIndex={0}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onKeyDown={keyDown}
        />
      )}
      {view.note && <figcaption>{view.note}</figcaption>}
    </figure>
  )
}
