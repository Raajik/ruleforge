// The Randomize roll (specs/armor-preview.md items 9-10) on crafted looks and
// palettes. No game data: the palettes here are made up.

import { describe, expect, it } from 'vitest'
import type { SimilarColorArmorTypeRequirement } from '../format/profile'
import { armorView, type ArmorView } from './armorpreview'
import {
  APPROXIMATE_TEMPLATES,
  matchingSpans,
  paletteIndex,
  pickSpan,
  rollApproximate,
  rollExact,
  templateName,
  type LookSource,
  type PieceLooks,
} from './armorroll'

const SLOTS = new Map<string, number[]>([
  ['None', []],
  ['Amuli Coat (Chest)', [0]],
  ['Amuli Coat (Collar/Shoulder)', [1]],
  ['Amuli Coat (Arms/Trim)', [3, 4]],
  ['My Robe (Base)', [0]],
])

// Template 14 (Red): the chest is dark red at shades below 0.5 and red above.
// Template 2 (Blue): the chest is blue at every shade. Slot 1 is grey.
const LOOKS: PieceLooks = {
  templates: [
    { id: 14, slots: [{ palettes: [101, 102], entry: 1 }, { palettes: [103], entry: 0 }] },
    { id: 2, slots: [{ palettes: [104], entry: 1 }, { palettes: [103], entry: 0 }] },
  ],
}
const COLORS = new Map<number, number[]>([
  [101, [0, 0xff400000]],
  [102, [0, 0xffff0000]],
  [103, [0xff808080]],
  [104, [0, 0xff0000ff]],
])

function source(looks: PieceLooks | null = LOOKS) {
  const asked: number[] = []
  const src: LookSource = {
    piece: async (id) => {
      asked.push(id)
      return looks
    },
    colors: async (ids) => new Map([...ids].map((id) => [id, COLORS.get(id) ?? []])),
  }
  return Object.assign(src, { asked })
}

function rule(hex: string, armorGroup = 'Amuli Coat (Chest)'): SimilarColorArmorTypeRequirement {
  const n = Number.parseInt(hex, 16)
  return { type: 15, r: n >> 16, g: (n >> 8) & 0xff, b: n & 0xff, maxDifferenceH: 10, maxDifferenceSV: 0.1, armorGroup }
}

function view(req: SimilarColorArmorTypeRequirement): ArmorView {
  return armorView(req)!
}

/** A random source that gives the values in turn. */
function sequence(...values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]!
}

describe('paletteIndex', () => {
  it('copies PaletteSet.GetPaletteID: (count - 0.000001) * shade, kept in the list', () => {
    expect(paletteIndex(7, 0)).toBe(0)
    expect(paletteIndex(7, 0.5)).toBe(3)
    expect(paletteIndex(7, 1)).toBe(6)
    expect(paletteIndex(1, 0.9)).toBe(0)
    expect(paletteIndex(4, -1)).toBe(0)
    expect(paletteIndex(4, 2)).toBe(3)
  })
})

describe('the exact roll on crafted looks', () => {
  it('gives only looks whose rule region matches: red rolls only template 14 at shades from 0.5', async () => {
    const req = rule('FF0000')
    const spans = matchingSpans(LOOKS, req, SLOTS, COLORS)
    expect(spans).toHaveLength(1)
    expect(spans[0]!.template).toBe(14)
    expect(spans[0]!.from).toBeCloseTo(0.5, 5)
    expect(spans[0]!.to).toBe(1)
    for (const r of [0, 0.3, 0.999]) {
      const roll = await rollExact(source(), view(req), req, SLOTS, sequence(r))
      if (roll?.kind !== 'look') throw new Error('expected a look')
      expect(roll.look.template).toBe(14)
      expect(roll.look.shade).toBeGreaterThanOrEqual(0.5)
      expect(roll.look.exact).toBe(true)
      expect(roll.look.paint.parts.chest).toBe('#FF0000')
      // The collar group's slot 1 takes its colour from the same template.
      expect(roll.look.paint.parts.collar).toBe('#808080')
      expect(roll.look.label).toMatch(/^Amuli Coat, Chest in #FF0000, rolled as Red at shade [01]\.\d\d$/)
    }
  })

  it('reads the piece by its ClothingTable id', async () => {
    const src = source()
    await rollExact(src, view(rule('FF0000')), rule('FF0000'), SLOTS, Math.random)
    expect(src.asked).toEqual([0x100001a1])
  })

  it('says the armor never rolls a colour that no template and shade gives', async () => {
    const req = rule('00FF00')
    expect(await rollExact(source(), view(req), req, SLOTS, Math.random)).toEqual({
      kind: 'never',
      message: 'This armor never rolls this colour in Chest.',
    })
  })

  it('gives null, for the approximate roll, when the game files cannot colour the region', async () => {
    // No known ClothingTable for the piece.
    const robe = rule('FF0000', 'My Robe (Base)')
    expect(await rollExact(source(), view(robe), robe, SLOTS, Math.random)).toBeNull()
    // The file has no such ClothingTable.
    const chest = rule('FF0000')
    expect(await rollExact(source(null), view(chest), chest, SLOTS, Math.random)).toBeNull()
    // The region's slots 3 and 4 are past the two slots of the templates.
    const arms = rule('FF0000', 'Amuli Coat (Arms/Trim)')
    expect(await rollExact(source(), view(arms), arms, SLOTS, Math.random)).toBeNull()
  })
})

describe('pickSpan', () => {
  it('weighs each span by its length, as every shade is equally likely', () => {
    const spans = [
      { template: 1, from: 0, to: 0.25 },
      { template: 2, from: 0.25, to: 1 },
    ]
    expect(pickSpan(spans, () => 0.2)).toEqual({ template: 1, shade: 0.2 })
    expect(pickSpan(spans, () => 0.5)).toEqual({ template: 2, shade: 0.5 })
    expect(pickSpan([], () => 0.5)).toBeNull()
  })
})

describe('the approximate roll', () => {
  it('keeps the rule colour on its region and gives the rest a named template and shade', () => {
    const v = view(rule('3060C0'))
    const look = rollApproximate(v, sequence(0, 0.42))
    expect(look.exact).toBe(false)
    expect(look.template).toBe(APPROXIMATE_TEMPLATES[0]!.id)
    expect(look.shade).toBe(0.42)
    expect(look.paint.parts.chest).toBe('#3060C0')
    expect(look.paint.parts.arms).not.toBe('#3060C0')
    expect(look.label).toBe('Amuli Coat, Chest in #3060C0, rolled as AquaBlue at shade 0.42')
  })

  it('names every template of the fixed list from the ACE names', () => {
    for (const t of APPROXIMATE_TEMPLATES) expect(templateName(t.id)).not.toMatch(/^Template /)
    expect(templateName(14)).toBe('Red')
    expect(templateName(500)).toBe('Template 500')
  })
})
