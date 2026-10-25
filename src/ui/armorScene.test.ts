// The framing of the armor preview (specs/armor-preview.md, "Done when": the
// figure is centred with the head fully visible). It projects the real
// stand-in geometry, so it needs three.js but no WebGL.

import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { PIECE_PARTS, type ArmorPiece } from '../core/gamedata/armorpreview'
import { figure, frameCamera, frameOf, shape } from './armorScene'

const PIECES = Object.keys(PIECE_PARTS) as ArmorPiece[]
const ASPECT = 319 / 260
const FOV = 30

function build(piece: ArmorPiece) {
  const model = new THREE.Group()
  model.rotation.y = -0.6
  for (const mesh of figure()) model.add(mesh)
  const group = new THREE.Group()
  for (const [, mesh] of shape(piece).parts) group.add(mesh)
  model.add(group)
  return { model, group }
}

/** The screen box (NDC) of every vertex at or above `yMin`. */
function screenBox(model: THREE.Group, camera: THREE.Camera, yMin: number) {
  model.updateMatrixWorld(true)
  const box = { left: Infinity, right: -Infinity, top: -Infinity, bottom: Infinity }
  const v = new THREE.Vector3()
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const pos = o.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
      if (v.y < yMin - 1e-9) continue
      v.project(camera)
      box.left = Math.min(box.left, v.x)
      box.right = Math.max(box.right, v.x)
      box.top = Math.max(box.top, v.y)
      box.bottom = Math.min(box.bottom, v.y)
    }
  })
  return box
}

function cameraFor(model: THREE.Group, group: THREE.Group) {
  const frame = frameOf(model, group)
  const at = frameCamera(frame, FOV, ASPECT)
  const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 0.05, 20)
  camera.position.set(0, at.y, at.z)
  camera.lookAt(0, at.y, 0)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  return { camera, frame }
}

describe('frameCamera', () => {
  it.each(PIECES)('keeps the %s and the whole head in view at every turn', (piece) => {
    const { model, group } = build(piece)
    const { camera, frame } = cameraFor(model, group)
    for (let turn = 0; turn < 24; turn++) {
      model.rotation.y = -0.6 + (turn * Math.PI) / 12
      const box = screenBox(model, camera, frame.yMin)
      expect(box.top).toBeLessThanOrEqual(1)
      expect(box.left).toBeGreaterThanOrEqual(-1)
      expect(box.right).toBeLessThanOrEqual(1)
    }
  })

  it.each(PIECES)('centres the %s at the starting angle', (piece) => {
    const { model, group } = build(piece)
    const { camera, frame } = cameraFor(model, group)
    const box = screenBox(model, camera, frame.yMin)
    expect(Math.abs(box.left + box.right) / 2).toBeLessThan(0.08)
    expect(Math.abs(box.top + box.bottom) / 2).toBeLessThan(0.15)
    // The model fills a good part of the view, not a speck in the middle.
    expect(box.top).toBeGreaterThan(0.4)
  })
})
