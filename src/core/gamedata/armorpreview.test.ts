// Tests for the armor preview map (specs/armor-preview.md).

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Requirement } from '../format/profile'
import { armorGroupView, armorView, colorHex, PIECE_PARTS } from './armorpreview'
import { parseColorSlots } from './colorslots'

const fixtureXml = readFileSync(new URL('../../../fixtures/ColorSlots.Default.xml', import.meta.url), 'utf8')
const SLOT_NAMES = [...parseColorSlots(fixtureXml).keys()].filter((name) => name !== 'None')
const PATTERN_WORDS = /\b(Veins|Stripes|Lines|Bumps|Ornaments|Hilight|Circle)\b/

describe('armorGroupView on the shipped slot definitions', () => {
  it('reads 63 slot definitions to check', () => {
    expect(SLOT_NAMES).toHaveLength(63)
  })

  it.each(SLOT_NAMES)('maps %s to a piece and the region in its brackets', (name) => {
    const view = armorGroupView(name)
    // An unmapped group falls back to "every region", so the bracket text proves a map entry.
    expect(name).toContain(`(${view.region})`)
    expect(view.colored.length > 0 || view.pattern !== null).toBe(true)
    for (const part of view.colored) expect(PIECE_PARTS[view.piece]).toContain(part)
    if (view.pattern) expect(PIECE_PARTS[view.piece]).toContain(view.pattern.on)
    expect(view.pattern !== null).toBe(PATTERN_WORDS.test(view.region))
    expect(view.piece).not.toBe('suit')
  })

  it('gives each mapped group a piece that matches its name', () => {
    expect(armorGroupView('Amuli Coat (Chest)')).toMatchObject({ piece: 'coat', name: 'Amuli Coat', region: 'Chest' })
    expect(armorGroupView('Haebrean BP (Chest) *')).toMatchObject({ piece: 'breastplate', name: 'Haebrean BP' })
    expect(armorGroupView('Scalemail Cuirass (Bumps)')).toMatchObject({
      piece: 'breastplate',
      colored: [],
      pattern: { kind: 'studs', on: 'chest' },
    })
    expect(armorGroupView('Olthoi Koujia Kabuton (Horns)')).toMatchObject({ piece: 'helm', colored: ['horns'] })
    expect(armorGroupView('Nariyid Sleeves (Upper Arm)')).toMatchObject({ piece: 'sleeves', colored: ['upper'] })
    expect(armorGroupView('Lorica Legs (Knees/Belt/Crotch) *').colored).toEqual(['knees', 'belt', 'crotch'])
  })
})

describe('armorGroupView on a group that is not in the map', () => {
  it('shows the piece its name names, all in the colour', () => {
    expect(armorGroupView('Custom Greaves (Trim)')).toEqual({
      piece: 'greaves',
      name: 'Custom Greaves',
      region: 'every region',
      colored: PIECE_PARTS.greaves,
      pattern: null,
    })
    expect(armorGroupView('My Coat').piece).toBe('coat')
  })

  it('falls back to the generic suit when the name names no piece', () => {
    expect(armorGroupView('Something (Odd)')).toMatchObject({ piece: 'suit', name: 'Something', colored: PIECE_PARTS.suit })
    expect(armorGroupView('')).toMatchObject({ piece: 'suit', name: 'Armor suit' })
  })
})

describe('armorView', () => {
  const color = { r: 0x30, g: 0x60, b: 0xc0, maxDifferenceH: 10, maxDifferenceSV: 0.1 }

  it('type 15 shows the group piece with the text alternative', () => {
    const view = armorView({ type: 15, ...color, armorGroup: 'Amuli Coat (Chest)' })
    expect(view).toMatchObject({ piece: 'coat', colored: ['chest'], color: '#3060C0', note: null })
    expect(view?.label).toBe('Amuli Coat, Chest in #3060C0')
  })

  it('type 14 shows the generic suit in the colour', () => {
    const view = armorView({ type: 14, ...color })
    expect(view).toMatchObject({ piece: 'suit', colored: PIECE_PARTS.suit, note: null })
    expect(view?.label).toBe('Armor suit, every region in #3060C0')
  })

  it('type 16 shows the generic suit and the slot note', () => {
    const view = armorView({ type: 16, ...color, slot: 3 })
    expect(view).toMatchObject({ piece: 'suit', note: 'Slot 3: the region depends on the armor.' })
  })

  it('type 17 and other types get no view', () => {
    expect(armorView({ type: 17, slot: 3, palette: 100 })).toBeNull()
    expect(armorView({ type: 0, pattern: 'x' })).toBeNull()
    // A raw requirement keeps any type number but has no R, G, B fields.
    expect(armorView({ type: 15, data: 'x' } as Requirement)).toBeNull()
  })
})

describe('colorHex', () => {
  it('pads each channel and keeps it in 0-255', () => {
    expect(colorHex(0, 0, 255)).toBe('#0000FF')
    expect(colorHex(300, -4, 7)).toBe('#FF0007')
  })
})
