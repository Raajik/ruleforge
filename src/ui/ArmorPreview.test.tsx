// @vitest-environment jsdom
// The armor preview component (specs/armor-preview.md). jsdom has no WebGL, so
// these tests stub WebGLRenderingContext and fake the three.js scene module.

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { armorView, basePaint, type ArmorView } from '../core/gamedata/armorpreview'
import type { LookSource } from '../core/gamedata/armorroll'
import type { Requirement } from '../core/format/profile'
import type { GameFiles } from './gameFiles'
import { ArmorPreview } from './ArmorPreview'

const scene = { show: vi.fn(), turn: vi.fn(), dispose: vi.fn() }
const createArmorScene = vi.fn((_canvas: HTMLCanvasElement) => scene)
vi.mock('./armorScene', () => ({ createArmorScene: (canvas: HTMLCanvasElement) => createArmorScene(canvas) }))

const color = { r: 0x30, g: 0x60, b: 0xc0, maxDifferenceH: 10, maxDifferenceSV: 0.1 }
const COAT_REQ: Requirement = { type: 15, ...color, armorGroup: 'Amuli Coat (Chest)' }
const COAT = armorView(COAT_REQ) as ArmorView

beforeEach(() => {
  vi.stubGlobal('WebGLRenderingContext', function WebGLRenderingContext() {})
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ArmorPreview with WebGL', () => {
  it('loads the scene, shows each new view and disposes it on unmount', async () => {
    const { rerender, unmount } = render(<ArmorPreview view={COAT} />)
    const canvas = screen.getByRole('img', { name: 'Amuli Coat, Chest in #3060C0' })
    await waitFor(() => expect(scene.show).toHaveBeenCalledWith(COAT, basePaint(COAT)))
    expect(createArmorScene).toHaveBeenCalledWith(canvas)
    const red = armorView({ type: 15, ...color, r: 255, armorGroup: 'Amuli Coat (Chest)' }) as ArmorView
    rerender(<ArmorPreview view={red} />)
    expect(scene.show).toHaveBeenLastCalledWith(red, basePaint(red))
    unmount()
    expect(scene.dispose).toHaveBeenCalledTimes(1)
  })

  it('turns the model with a drag and with the left and right arrow keys', async () => {
    render(<ArmorPreview view={COAT} />)
    const canvas = screen.getByRole('img')
    canvas.setPointerCapture = () => {}
    await waitFor(() => expect(scene.show).toHaveBeenCalled())
    fireEvent.pointerDown(canvas, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 150, pointerId: 1 })
    expect(scene.turn).toHaveBeenLastCalledWith(expect.closeTo(0.6))
    fireEvent.pointerUp(canvas, { pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 300, pointerId: 1 })
    expect(scene.turn).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(canvas, { key: 'ArrowLeft' })
    expect(scene.turn).toHaveBeenLastCalledWith(-Math.PI / 12)
    fireEvent.keyDown(canvas, { key: 'ArrowRight' })
    expect(scene.turn).toHaveBeenLastCalledWith(Math.PI / 12)
  })

  it('shows the text alternative when the scene cannot start', async () => {
    createArmorScene.mockImplementationOnce(() => {
      throw new Error('no WebGL context')
    })
    render(<ArmorPreview view={COAT} />)
    expect(await screen.findByText('Amuli Coat, Chest in #3060C0')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })
})

// The exact roll's source: one template (14, Red) whose chest is #3060C0 at
// every shade. Made-up colours, no game data.
const SOURCE: LookSource = {
  piece: async () => ({ templates: [{ id: 14, slots: [{ palettes: [7], entry: 0 }] }] }),
  colors: async (ids) => new Map([...ids].map((id) => [id, [0xff3060c0]])),
}
const SLOTS = new Map([['Amuli Coat (Chest)', [0]]])

function gameFiles(over: Partial<GameFiles> = {}): GameFiles {
  return { name: 'client_portal.dat', source: SOURCE, error: '', desktop: false, pickFile: vi.fn(), pickDesktop: vi.fn(), ...over }
}

describe('ArmorPreview Randomize', () => {
  it('rolls an approximate look without game files and says so', async () => {
    render(<ArmorPreview view={COAT} random={() => 0.42} />)
    fireEvent.click(screen.getByRole('button', { name: 'Randomize' }))
    expect(await screen.findByText('The colours are approximate.')).toBeTruthy()
    const canvas = screen.getByRole('img')
    expect(canvas.getAttribute('aria-label')).toBe('Amuli Coat, Chest in #3060C0, rolled as Grey at shade 0.42')
    // The scene shows the rolled paint: the rule colour on the chest, the template elsewhere.
    const [, paint] = scene.show.mock.lastCall!
    expect(paint.parts.chest).toBe('#3060C0')
    expect(paint.parts.arms).not.toBe(basePaint(COAT).parts.arms)
  })

  it('rolls an exact look from the game files for type 15', async () => {
    render(<ArmorPreview view={COAT} req={COAT_REQ} slots={SLOTS} gameFiles={gameFiles()} random={() => 0.5} />)
    expect(screen.getByText('Game files: client_portal.dat')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Randomize' }))
    await waitFor(() =>
      expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Amuli Coat, Chest in #3060C0, rolled as Red at shade 0.50'),
    )
    expect(screen.queryByText('The colours are approximate.')).toBeNull()
  })

  it('says when the armor never rolls the colour', async () => {
    const green = { ...COAT_REQ, r: 0, g: 255, b: 0 } as Requirement
    render(<ArmorPreview view={armorView(green)!} req={green} slots={SLOTS} gameFiles={gameFiles()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Randomize' }))
    expect(await screen.findByText('This armor never rolls this colour in Chest.')).toBeTruthy()
  })

  it('falls back to approximate colours when a read of the game files fails', async () => {
    const broken = gameFiles({ source: { ...SOURCE, piece: () => Promise.reject(new Error('gone')) } })
    render(<ArmorPreview view={COAT} req={COAT_REQ} slots={SLOTS} gameFiles={broken} />)
    fireEvent.click(screen.getByRole('button', { name: 'Randomize' }))
    expect(await screen.findByText('Could not read the game files. The colours are approximate.')).toBeTruthy()
  })

  it('drops a roll that ends after the view changed, and can roll again', async () => {
    let finish: (looks: null) => void = () => {}
    const slow = gameFiles({ source: { ...SOURCE, piece: () => new Promise((resolve) => (finish = resolve)) } })
    const { rerender } = render(<ArmorPreview view={COAT} req={COAT_REQ} slots={SLOTS} gameFiles={slow} />)
    fireEvent.click(screen.getByRole('button', { name: 'Randomize' }))
    const red = { ...COAT_REQ, r: 255 } as Requirement
    rerender(<ArmorPreview view={armorView(red)!} req={red} slots={SLOTS} gameFiles={slow} />)
    finish(null)
    await waitFor(() => expect((screen.getByRole('button', { name: 'Randomize' }) as HTMLButtonElement).disabled).toBe(false))
    expect(screen.queryByText('The colours are approximate.')).toBeNull()
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Amuli Coat, Chest in #FF60C0')
  })

  it('hands a picked file to the game files in the browser', () => {
    const files = gameFiles({ name: null, source: null })
    render(<ArmorPreview view={COAT} gameFiles={files} />)
    const file = new File([new Uint8Array(4)], 'client_portal.dat')
    fireEvent.change(screen.getByLabelText('client_portal.dat'), { target: { files: [file] } })
    expect(files.pickFile).toHaveBeenCalledWith(file)
  })
})
