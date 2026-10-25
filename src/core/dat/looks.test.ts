// The exact roll through a crafted DAT: a ClothingTable, a PaletteSet and two
// Palettes, all made up for the test, read by the real DAT reader.

import { describe, expect, it } from 'vitest'
import { craftPortal, memoryReader } from '../../test/craftDat'
import { armorView } from '../gamedata/armorpreview'
import { rollExact } from '../gamedata/armorroll'
import type { SimilarColorArmorTypeRequirement } from '../format/profile'
import { openPortalLooks } from './looks'

const SLOTS = new Map([
  ['None', []],
  ['Amuli Coat (Chest)', [0]],
])

function rule(r: number, g: number, b: number): SimilarColorArmorTypeRequirement {
  return { type: 15, r, g, b, maxDifferenceH: 10, maxDifferenceSV: 0.1, armorGroup: 'Amuli Coat (Chest)' }
}

describe('openPortalLooks on a crafted DAT', () => {
  it('rolls the matching shade of the piece, with the middle entry of the range as the colour', async () => {
    const dat = craftPortal()
    const source = await openPortalLooks(memoryReader(dat), dat.length)
    const red = rule(255, 0, 0)
    const roll = await rollExact(source, armorView(red)!, red, SLOTS, () => 0.5)
    expect(roll?.kind).toBe('look')
    if (roll?.kind !== 'look') return
    expect(roll.look.shade).toBeGreaterThanOrEqual(0.5)
    expect(roll.look.paint.parts.chest).toBe('#FF0000')
    const dark = rule(0x40, 0, 0)
    const darkRoll = await rollExact(source, armorView(dark)!, dark, SLOTS, () => 0.5)
    if (darkRoll?.kind !== 'look') throw new Error('expected a look')
    expect(darkRoll.look.shade).toBeLessThan(0.5)
    const green = rule(0, 255, 0)
    expect((await rollExact(source, armorView(green)!, green, SLOTS, () => 0.5))?.kind).toBe('never')
  })

  it('reads each file once across rolls', async () => {
    const dat = craftPortal()
    const read = memoryReader(dat)
    const source = await openPortalLooks(read, dat.length)
    const red = rule(255, 0, 0)
    await rollExact(source, armorView(red)!, red, SLOTS, Math.random)
    const calls = read.calls
    await rollExact(source, armorView(red)!, red, SLOTS, Math.random)
    expect(read.calls).toBe(calls)
  })
})
