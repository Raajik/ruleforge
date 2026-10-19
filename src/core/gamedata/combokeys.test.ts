// Tests for the combo key lists and ID properties (T17). The C# is
// ref/shared/ComboKeys.cs (five sorted enum name lists, lines 42-168) and
// GameInfo.IsIDProperty in ref/shared/Constants.cs (lines 425-484).

import { describe, expect, it } from 'vitest'
import { indexFromKeyValue, isIdProperty, keyNames, keyValueFromIndex, type KeyKind } from './combokeys'
import { doubleValueKey, intValueKey, objectClass, stringValueKey, vtcSkillID } from './generated'

const enumsByKind = {
  svk: stringValueKey,
  lvk: intValueKey,
  dvk: doubleValueKey,
  oc: objectClass,
  skill: vtcSkillID,
} as const
const allKinds = Object.keys(enumsByKind) as KeyKind[]

describe('combo key lists', () => {
  it('has one entry per enum member', () => {
    expect(keyNames('svk')).toHaveLength(16)
    expect(keyNames('lvk')).toHaveLength(114)
    expect(keyNames('dvk')).toHaveLength(24)
    expect(keyNames('oc')).toHaveLength(43)
    expect(keyNames('skill')).toHaveLength(49)
  })

  it('sorts the names and keeps every member', () => {
    for (const kind of allKinds) {
      expect([...keyNames(kind)]).toEqual(Object.keys(enumsByKind[kind]).sort(new Intl.Collator('en').compare))
    }
  })

  it('sorts in culture order, not ordinal order, as Array.Sort does', () => {
    // Ordinal order puts DamRating first, because 'R' is before 'a'.
    const names = keyNames('lvk')
    expect(names.indexOf('DamageType')).toBeLessThan(names.indexOf('DamRating'))
  })

  it('checks the first and last SVK, LVK, DVK, OC and skill entries', () => {
    expect(keyNames('svk')[0]).toBe('DateBorn')
    expect(keyNames('svk').at(-1)).toBe('UsageInstructions')
    expect(keyNames('lvk')[0]).toBe('ActivationReqSkillId')
    expect(keyNames('lvk').at(-1)).toBe('XPForVPReduction')
    expect(keyNames('dvk')[0]).toBe('AcidProt')
    expect(keyNames('dvk').at(-1)).toBe('Variance')
    expect(keyNames('oc')[0]).toBe('Armor')
    expect(keyNames('oc').at(-1)).toBe('WandStaffOrb')
    expect(keyNames('skill')[0]).toBe('Alchemy')
    expect(keyNames('skill').at(-1)).toBe('WeaponTinkering')
  })

  it('maps index to value and back like the C# ComboKeys methods', () => {
    const lvkWorkmanship = keyNames('lvk').indexOf('Workmanship')
    expect(keyValueFromIndex('lvk', lvkWorkmanship)).toBe(intValueKey.Workmanship)
    expect(indexFromKeyValue('lvk', intValueKey.Workmanship)).toBe(lvkWorkmanship)
    const svkSecondaryName = keyNames('svk').indexOf('SecondaryName')
    expect(keyValueFromIndex('svk', svkSecondaryName)).toBe(stringValueKey.SecondaryName)
    expect(indexFromKeyValue('svk', stringValueKey.SecondaryName)).toBe(svkSecondaryName)
    expect(indexFromKeyValue('dvk', doubleValueKey.DamageBonus)).toBe(
      keyNames('dvk').indexOf('DamageBonus'),
    )
  })

  it('returns -1 for a value that no key has (C# IndexOf)', () => {
    expect(indexFromKeyValue('lvk', -1)).toBe(-1)
    expect(indexFromKeyValue('oc', 9999)).toBe(-1)
  })
})

describe('isIdProperty (GameInfo.IsIDProperty)', () => {
  it('treats only Name and SecondaryName as non-ID StringValueKeys', () => {
    expect(isIdProperty('svk', stringValueKey.Name)).toBe(false)
    expect(isIdProperty('svk', stringValueKey.SecondaryName)).toBe(false)
    expect(isIdProperty('svk', stringValueKey.DateBorn)).toBe(true)
  })

  it('marks 28 IntValueKeys as non-ID, the list in Constants.cs 435-474', () => {
    const nonId = keyNames('lvk').filter(
      (name) => !isIdProperty('lvk', (intValueKey as Record<string, number>)[name] as number),
    )
    expect(nonId).toHaveLength(28)
    expect(nonId).toContain('Value')
    expect(nonId).toContain('Material')
    expect(nonId).toContain('EquippedSlots')
    // Burden is commented out in the C#, so it stays an ID property.
    expect(isIdProperty('lvk', intValueKey.Burden)).toBe(true)
    expect(isIdProperty('lvk', intValueKey.Workmanship)).toBe(true)
  })

  it('treats only ApproachDistance and SalvageWorkmanship as non-ID DoubleValueKeys', () => {
    expect(isIdProperty('dvk', doubleValueKey.ApproachDistance)).toBe(false)
    expect(isIdProperty('dvk', doubleValueKey.SalvageWorkmanship)).toBe(false)
    expect(isIdProperty('dvk', doubleValueKey.DamageBonus)).toBe(true)
  })

  it('has no ID property for ObjectClass and VTCSkillID (always white)', () => {
    expect(isIdProperty('oc', objectClass.Armor)).toBe(false)
    expect(isIdProperty('skill', vtcSkillID.Axe)).toBe(false)
  })
})
