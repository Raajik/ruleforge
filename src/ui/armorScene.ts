// The three.js scene of the armor preview (specs/armor-preview.md). ArmorPreview
// imports this module dynamically, so three.js stays out of the first bundle.
// The model is a stand-in made of primitives: a figure and the piece on it.

import * as THREE from 'three'
import type { ArmorPiece, ArmorView } from '../core/gamedata/armorpreview'

const FIGURE_COLOR = 0x3a3f48
const NEUTRAL_COLOR = 0x8d939d
// Three-quarter front: the model turned 35 degrees from facing the camera.
const START_ANGLE = -0.6

/** An upright cylinder that a pattern sits on. */
interface Host {
  x: number
  z: number
  y0: number
  y1: number
  r: number
}

export interface Shape {
  parts: [part: string, mesh: THREE.Mesh][]
  hosts: Record<string, Host[]>
}

const geo = {
  cyl(rTop: number, rBottom: number, y0: number, y1: number, x = 0, z = 0) {
    return place(new THREE.CylinderGeometry(rTop, rBottom, y1 - y0, 28), x, (y0 + y1) / 2, z)
  },
  sphere(r: number, x: number, y: number, z = 0, squashY = 1) {
    const mesh = place(new THREE.SphereGeometry(r, 24, 16), x, y, z)
    mesh.scale.y = squashY
    return mesh
  },
  dome(r: number, y: number) {
    return place(new THREE.SphereGeometry(r, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.58), 0, y, 0)
  },
  ring(r: number, tube: number, y: number, x = 0) {
    const mesh = place(new THREE.TorusGeometry(r, tube, 10, 32), x, y, 0)
    mesh.rotation.x = Math.PI / 2
    return mesh
  },
  box(w: number, h: number, d: number, x: number, y: number, z: number) {
    return place(new THREE.BoxGeometry(w, h, d), x, y, z)
  },
  horn(x: number, y: number, tilt: number) {
    const mesh = place(new THREE.ConeGeometry(0.03, 0.15, 16), x, y, 0)
    mesh.rotation.z = tilt
    return mesh
  },
}

function place(geometry: THREE.BufferGeometry, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry)
  mesh.position.set(x, y, z)
  return mesh
}

const SIDES = [-1, 1] as const

/** The figure the piece sits on. */
export function figure(): THREE.Mesh[] {
  return [
    ...SIDES.map((s) => geo.cyl(0.065, 0.055, 0.05, 0.86, s * 0.1)),
    ...SIDES.map((s) => geo.box(0.09, 0.05, 0.17, s * 0.1, 0.025, 0.035)),
    geo.cyl(0.17, 0.16, 0.84, 1.0),
    geo.cyl(0.19, 0.16, 1.0, 1.46),
    ...SIDES.map((s) => geo.sphere(0.07, s * 0.22, 1.42)),
    ...SIDES.map((s) => geo.cyl(0.05, 0.045, 0.92, 1.42, s * 0.25)),
    ...SIDES.map((s) => geo.sphere(0.045, s * 0.25, 0.89)),
    geo.cyl(0.05, 0.055, 1.44, 1.56),
    geo.sphere(0.1, 0, 1.65),
  ]
}

/** The meshes of a stand-in piece, each with its part name. */
export function shape(piece: ArmorPiece): Shape {
  const both = (part: string, make: (s: -1 | 1) => THREE.Mesh) =>
    SIDES.map((s): [string, THREE.Mesh] => [part, make(s)])
  switch (piece) {
    case 'coat':
      return {
        parts: [
          ['chest', geo.cyl(0.21, 0.18, 1.0, 1.47)],
          ['chest', geo.cyl(0.2, 0.25, 0.72, 1.0)],
          ['collar', geo.ring(0.075, 0.03, 1.48)],
          ...both('shoulders', (s) => geo.sphere(0.085, s * 0.23, 1.42)),
          ...both('arms', (s) => geo.cyl(0.065, 0.06, 0.98, 1.4, s * 0.25)),
          ['trim', geo.ring(0.25, 0.018, 0.73)],
          ...both('trim', (s) => geo.ring(0.062, 0.016, 0.99, s * 0.25)),
        ],
        hosts: { chest: [{ x: 0, z: 0, y0: 1.04, y1: 1.42, r: 0.205 }] },
      }
    case 'breastplate':
      return {
        parts: [
          ['chest', geo.cyl(0.215, 0.185, 1.12, 1.46)],
          ...both('shoulders', (s) => geo.sphere(0.085, s * 0.22, 1.43, 0, 0.7)),
          ['neck', geo.ring(0.075, 0.024, 1.47)],
          ['trim', geo.ring(0.188, 0.018, 1.12)],
          ['belt', geo.cyl(0.192, 0.192, 1.02, 1.1)],
        ],
        hosts: { chest: [{ x: 0, z: 0, y0: 1.16, y1: 1.42, r: 0.205 }] },
      }
    case 'legs':
      return {
        parts: [
          ['belt', geo.cyl(0.185, 0.185, 0.98, 1.04)],
          ['girth', geo.cyl(0.18, 0.175, 0.82, 0.98)],
          ['crotch', geo.box(0.12, 0.14, 0.03, 0, 0.86, 0.175)],
          ...both('legs', (s) => geo.cyl(0.08, 0.07, 0.14, 0.82, s * 0.1)),
          ...both('knees', (s) => geo.sphere(0.06, s * 0.1, 0.48, 0.05)),
          ...both('shins', (s) => geo.box(0.08, 0.24, 0.03, s * 0.1, 0.29, 0.07)),
          ...both('sides', (s) => geo.box(0.02, 0.62, 0.05, s * 0.178, 0.5, 0)),
          ...both('trim', (s) => geo.ring(0.072, 0.016, 0.15, s * 0.1)),
        ],
        hosts: {
          girth: [{ x: 0, z: 0, y0: 0.85, y1: 0.95, r: 0.178 }],
          legs: SIDES.map((s) => ({ x: s * 0.1, z: 0, y0: 0.56, y1: 0.8, r: 0.078 })),
        },
      }
    case 'girth':
      return {
        parts: [
          ['base', geo.cyl(0.2, 0.235, 0.74, 0.98)],
          ['belt', geo.cyl(0.205, 0.205, 0.98, 1.06)],
        ],
        hosts: { base: [{ x: 0, z: 0, y0: 0.78, y1: 0.95, r: 0.218 }] },
      }
    case 'helm':
      return {
        parts: [
          ['base', geo.dome(0.125, 1.64)],
          ['mask', geo.box(0.15, 0.09, 0.03, 0, 1.6, 0.11)],
          ...both('horns', (s) => geo.horn(s * 0.13, 1.74, -s * 0.7)),
        ],
        hosts: {},
      }
    case 'pauldrons':
      return {
        parts: [
          ...both('base', (s) => geo.sphere(0.105, s * 0.24, 1.42, 0, 0.75)),
          ...both('base', (s) => geo.cyl(0.1, 0.12, 1.3, 1.37, s * 0.26)),
        ],
        hosts: { base: SIDES.map((s) => ({ x: s * 0.24, z: 0, y0: 1.39, y1: 1.47, r: 0.1 })) },
      }
    case 'sleeves':
      return {
        parts: [
          ...both('shoulders', (s) => geo.sphere(0.085, s * 0.23, 1.42)),
          ...both('upper', (s) => geo.cyl(0.065, 0.06, 1.17, 1.38, s * 0.25)),
          ...both('lower', (s) => geo.cyl(0.06, 0.055, 0.94, 1.17, s * 0.25)),
        ],
        hosts: {},
      }
    case 'greaves':
      return {
        parts: both('base', (s) => geo.cyl(0.075, 0.065, 0.12, 0.5, s * 0.1)),
        hosts: {},
      }
    case 'suit':
      return {
        parts: [
          ['chest', geo.cyl(0.21, 0.18, 1.0, 1.47)],
          ['chest', geo.cyl(0.185, 0.18, 0.84, 1.0)],
          ...both('arms', (s) => geo.sphere(0.085, s * 0.23, 1.42)),
          ...both('arms', (s) => geo.cyl(0.065, 0.06, 0.94, 1.4, s * 0.25)),
          ...both('legs', (s) => geo.cyl(0.08, 0.07, 0.1, 0.84, s * 0.1)),
          ['helm', geo.dome(0.125, 1.64)],
        ],
        hosts: {},
      }
  }
}

// Stripes run upright on the front half of the host; studs sit in rows there.
function pattern(kind: 'stripes' | 'studs', hosts: readonly Host[]): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  const angles = [-1.1, -0.55, 0, 0.55, 1.1]
  for (const host of hosts) {
    const h = host.y1 - host.y0
    const rows = kind === 'studs' ? [0.2, 0.5, 0.8] : [0.5]
    for (const a of angles) {
      for (const row of rows) {
        const r = host.r + 0.004
        const x = host.x + Math.sin(a) * r
        const z = host.z + Math.cos(a) * r
        const y = host.y0 + h * row
        const mesh =
          kind === 'studs'
            ? geo.sphere(Math.min(0.018, host.r * 0.22), x, y, z)
            : geo.box(Math.min(0.014, host.r * 0.18), h, 0.01, x, y, z)
        mesh.rotation.y = a
        meshes.push(mesh)
      }
    }
  }
  return meshes
}

// The top of the figure's head (geo.sphere(0.1, 0, 1.65)) and of the helm's horns.
const HEAD_TOP = 1.83
const FRAME_MARGIN = 1.12
const MIN_FRAME_HEIGHT = 0.6

/** The upright cylinder around the axis that the view keeps in frame. */
export interface Frame {
  yMin: number
  yMax: number
  radius: number
}

/** The part of the model to keep in view: the piece and everything up to the top of the head. */
export function frameOf(model: THREE.Object3D, piece: THREE.Object3D): Frame {
  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(piece)
  const turn = model.rotation.y
  // Measure the radius unturned, so the frame does not depend on the angle.
  model.rotation.y = 0
  model.updateMatrixWorld(true)
  const whole = new THREE.Box3().setFromObject(model)
  model.rotation.y = turn
  model.updateMatrixWorld(true)
  let yMin = box.isEmpty() ? 0 : box.min.y
  let yMax = Math.max(HEAD_TOP, box.isEmpty() ? 0 : box.max.y)
  if (yMax - yMin < MIN_FRAME_HEIGHT) yMin = yMax - MIN_FRAME_HEIGHT
  const x = Math.max(-whole.min.x, whole.max.x)
  const z = Math.max(-whole.min.z, whole.max.z)
  return { yMin, yMax, radius: Math.hypot(x, z) }
}

/**
 * The camera height and distance that fit the frame at every turn, looking
 * level along -z at the axis, so the model stays centred while it turns.
 */
export function frameCamera(frame: Frame, fovDegrees: number, aspect: number): { y: number; z: number } {
  const tanV = Math.tan(THREE.MathUtils.degToRad(fovDegrees / 2))
  const tanH = tanV * aspect
  const half = (frame.yMax - frame.yMin) / 2
  // The nearest point of the cylinder is `radius` in front of the axis.
  const z = frame.radius + FRAME_MARGIN * Math.max(frame.radius / tanH, half / tanV)
  return { y: frame.yMin + half, z }
}

export interface ArmorScene {
  show(view: ArmorView): void
  turn(radians: number): void
  dispose(): void
}

/** Builds the scene on the canvas. Throws when the browser has no WebGL. */
export function createArmorScene(canvas: HTMLCanvasElement): ArmorScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xf2f4f8, 0x30343c, 1.6))
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(1.5, 2.5, 3)
  scene.add(key)

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20)
  const model = new THREE.Group()
  model.rotation.y = START_ANGLE
  scene.add(model)

  const figureMaterial = new THREE.MeshStandardMaterial({ color: FIGURE_COLOR, roughness: 0.9 })
  const neutralMaterial = new THREE.MeshStandardMaterial({ color: NEUTRAL_COLOR, roughness: 0.55, metalness: 0.2 })
  const colorMaterial = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 })
  for (const mesh of figure()) {
    mesh.material = figureMaterial
    model.add(mesh)
  }
  const piece = new THREE.Group()
  model.add(piece)
  let frame: Frame = { yMin: 0, yMax: HEAD_TOP, radius: 0.35 }

  function render() {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width === 0 || height === 0) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    const at = frameCamera(frame, camera.fov, camera.aspect)
    camera.position.set(0, at.y, at.z)
    camera.lookAt(0, at.y, 0)
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }

  const resize = new ResizeObserver(render)
  resize.observe(canvas)

  function clearPiece() {
    for (const child of [...piece.children]) {
      ;(child as THREE.Mesh).geometry.dispose()
      piece.remove(child)
    }
  }

  return {
    show(view) {
      clearPiece()
      colorMaterial.color.set(view.color)
      const { parts, hosts } = shape(view.piece)
      for (const [part, mesh] of parts) {
        mesh.material = view.colored.includes(part) ? colorMaterial : neutralMaterial
        piece.add(mesh)
      }
      if (view.pattern) {
        for (const mesh of pattern(view.pattern.kind, hosts[view.pattern.on] ?? [])) {
          mesh.material = colorMaterial
          piece.add(mesh)
        }
      }
      frame = frameOf(model, piece)
      render()
    },
    turn(radians) {
      model.rotation.y += radians
      render()
    },
    dispose() {
      resize.disconnect()
      clearPiece()
      for (const mesh of model.children) if (mesh instanceof THREE.Mesh) mesh.geometry.dispose()
      figureMaterial.dispose()
      neutralMaterial.dispose()
      colorMaterial.dispose()
      renderer.dispose()
      // dispose() alone keeps the WebGL context until garbage collection.
      renderer.forceContextLoss()
    },
  }
}
