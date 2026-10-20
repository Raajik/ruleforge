// Tests for the requirement field editor (T28). The fields copy the UI_*
// methods of each requirement type in ref/shared/LootRules.cs, and the
// setters copy the field handlers in ref/editor/Form1.cs 656-769. The exact
// lines are in the header of reqfields.ts.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eLootRuleType } from '../format/enums'
import type { Requirement } from '../format/profile'
import { readProfile } from '../format/profile'
import { parseColorSlots } from '../gamedata/colorslots'
import { indexFromKeyValue, keyNames, keyValueFromIndex } from '../gamedata/combokeys'
import { doubleValueKey, intValueKey, stringValueKey } from '../gamedata/generated'
import { requirementFields, setActsOn, setTextValue, type ReqField } from './reqfields'
import { defaultRequirement } from './rules'

const ARMOR_GROUPS = [...parseColorSlots(readFileSync('fixtures/ColorSlots.Default.xml', 'utf8')).keys()]

function field<K extends ReqField['id']>(req: Requirement, id: K): (ReqField & { id: K }) | undefined {
  return requirementFields(req, ARMOR_GROUPS).find((f) => f.id === id) as (ReqField & { id: K }) | undefined
}

describe('requirementFields', () => {
  it('shows the single text field of SpellNameMatch', () => {
    // LootRules.cs 337-340: "Spell Name Pattern".
    expect(requirementFields({ type: 0, pattern: 'Epic ' })).toEqual([
      { id: 'value1', kind: 'text', label: 'Spell Name Pattern', value: 'Epic ' },
    ])
  })

  it('shows the acts-on combo and the value of LongValKeyGE', () => {
    // LootRules.cs 639-648: "Acts on" with the LVK list, "Long Value".
    const req: Requirement = { type: eLootRuleType.LongValKeyGE, keyval: 25, vk: intValueKey.Material }
    expect(field(req, 'actsOn')).toEqual({
      id: 'actsOn',
      kind: 'select',
      label: 'Acts on',
      options: keyNames('lvk'),
      value: indexFromKeyValue('lvk', intValueKey.Material),
    })
    expect(field(req, 'value1')).toEqual({ id: 'value1', kind: 'text', label: 'Long Value', value: '25' })
  })

  it('has at least one field for each of the 31 creatable types', () => {
    let count = 0
    for (const type of Object.values(eLootRuleType)) {
      const req = defaultRequirement(type)
      if (!req) continue
      count += 1
      expect(requirementFields(req, ARMOR_GROUPS).length).toBeGreaterThan(0)
    }
    expect(count).toBe(31)
  })

  it('shows the status combo of DisabledRule', () => {
    // LootRules.cs 1866-1870: "Status", Disabled first.
    expect(field({ type: 9999, b: true }, 'actsOn')).toEqual({
      id: 'actsOn',
      kind: 'select',
      label: 'Status',
      options: ['Disabled', 'Enabled'],
      value: 0,
    })
    expect(field({ type: 9999, b: false }, 'actsOn')!.value).toBe(1)
  })

  it('shows the four text fields of SlotSimilarColor', () => {
    // LootRules.cs 2269-2287: the fourth field is labelled "Palette Entry #"
    // but it holds Slot, not the palette.
    const req: Requirement = { type: 16, r: 1, g: 2, b: 3, maxDifferenceH: 10, maxDifferenceSV: 0.1, slot: 7 }
    expect(
      requirementFields(req)
        .filter((f) => f.kind === 'text')
        .map((f) => [f.id, f.label, (f as { value: string }).value]),
    ).toEqual([
      ['value1', 'RGB color value (hex)', '10203'],
      ['value2', 'Max diff (Hue 0-255)', '10'],
      ['value3', 'Max diff (S/V 0-1)', '0.1'],
      ['value4', 'Palette Entry #', '7'],
    ])
  })

  it('shows the palette fields of SlotExactPalette', () => {
    // LootRules.cs 2352-2360: value1 is the entry, value2 the palette id in hex.
    const req: Requirement = { type: 17, slot: 5, palette: 0xff00 }
    expect(field(req, 'value1')).toEqual({ id: 'value1', kind: 'text', label: 'Palette Entry #', value: '5' })
    expect(field(req, 'value2')).toEqual({ id: 'value2', kind: 'text', label: 'Palette ID', value: 'FF00' })
  })

  it('lists the armor groups of the color slot file for type 15', () => {
    // LootRules.cs 2148-2152: "Armor Type/Color Region" over ArmorGroups(),
    // the slot definition names. The T18 default armorGroup is empty, so the
    // combo starts with nothing selected.
    const req = defaultRequirement(eLootRuleType.SimilarColorArmorType)!
    expect(ARMOR_GROUPS[0]).toBe('None')
    const actsOn = field(req, 'actsOn')!
    expect(actsOn.label).toBe('Armor Type/Color Region')
    expect(actsOn.options).toEqual(ARMOR_GROUPS)
    expect(actsOn.value).toBe(-1)
  })

  it('shows the fixed buffed key lists of types 2003 and 2005', () => {
    // LootRules.cs 2566-2567 and 2640-2641: two and four entries, in this order.
    expect(field({ type: 2003, keyval: 0, vk: intValueKey.MaxDamage }, 'actsOn')).toEqual({
      id: 'actsOn',
      kind: 'select',
      label: 'Acts on',
      options: ['ArmorLevel', 'MaxDamage'],
      value: 1,
    })
    expect(field({ type: 2005, keyval: 0, vk: doubleValueKey.ManaCBonus }, 'actsOn')).toEqual({
      id: 'actsOn',
      kind: 'select',
      label: 'Acts on',
      options: ['AttackBonus', 'ElementalDamageVersusMonsters', 'ManaCBonus', 'MeleeDefenseBonus'],
      value: 2,
    })
  })

  it('shows a color sample for the three similar color types only', () => {
    const color: Requirement = { type: 14, r: 255, g: 0, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1 }
    expect(field(color, 'colorSample')).toEqual({ id: 'colorSample', kind: 'color', label: 'Color sample', value: '#FF0000' })
    const armor: Requirement = { type: 15, r: 0, g: 0, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1, armorGroup: 'None' }
    expect(field(armor, 'colorSample')).toBeTruthy()
    const slot: Requirement = { type: 16, r: 0, g: 0, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1, slot: 0 }
    expect(field(slot, 'colorSample')).toBeTruthy()
    expect(field({ type: 17, slot: 0, palette: 0 }, 'colorSample')).toBeUndefined()
  })

  it('shows no fields for an unsupported requirement', () => {
    expect(requirementFields({ type: -1, data: 'x'})).toEqual([])
    expect(requirementFields({ type: 12345, data: 'x' })).toEqual([])
  })
})

describe('setTextValue', () => {
  it('parses a long value like C# int.TryParse: an invalid text gives 0', () => {
    const req: Requirement = { type: 3, keyval: 25, vk: intValueKey.Material }
    expect(setTextValue(req, 'value1', '42')).toEqual({ ...req, keyval: 42 })
    expect(setTextValue(req, 'value1', ' -7 ')).toEqual({ ...req, keyval: -7 })
    expect(setTextValue(req, 'value1', '5.5')).toEqual({ ...req, keyval: 0 })
    expect(setTextValue(req, 'value1', 'abc')).toEqual({ ...req, keyval: 0 })
    expect(setTextValue(req, 'value1', '')).toEqual({ ...req, keyval: 0 })
    expect(req).toEqual({ type: 3, keyval: 25, vk: intValueKey.Material }) // input unchanged
  })

  it('parses a double value like the editor double.TryParse', () => {
    const req: Requirement = { type: 5, keyval: 0.5, vk: doubleValueKey.AcidProt }
    expect(setTextValue(req, 'value1', '1.5')).toEqual({ ...req, keyval: 1.5 })
    // The editor on a comma culture reads "1,5" as one and a half.
    expect(setTextValue(req, 'value1', '1,5')).toEqual({ ...req, keyval: 1.5 })
    expect(setTextValue(req, 'value1', 'abc')).toEqual({ ...req, keyval: 0 })
    expect(field(req, 'value1')!.value).toBe('0.5')
    expect(field({ ...req, keyval: 1e-5 }, 'value1')!.value).toBe('1E-05')
  })

  it('keeps a regex field as text and never compiles it (PLAN.md Traps)', () => {
    const spell: Requirement = { type: 0, pattern: 'x(' }
    expect(setTextValue(spell, 'value1', 'a(')).toEqual({ type: 0, pattern: 'a(' })
    const match: Requirement = { type: 9, rxDoesMatch: '', rxDoesNotMatch: '', count: 1 }
    expect(setTextValue(match, 'value2', 'a(')).toEqual({ ...match, rxDoesNotMatch: 'a(' })
    expect(setTextValue(match, 'value3', '3')).toEqual({ ...match, count: 3 })
  })

  it('reads an RGB hex color into R, G and B, an invalid text gives black', () => {
    const req: Requirement = { type: 14, r: 255, g: 255, b: 255, maxDifferenceH: 10, maxDifferenceSV: 0.1 }
    expect(setTextValue(req, 'value1', 'FF0000')).toEqual({ ...req, r: 255, g: 0, b: 0 })
    expect(setTextValue(req, 'value1', '1 abc')).toEqual({ ...req, r: 0, g: 0, b: 0 })
  })

  it('parses the palette id as hex and shows it masked to 24 bits', () => {
    const req: Requirement = { type: 17, slot: 5, palette: 0xffff00 }
    expect(setTextValue(req, 'value2', 'ff')).toEqual({ ...req, palette: 255 })
    // C# int parse of 8 hex digits is two's complement (LootRules.cs 2354).
    expect(setTextValue(req, 'value2', 'FFFFFFFF')).toEqual({ ...req, palette: -1 })
    expect(field({ ...req, palette: -1 }, 'value2')!.value).toBe('FFFFFF')
  })

  it('sets the slot of type 16 through its fourth field', () => {
    const req: Requirement = { type: 16, r: 0, g: 0, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1, slot: 1 }
    expect(setTextValue(req, 'value4', '9')).toEqual({ ...req, slot: 9 })
  })

  it('sets the min and max skill of CharacterBaseSkill', () => {
    const req: Requirement = { type: 1004, vk: 38, minskill: 0, maxskill: 100 }
    expect(setTextValue(req, 'value1', '50')).toEqual({ ...req, minskill: 50 })
    expect(setTextValue(req, 'value2', '99')).toEqual({ ...req, maxskill: 99 })
  })

  it('ignores a field the type does not show', () => {
    const req: Requirement = { type: 0, pattern: 'x' }
    expect(setTextValue(req, 'value3', '5')).toBe(req)
  })
})

describe('setActsOn', () => {
  it('sets the key of a LongValKeyGE from the combo index', () => {
    const req: Requirement = { type: 3, keyval: 1, vk: intValueKey.Material }
    const next = setActsOn(req, 0)
    expect(next).toEqual({ ...req, vk: keyValueFromIndex('lvk', 0) })
    expect(setActsOn(next, indexFromKeyValue('lvk', intValueKey.Material))).toEqual(req)
  })

  it('sets the StringValueMatch key, which lives in `key`, not in `vk`', () => {
    const req: Requirement = { type: 1, pattern: 'x', key: stringValueKey.FullDescription }
    expect(field(req, 'actsOn')!.value).toBe(indexFromKeyValue('svk', stringValueKey.FullDescription))
    const next = setActsOn(req, 0)
    expect(next).toEqual({ ...req, key: keyValueFromIndex('svk', 0) })
    expect(field(next, 'actsOn')!.value).toBe(0)
  })

  it('sets DisabledRule from the status combo', () => {
    expect(setActsOn({ type: 9999, b: false }, 0)).toEqual({ type: 9999, b: true })
    expect(setActsOn({ type: 9999, b: true }, 1)).toEqual({ type: 9999, b: false })
  })

  it('sets the armor group of type 15 from the color slot names', () => {
    const req: Requirement = { type: 15, r: 0, g: 0, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1, armorGroup: 'None' }
    expect(setActsOn(req, 2, ARMOR_GROUPS)).toEqual({ ...req, armorGroup: ARMOR_GROUPS[2] })
  })

  it('throws on an index the combo cannot give, like the C# list indexer', () => {
    expect(() => setActsOn({ type: 2003, keyval: 0, vk: 0 }, 99)).toThrow(RangeError)
    expect(() => setActsOn({ type: 15, r: 0, g: 0, b: 0, maxDifferenceH: 0, maxDifferenceSV: 0, armorGroup: '' }, 99)).toThrow(RangeError)
    expect(() => setActsOn({ type: 3, keyval: 0, vk: 0 }, 99999)).toThrow(RangeError)
  })
})

describe('real requirements', () => {
  function expectShownAndReset(fixture: string, types: number[]): void {
    const profile = readProfile(readFileSync(fixture, 'utf8'))
    let seen = 0
    for (const rule of profile.rules) {
      for (const req of rule.requirements) {
        if (!types.includes(req.type)) continue
        seen += 1
        const value = field(req, 'value1')!.value
        expect(setTextValue(req, 'value1', value)).toEqual(req)
        const actsOn = field(req, 'actsOn')!
        expect(setActsOn(req, actsOn.value)).toEqual(req)
      }
    }
    expect(seen).toBeGreaterThan(0)
  }

  it('shows and re-sets the real LongValKey* requirements of IAC_Level_NoCash.utl', () => {
    expectShownAndReset('fixtures/IAC_Level_NoCash.utl', [2, 3, 12, 13])
  })

  it('shows and re-sets the real StringValueMatch requirements of UnfamilarShores.utl', () => {
    expectShownAndReset('fixtures/UnfamilarShores.utl', [1])
  })
})
