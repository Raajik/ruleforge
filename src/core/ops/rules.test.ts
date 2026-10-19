// Tests for the rule and requirement edits (T18). The C# is ref/editor/Form1.cs
// and ref/editor/Macros.cs; the exact lines are in the header of rules.ts.

import { describe, expect, it } from 'vitest'
import { eLootAction, eLootRuleType } from '../format/enums'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { readProfile, writeProfile } from '../format/profile'
import { doubleValueKey, intValueKey, objectClass, stringValueKey, vtcSkillID } from '../gamedata/generated'
import {
  cloneRequirement,
  cloneRule,
  defaultRequirement,
  deleteRequirement,
  deleteRule,
  moveRule,
  newRequirement,
  newRule,
  setKeepCount,
  setRequirementType,
  setRuleAction,
  setRuleName,
  toggleDisabled,
} from './rules'

function rule(name: string, requirements: Requirement[] = [], over: Partial<LootRule> = {}): LootRule {
  return { name, customExpression: '', priority: 0, action: eLootAction.Keep, lootActionData: 0, requirements, ...over }
}

function profile(...rules: LootRule[]): LootProfile {
  return { version: 1, rules, extraBlocks: [] }
}

/** A deep copy, to check that an op does not change its input. */
function copy(p: LootProfile): LootProfile {
  return JSON.parse(JSON.stringify(p)) as LootProfile
}

const names = (p: LootProfile): string[] => p.rules.map((r) => r.name)

describe('defaultRequirement', () => {
  it('makes the C# field defaults of each type', () => {
    expect(defaultRequirement(eLootRuleType.SpellNameMatch)).toEqual({ type: 0, pattern: '' })
    expect(defaultRequirement(eLootRuleType.StringValueMatch)).toEqual({
      type: 1,
      pattern: '',
      key: stringValueKey.FullDescription,
    })

    const keyed = (type: number, vk: number) => ({ type, keyval: 0, vk })
    for (const type of [
      eLootRuleType.LongValKeyLE,
      eLootRuleType.LongValKeyGE,
      eLootRuleType.LongValKeyFlagExists,
      eLootRuleType.LongValKeyE,
      eLootRuleType.LongValKeyNE,
    ]) {
      expect(defaultRequirement(type)).toEqual(keyed(type, intValueKey.ActivationReqSkillId))
    }
    for (const type of [eLootRuleType.DoubleValKeyLE, eLootRuleType.DoubleValKeyGE]) {
      expect(defaultRequirement(type)).toEqual(keyed(type, doubleValueKey.AcidProt))
    }
    expect(defaultRequirement(eLootRuleType.BuffedLongValKeyGE)).toEqual(keyed(2003, intValueKey.MaxDamage))
    expect(defaultRequirement(eLootRuleType.BuffedDoubleValKeyGE)).toEqual(keyed(2005, doubleValueKey.AttackBonus))
    expect(defaultRequirement(eLootRuleType.CharacterSkillGE)).toEqual(keyed(1000, vtcSkillID.Alchemy))

    for (const type of [
      eLootRuleType.DamagePercentGE,
      eLootRuleType.SpellCountGE,
      eLootRuleType.MinDamageGE,
      eLootRuleType.CharacterMainPackEmptySlotsGE,
      eLootRuleType.CharacterLevelGE,
      eLootRuleType.CharacterLevelLE,
      eLootRuleType.BuffedMedianDamageGE,
      eLootRuleType.BuffedMissileDamageGE,
      eLootRuleType.CalcdBuffedTinkedDamageGE,
      eLootRuleType.TotalRatingsGE,
    ]) {
      expect(defaultRequirement(type)).toEqual({ type, keyval: 0 })
    }

    expect(defaultRequirement(eLootRuleType.ObjectClass)).toEqual({ type: 7, vk: objectClass.Armor })
    expect(defaultRequirement(eLootRuleType.SpellMatch)).toEqual({
      type: 9,
      rxDoesMatch: '',
      rxDoesNotMatch: '',
      count: 1,
    })
    expect(defaultRequirement(eLootRuleType.CharacterBaseSkill)).toEqual({
      type: 1004,
      vk: vtcSkillID.Alchemy,
      minskill: 0,
      maxskill: 0,
    })
    expect(defaultRequirement(eLootRuleType.CalcedBuffedTinkedTargetMeleeGE)).toEqual({
      type: 2008,
      dot: 0,
      meleeDefenseBonus: 0,
      attackBonus: 0,
    })

    // System.Drawing.Color.White is R 255, G 255, B 255.
    const color = { r: 255, g: 255, b: 255, maxDifferenceH: 10, maxDifferenceSV: 0.1 }
    expect(defaultRequirement(eLootRuleType.AnySimilarColor)).toEqual({ type: 14, ...color })
    expect(defaultRequirement(eLootRuleType.SimilarColorArmorType)).toEqual({ type: 15, ...color, armorGroup: '' })
    expect(defaultRequirement(eLootRuleType.SlotSimilarColor)).toEqual({ type: 16, ...color, slot: 0 })
    expect(defaultRequirement(eLootRuleType.SlotExactPalette)).toEqual({ type: 17, slot: 0, palette: 0 })

    expect(defaultRequirement(eLootRuleType.DisabledRule)).toEqual({ type: 9999, b: true })
  })

  it('has no default for the unsupported type or an unknown type number', () => {
    expect(defaultRequirement(eLootRuleType.UnsupportedRequirement)).toBeNull()
    expect(defaultRequirement(123)).toBeNull()
  })
})

describe('newRule', () => {
  it('appends a new Keep rule named "New Rule"', () => {
    const after = newRule(profile(rule('A')))
    expect(names(after)).toEqual(['A', 'New Rule'])
    expect(after.rules[1]).toEqual(rule('New Rule'))
  })

  it('inserts after the given rule', () => {
    expect(names(newRule(profile(rule('A'), rule('B')), 0))).toEqual(['A', 'New Rule', 'B'])
  })

  it('does not change the input', () => {
    const before = profile(rule('A'))
    const snapshot = copy(before)
    newRule(before, 0)
    expect(before).toEqual(snapshot)
  })
})

describe('cloneRule', () => {
  const source = rule(
    'A',
    [{ type: 2, keyval: 5, vk: 1 }],
    { customExpression: 'x', priority: 3, action: eLootAction.Salvage, lootActionData: 7 },
  )

  it('copies the name, the action and the requirements only', () => {
    // The legacy clone builds a fresh cLootItemRule, so priority, custom
    // expression and keep count go back to their defaults (Form1.cs 481-496).
    const after = cloneRule(profile(source), 0)
    expect(after.rules[1]).toEqual(rule('A', [{ type: 2, keyval: 5, vk: 1 }], { action: eLootAction.Salvage }))
  })

  it('gives the copy its own requirement list', () => {
    const after = cloneRule(profile(source), 0)
    expect(after.rules[1]?.requirements[0]).not.toBe(source.requirements[0])
  })

  it('inserts after the given rule', () => {
    expect(names(cloneRule(profile(rule('A'), rule('B')), 0, 0))).toEqual(['A', 'A', 'B'])
  })

  it('does nothing for a bad index', () => {
    const before = profile(source)
    expect(cloneRule(before, 3)).toEqual(before)
  })
})

describe('deleteRule', () => {
  it('removes the rule at the index', () => {
    expect(names(deleteRule(profile(rule('A'), rule('B')), 0))).toEqual(['B'])
  })

  it('does nothing for a bad index', () => {
    const before = profile(rule('A'))
    expect(deleteRule(before, -1)).toEqual(before)
    expect(deleteRule(before, 1)).toEqual(before)
  })
})

describe('moveRule', () => {
  it('moves a rule down and up by one', () => {
    expect(names(moveRule(profile(rule('A'), rule('B'), rule('C')), 0, 1))).toEqual(['B', 'A', 'C'])
    expect(names(moveRule(profile(rule('A'), rule('B'), rule('C')), 2, -1))).toEqual(['A', 'C', 'B'])
  })

  it('moves three positions for a Ctrl click', () => {
    const p = profile(rule('A'), rule('B'), rule('C'), rule('D'), rule('E'))
    expect(names(moveRule(p, 0, 3))).toEqual(['B', 'C', 'D', 'A', 'E'])
    expect(names(moveRule(p, 4, -3))).toEqual(['A', 'E', 'B', 'C', 'D'])
  })

  it('stops at the ends, as the repeated C# call does', () => {
    const p = profile(rule('A'), rule('B'), rule('C'))
    expect(names(moveRule(p, 0, -1))).toEqual(['A', 'B', 'C'])
    expect(names(moveRule(p, 2, 5))).toEqual(['A', 'B', 'C'])
    expect(names(moveRule(p, 1, 9))).toEqual(['A', 'C', 'B'])
  })

  it('does nothing for a bad index or a zero offset', () => {
    const before = profile(rule('A'))
    expect(moveRule(before, 0, 0)).toEqual(before)
    expect(moveRule(before, 2, 1)).toEqual(before)
  })
})

describe('newRequirement', () => {
  it('appends a SpellNameMatch requirement', () => {
    const after = newRequirement(profile(rule('A', [{ type: 7, vk: 2 }])), 0)
    expect(after.rules[0]?.requirements).toEqual([{ type: 7, vk: 2 }, { type: 0, pattern: '' }])
  })

  it('inserts after the given requirement', () => {
    const p = profile(rule('A', [{ type: 7, vk: 2 }, { type: 8, keyval: 1 }]))
    expect(newRequirement(p, 0, 0).rules[0]?.requirements.map((r) => r.type)).toEqual([7, 0, 8])
  })

  it('does nothing for a bad rule index', () => {
    const before = profile(rule('A'))
    expect(newRequirement(before, 1)).toEqual(before)
  })
})

describe('cloneRequirement', () => {
  it('copies the requirement into a new object', () => {
    const source: Requirement = { type: 9, rxDoesMatch: 'a', rxDoesNotMatch: '', count: 2 }
    const p = profile(rule('A', [source]))
    const after = cloneRequirement(p, 0, 0)
    expect(after.rules[0]?.requirements).toEqual([source, source])
    expect(after.rules[0]?.requirements[1]).not.toBe(source)
  })

  it('inserts after the given requirement', () => {
    const p = profile(rule('A', [{ type: 7, vk: 2 }, { type: 8, keyval: 1 }]))
    expect(cloneRequirement(p, 0, 0, 0).rules[0]?.requirements.map((r) => r.type)).toEqual([7, 7, 8])
  })

  it('does nothing for a bad index', () => {
    const before = profile(rule('A', [{ type: 7, vk: 2 }]))
    expect(cloneRequirement(before, 0, 5)).toEqual(before)
  })
})

describe('deleteRequirement', () => {
  it('removes the requirement at the index', () => {
    const p = profile(rule('A', [{ type: 7, vk: 2 }, { type: 8, keyval: 1 }]))
    expect(deleteRequirement(p, 0, 0).rules[0]?.requirements).toEqual([{ type: 8, keyval: 1 }])
  })

  it('does nothing for a bad index', () => {
    const before = profile(rule('A', [{ type: 7, vk: 2 }]))
    expect(deleteRequirement(before, 0, 1)).toEqual(before)
  })
})

describe('setRuleName', () => {
  it('changes only the name', () => {
    const before = profile(rule('A', [{ type: 7, vk: 2 }]))
    const after = setRuleName(before, 0, 'B')
    expect(after.rules[0]?.name).toBe('B')
    expect(after.rules[0]?.requirements).toEqual([{ type: 7, vk: 2 }])
    expect(before.rules[0]?.name).toBe('A')
  })
})

describe('setRuleAction', () => {
  it('changes the action and keeps the keep count', () => {
    const after = setRuleAction(profile(rule('A', [], { action: eLootAction.Keep, lootActionData: 5 })), 0, eLootAction.KeepUpTo)
    expect(after.rules[0]?.action).toBe(eLootAction.KeepUpTo)
    expect(after.rules[0]?.lootActionData).toBe(5)
  })
})

describe('setKeepCount', () => {
  it('sets the keep count of a KeepUpTo rule', () => {
    const p = profile(rule('A', [], { action: eLootAction.KeepUpTo }))
    expect(setKeepCount(p, 0, 4).rules[0]?.lootActionData).toBe(4)
    expect(setKeepCount(p, 0, -2).rules[0]?.lootActionData).toBe(-2)
  })
})

describe('setRequirementType', () => {
  it('replaces the requirement with the default of the new type', () => {
    const p = profile(rule('A', [{ type: 7, vk: 2 }]))
    expect(setRequirementType(p, 0, 0, eLootRuleType.SpellMatch).rules[0]?.requirements).toEqual([
      { type: 9, rxDoesMatch: '', rxDoesNotMatch: '', count: 1 },
    ])
  })

  it('keeps the requirement when the type is unchanged', () => {
    const before = profile(rule('A', [{ type: 7, vk: 2 }]))
    expect(setRequirementType(before, 0, 0, eLootRuleType.ObjectClass)).toEqual(before)
    expect(setRequirementType(before, 0, 0, eLootRuleType.ObjectClass).rules[0]?.requirements[0]).toBe(
      before.rules[0]?.requirements[0],
    )
  })

  it('keeps the requirement for a type the legacy editor cannot create', () => {
    const before = profile(rule('A', [{ type: 7, vk: 2 }]))
    expect(setRequirementType(before, 0, 0, 123)).toEqual(before)
  })

  it('does nothing for a bad index', () => {
    const before = profile(rule('A', [{ type: 7, vk: 2 }]))
    expect(setRequirementType(before, 0, 9, eLootRuleType.SpellMatch)).toEqual(before)
  })
})

describe('toggleDisabled', () => {
  it('adds a DisabledRule when the rule is on', () => {
    expect(toggleDisabled(profile(rule('A', [{ type: 7, vk: 2 }])), 0).rules[0]?.requirements).toEqual([
      { type: 7, vk: 2 },
      { type: 9999, b: true },
    ])
  })

  it('removes every DisabledRule when one of them is true', () => {
    const p = profile(rule('A', [{ type: 9999, b: false }, { type: 7, vk: 2 }, { type: 9999, b: true }]))
    expect(toggleDisabled(p, 0).rules[0]?.requirements).toEqual([{ type: 7, vk: 2 }])
  })

  it('replaces a false DisabledRule with a true one at the end', () => {
    const p = profile(rule('A', [{ type: 9999, b: false }, { type: 7, vk: 2 }]))
    expect(toggleDisabled(p, 0).rules[0]?.requirements).toEqual([{ type: 7, vk: 2 }, { type: 9999, b: true }])
  })
})

describe('a new rule and requirement in a file', () => {
  it('round-trips through writeProfile and readProfile', () => {
    let p = profile(rule('A'))
    p = newRule(p, -1)
    p = newRequirement(p, 0)
    p = setRequirementType(p, 0, 0, eLootRuleType.AnySimilarColor)

    const back = readProfile(writeProfile(p))
    expect(back.rules[0]?.name).toBe('A')
    expect(back.rules[0]?.requirements[0]).toEqual(defaultRequirement(eLootRuleType.AnySimilarColor))
    expect(back.rules[1]?.name).toBe('New Rule')
  })
})
