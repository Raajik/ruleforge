// Tests for ComputedItemInfo port (PLAN.md H3b). Numbers computed by hand from the C#.

import { describe, expect, it } from 'vitest'
import { doubleValueKey, intValueKey } from '../gamedata/generated'
import type { LootItem } from './item'
import {
  calculateDamageOverTime,
  canReachTargetValues,
  getBuffedAverageDamage,
  getBuffedDoubleValueKey,
  getBuffedLogValueKey,
  getBuffedMissileDamage,
  getCalcedBuffedTinkedDamage,
  getTotalRatings,
} from './computed'

function item(over: Partial<LootItem> = {}): LootItem {
  return {
    objectClass: 0,
    intValues: {},
    doubleValues: {},
    stringValues: {},
    spells: [],
    spellIds: [],
    palettes: [],
    ...over,
  }
}

describe('ComputedItemInfo formulas', () => {
  it('CalculateDamageOverTime uses the formula from the C#', () => {
    // maxDamage * ((1 - critChance) * (2 - variance) / 2 + (critChance * critMultiplier))
    expect(calculateDamageOverTime(50, 0.25)).toBeCloseTo(50 * ((0.9) * (1.75) / 2 + (0.1 * 2)), 10)
    expect(calculateDamageOverTime(50, 0.25, 0.1, 2)).toBeCloseTo(50 * ((0.9) * (1.75) / 2 + 0.2), 10)
  })

  it('BuffedAverageDamage: (minDamage + maxDamage)/2, minDamage = maxDamage - variance*maxDamage', () => {
    const it1 = item({ intValues: { MaxDamage: 50 }, doubleValues: { Variance: 0.25 } })
    expect(getBuffedAverageDamage(it1)).toBeCloseTo((37.5 + 50) / 2, 10)
  })

  it('BuffedMissileDamage formula', () => {
    const it1 = item({ intValues: { MaxDamage: 50, ElementalDmgBonus: 0 }, doubleValues: { DamageBonus: 1.15 } })
    expect(getBuffedMissileDamage(it1)).toBeCloseTo(50 + (((1.15 - 1) * 100) / 3) + 0, 10)
  })

  it('GetBuffedLogValueKey adds only a non-zero Bonus (ComputedItemInfo.cs 275-276)', () => {
    // Blood Drinker VI has Change 20 and Bonus 0, so it adds nothing.
    expect(getBuffedLogValueKey(item({ intValues: { MaxDamage: 50 }, spellIds: [1616] }), intValueKey.MaxDamage)).toBe(50)
    // Minor Blood Thirst has Bonus 2.
    expect(getBuffedLogValueKey(item({ intValues: { MaxDamage: 50 }, spellIds: [2598] }), intValueKey.MaxDamage)).toBe(52)
    // A missing key gives the default, and no spell adds to it (line 266).
    expect(getBuffedLogValueKey(item({ spellIds: [2598] }), intValueKey.MaxDamage)).toBe(0)
  })

  it('GetBuffedDoubleValueKey adds a Bonus, or multiplies when (int)Change is 1 (lines 298-304)', () => {
    // Heart Seeker VI has Bonus 0: no change.
    expect(getBuffedDoubleValueKey(item({ doubleValues: { AttackBonus: 0.15 }, spellIds: [1592] }), doubleValueKey.AttackBonus)).toBe(0.15)
    // Minor Heart Thirst adds 0.03.
    expect(getBuffedDoubleValueKey(item({ doubleValues: { AttackBonus: 0.15 }, spellIds: [2603] }), doubleValueKey.AttackBonus)).toBeCloseTo(0.18, 12)
    // Feeble Hermetic Link: (int)1.05 is 1, so it multiplies by 1.05.
    expect(getBuffedDoubleValueKey(item({ doubleValues: { ManaCBonus: 1.6 }, spellIds: [3201] }), doubleValueKey.ManaCBonus)).toBeCloseTo(1.68, 12)
  })

  it('CalcedBuffedTinkedDamage tinks 9 times: granite twice, then iron (values from a separate Python copy)', () => {
    const it1 = item({ intValues: { MaxDamage: 50, Material: 1 }, doubleValues: { Variance: 0.2 } })
    // Not imbued, so 10 - 1 = 9 tinks. The result is DoT(57 + 24, 0.128).
    expect(getCalcedBuffedTinkedDamage(it1)).toBeCloseTo(84.4344, 10)
    // An item without a material cannot be tinked.
    expect(getCalcedBuffedTinkedDamage(item({ intValues: { MaxDamage: 50 }, doubleValues: { Variance: 0.2 } }))).toBeCloseTo(74 * 1.01, 10)
  })

  it('CanReachTargetValues spends tinks on defense, then attack, then damage', () => {
    const it1 = item({ intValues: { MaxDamage: 50, Material: 1 }, doubleValues: { Variance: 0.2, MeleeDefenseBonus: 0, AttackBonus: 0 } })
    // 3 tinks to defense, 2 to attack, 4 to damage: DoT(52 + 24, 0.128) = 79.2224.
    expect(canReachTargetValues(it1, 79.2, 0.03, 0.02)).toBe(true)
    expect(canReachTargetValues(it1, 79.3, 0.03, 0.02)).toBe(false)
  })

  it('BuffedMissileDamage adds the elemental bonus', () => {
    const it1 = item({ intValues: { MaxDamage: 50, ElementalDmgBonus: 5 }, doubleValues: { DamageBonus: 1.15 } })
    expect(getBuffedMissileDamage(it1)).toBeCloseTo(60, 10)
  })

  it('TotalRatings sums the 8 rating keys 370-376 and 379', () => {
    const ratings = { DamRating: 1, DamResistRating: 2, CritRating: 3, CritResistRating: 4, CritDamRating: 5, CritDamResistRating: 6, HealBoostRating: 7, VitalityRating: 8 }
    expect(getTotalRatings(item({ intValues: ratings }))).toBe(36)
  })
})
