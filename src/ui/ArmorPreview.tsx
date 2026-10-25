/**
 * The 3D armor preview beside a colour requirement (specs/armor-preview.md).
 * It loads the three.js scene on mount and shows the text alternative when
 * the browser has no WebGL. Randomize rolls a look for the rest of the piece:
 * exact from the user's own game files for type 15, else approximate.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Requirement } from '../core/format/profile'
import type { SlotDefinitions } from '../core/eval/match'
import { basePaint, type ArmorView } from '../core/gamedata/armorpreview'
import { rollApproximate, rollExact, type Look, type Roll } from '../core/gamedata/armorroll'
import type { ArmorScene } from './armorScene'
import type { GameFiles } from './gameFiles'

const DRAG_RADIANS_PER_PIXEL = 0.012
const KEY_RADIANS = Math.PI / 12

export function ArmorPreview({
  view,
  req,
  slots,
  gameFiles,
  random = Math.random,
}: {
  view: ArmorView
  /** The requirement of the view. The exact roll needs a type 15 one and its slots. */
  req?: Requirement
  slots?: SlotDefinitions
  gameFiles?: GameFiles
  random?: () => number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sceneRef = useRef<ArmorScene | null>(null)
  const [look, setLook] = useState<Look | null>(null)
  const [message, setMessage] = useState('')
  const [rolling, setRolling] = useState(false)
  const paint = useMemo(() => look?.paint ?? basePaint(view), [look, view])
  const label = look?.label ?? view.label
  const shownRef = useRef({ view, paint })
  shownRef.current = { view, paint }
  // A roll that ends after the view changed belongs to the old view.
  const rollId = useRef(0)
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
        scene.show(shownRef.current.view, shownRef.current.paint)
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
    rollId.current++
    setLook(null)
    setMessage('')
  }, [view])

  useEffect(() => {
    sceneRef.current?.show(view, paint)
  }, [view, paint])

  async function randomize() {
    const id = ++rollId.current
    setRolling(true)
    let roll: Roll | null = null
    let note = ''
    if (gameFiles?.source && req?.type === 15 && !('data' in req) && slots) {
      try {
        roll = await rollExact(gameFiles.source, view, req, slots, random)
      } catch {
        note = 'Could not read the game files. '
      }
    }
    if (id !== rollId.current) return
    setRolling(false)
    if (roll?.kind === 'never') {
      setLook(null)
      setMessage(roll.message)
    } else if (roll?.kind === 'look') {
      setLook(roll.look)
      setMessage('')
    } else {
      setLook(rollApproximate(view, random))
      setMessage(`${note}The colours are approximate.`)
    }
  }

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
        <p className="armor-preview-text">{label}</p>
      ) : (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          tabIndex={0}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onKeyDown={keyDown}
        />
      )}
      <div className="armor-preview-actions">
        <button type="button" onClick={() => void randomize()} disabled={rolling}>
          Randomize
        </button>
        {gameFiles && (
          <button
            type="button"
            onClick={() => (gameFiles.desktop ? void gameFiles.pickDesktop() : fileRef.current?.click())}
          >
            Use game files…
          </button>
        )}
        {gameFiles && !gameFiles.desktop && (
          <input
            ref={fileRef}
            type="file"
            accept=".dat"
            hidden
            aria-label="client_portal.dat"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void gameFiles.pickFile(file)
            }}
          />
        )}
      </div>
      {gameFiles?.name && <figcaption>Game files: {gameFiles.name}</figcaption>}
      {gameFiles?.error && <figcaption role="status">{gameFiles.error}</figcaption>}
      {message && <figcaption role="status">{message}</figcaption>}
      {view.note && <figcaption>{view.note}</figcaption>}
    </figure>
  )
}
