// Tests for the evaluator item input (PLAN.md H3a). The C# inputs are the
// GameItemInfo getters of ref/shared/LootRules.cs and the HSV helper of the
// similar-color types (AnySimilarColor.ColorToHSV, LootRules.cs 1887-1895,
// with System.Drawing.Color.GetHue inside it).

import { describe, expect, it } from 'vitest'
import { doubleValueKey, intValueKey, stringValueKey } from '../gamedata/generated'
import { colorToHSV, getValueDouble, getValueInt, getValueString, type LootItem } from './item'

function item(over: Partial<LootItem> = {}): LootItem {
  return {
    objectClass: 0,
    intValues: {},
    doubleValues: {},
    stringValues: {},
    spells: [],
    palettes: [],
    ...over,
  }
}

describe('the generated key enums', () => {
  it('gives every table a unique value, so number to name is unambiguous', () => {
    for (const table of [intValueKey, doubleValueKey, stringValueKey]) {
      const values = Object.values(table)
      expect(new Set(values).size).toBe(values.length)
    }
  })
})

describe('getValueInt', () => {
  it('reads the value keyed by the enum name of generated.ts', () => {
    const sword = item({ intValues: { Material: 131, Workmanship: 8 } })
    expect(getValueInt(sword, intValueKey.Material, 0)).toBe(131)
    expect(getValueInt(sword, intValueKey.Workmanship, 0)).toBe(8)
  })

  it('falls back to the default of the C# call for a value the item lacks', () => {
    // The Match methods call GetValueInt(vk, 0) (LootRules.cs 434).
    expect(getValueInt(item(), intValueKey.Material, 0)).toBe(0)
    expect(getValueInt(item({ intValues: { Material: 5 } }), intValueKey.Material, 7)).toBe(5)
  })

  it('falls back to the default for a key that is not an IntValueKey of generated.ts', () => {
    expect(getValueInt(item({ intValues: { Material: 5 } }), 999999, 3)).toBe(3)
  })
})

describe('getValueDouble', () => {
  it('reads the value keyed by the enum name and falls back to the default', () => {
    const bow = item({ doubleValues: { Variance: 0.25 } })
    expect(getValueDouble(bow, doubleValueKey.Variance, 0)).toBe(0.25)
    expect(getValueDouble(item(), doubleValueKey.Variance, 0.5)).toBe(0.5)
    expect(getValueDouble(item(), 999999, 2)).toBe(2)
  })
})

describe('getValueString', () => {
  it('reads the value keyed by the enum name and falls back to the default', () => {
    const named = item({ stringValues: { Name: 'Some Sword' } })
    expect(getValueString(named, stringValueKey.Name, '')).toBe('Some Sword')
    expect(getValueString(item(), stringValueKey.Name, '')).toBe('')
    expect(getValueString(item(), 999999, 'x')).toBe('x')
  })
})

describe('colorToHSV', () => {
  // System.Drawing.Color.GetHue gives 0 to 360, in float math.
  it('gives the standard hues of the pure colors', () => {
    expect(colorToHSV({ r: 255, g: 0, b: 0 }).hue).toBe(0)
    expect(colorToHSV({ r: 255, g: 255, b: 0 }).hue).toBe(60)
    expect(colorToHSV({ r: 0, g: 255, b: 0 }).hue).toBe(120)
    expect(colorToHSV({ r: 0, g: 255, b: 255 }).hue).toBe(180)
    expect(colorToHSV({ r: 0, g: 0, b: 255 }).hue).toBe(240)
    expect(colorToHSV({ r: 255, g: 0, b: 255 }).hue).toBe(300)
  })

  it('gives 0 hue for a gray, as r == g == b short-circuits GetHue', () => {
    expect(colorToHSV({ r: 128, g: 128, b: 128 }).hue).toBe(0)
  })

  it('computes hue, saturation and value like ColorToHSV', () => {
    // ss = s - st, vv = v - vt: red vs a near red with half the range.
    const red = colorToHSV({ r: 255, g: 0, b: 0 })
    expect(red).toEqual({ hue: 0, saturation: 1, value: 1 })
    // GetHue of (255, 0, 128) in float math: 329.88235092163086.
    const pinkish = colorToHSV({ r: 255, g: 0, b: 128 })
    expect(pinkish.hue).toBeCloseTo(329.88235, 4)
    expect(pinkish.saturation).toBe(1)
    // max == 0 gives saturation 0 and value 0 (LootRules.cs 1893-1894).
    expect(colorToHSV({ r: 0, g: 0, b: 0 })).toEqual({ hue: 0, saturation: 0, value: 0 })
  })
})
