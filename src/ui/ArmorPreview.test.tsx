// @vitest-environment jsdom
// The armor preview component (specs/armor-preview.md). jsdom has no WebGL, so
// these tests stub WebGLRenderingContext and fake the three.js scene module.

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { armorView, type ArmorView } from '../core/gamedata/armorpreview'
import { ArmorPreview } from './ArmorPreview'

const scene = { show: vi.fn(), turn: vi.fn(), dispose: vi.fn() }
const createArmorScene = vi.fn((_canvas: HTMLCanvasElement) => scene)
vi.mock('./armorScene', () => ({ createArmorScene: (canvas: HTMLCanvasElement) => createArmorScene(canvas) }))

const color = { r: 0x30, g: 0x60, b: 0xc0, maxDifferenceH: 10, maxDifferenceSV: 0.1 }
const COAT = armorView({ type: 15, ...color, armorGroup: 'Amuli Coat (Chest)' }) as ArmorView

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
    await waitFor(() => expect(scene.show).toHaveBeenCalledWith(COAT))
    expect(createArmorScene).toHaveBeenCalledWith(canvas)
    const red = armorView({ type: 15, ...color, r: 255, armorGroup: 'Amuli Coat (Chest)' }) as ArmorView
    rerender(<ArmorPreview view={red} />)
    expect(scene.show).toHaveBeenLastCalledWith(red)
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
