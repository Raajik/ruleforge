// Tests for the auto-sort (T21). The C# is ref/editor/Form1.cs 823-855 and
// cLootItemRule.AnyReqRequiresID (ref/shared/LootRules.cs 2889-2898).

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eLootAction } from '../format/enums'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { readProfile, writeProfile } from '../format/profile'
import { doubleValueKey, intValueKey, stringValueKey } from '../gamedata/generated'
import { anyReqRequiresID, autoSortRules } from './sort'

function rule(
  name: string,
  action: number = eLootAction.Keep,
  requirements: Requirement[] = [],
): LootRule {
  return { name, customExpression: '', priority: 0, action, lootActionData: 0, requirements }
}

function profile(...rules: LootRule[]): LootProfile {
  return { version: 1, rules, extraBlocks: [] }
}

function ids(requirements: Requirement[]): boolean {
  return anyReqRequiresID(rule('r', eLootAction.Keep, requirements))
}

describe('anyReqRequiresID', () => {
  it('is true for the types that always need an ID', () => {
    const always: Requirement[] = [
      { type: 0, pattern: '' },
      { type: 8, keyval: 0 },
      { type: 9, rxDoesMatch: '', rxDoesNotMatch: '', count: 1 },
      { type: 10, keyval: 0 },
      { type: 2000, keyval: 0 },
      { type: 2001, keyval: 0 },
      { type: 2003, keyval: 0, vk: intValueKey.MaxDamage },
      { type: 2005, keyval: 0, vk: doubleValueKey.AttackBonus },
      { type: 2006, keyval: 0 },
      { type: 2007, keyval: 0 },
      { type: 2008, dot: 0, meleeDefenseBonus: 0, attackBonus: 0 },
    ]
    for (const req of always) expect(ids([req]), `type ${req.type}`).toBe(true)
  })

  it('is false for the types that never need an ID', () => {
    const never: Requirement[] = [
      { type: 6, keyval: 0 },
      { type: 7, vk: 2 },
      { type: 1000, keyval: 0, vk: 38 },
      { type: 1001, keyval: 0 },
      { type: 1002, keyval: 0 },
      { type: 1003, keyval: 0 },
      { type: 1004, vk: 38, minskill: 0, maxskill: 0 },
      { type: 14, r: 255, g: 255, b: 255, maxDifferenceH: 10, maxDifferenceSV: 0.1 },
      { type: 15, r: 255, g: 255, b: 255, maxDifferenceH: 10, maxDifferenceSV: 0.1, armorGroup: '' },
      { type: 16, r: 255, g: 255, b: 255, maxDifferenceH: 10, maxDifferenceSV: 0.1, slot: 0 },
      { type: 17, slot: 0, palette: 0 },
      { type: 9999, b: true },
      // cUnsupportedRequirement.MayRequireID is false (LootRules.cs 263).
      { type: 42, data: 'raw' },
    ]
    for (const req of never) expect(ids([req]), `type ${req.type}`).toBe(false)
  })

  it('depends on the key for the key-based types', () => {
    // GameInfo.IsIDProperty: only Name and SecondaryName are not ID string keys.
    expect(ids([{ type: 1, pattern: '', key: stringValueKey.Name }])).toBe(false)
    expect(ids([{ type: 1, pattern: '', key: stringValueKey.SecondaryName }])).toBe(false)
    expect(ids([{ type: 1, pattern: '', key: stringValueKey.DateBorn }])).toBe(true)
    // IntValueKey: Value is not an ID key, Burden is (combokeys.ts nonIdValues).
    const lvk = (type: 2 | 3 | 11 | 12 | 13, vk: number): Requirement => {
      switch (type) {
        case 2:
          return { type: 2, keyval: 0, vk }
        case 3:
          return { type: 3, keyval: 0, vk }
        case 11:
          return { type: 11, keyval: 0, vk }
        case 12:
          return { type: 12, keyval: 0, vk }
        default:
          return { type: 13, keyval: 0, vk }
      }
    }
    for (const type of [2, 3, 11, 12, 13] as const) {
      expect(ids([lvk(type, intValueKey.Value)]), `type ${type} Value`).toBe(false)
      expect(ids([lvk(type, intValueKey.Burden)]), `type ${type} Burden`).toBe(true)
    }
    // DoubleValueKey: ApproachDistance is not an ID key, AttackBonus is.
    const dvk = (type: 4 | 5, vk: number): Requirement => (type === 4 ? { type: 4, keyval: 0, vk } : { type: 5, keyval: 0, vk })
    for (const type of [4, 5] as const) {
      expect(ids([dvk(type, doubleValueKey.ApproachDistance)]), `type ${type}`).toBe(false)
      expect(ids([dvk(type, doubleValueKey.AttackBonus)]), `type ${type}`).toBe(true)
    }
  })

  it('is false without requirements and true when one requirement needs an ID', () => {
    expect(anyReqRequiresID(rule('r'))).toBe(false)
    const mixed: Requirement[] = [
      { type: 6, keyval: 0 },
      { type: 1000, keyval: 0, vk: 38 },
      { type: 0, pattern: '' },
    ]
    expect(ids(mixed)).toBe(true)
  })
})

describe('autoSortRules', () => {
  it('orders by the action number, with KeepUpTo as Keep', () => {
    const p = profile(
      rule('a', eLootAction.Read),
      rule('b', eLootAction.Sell),
      rule('c', eLootAction.Salvage),
      rule('d', eLootAction.KeepUpTo),
      rule('e', eLootAction.Keep),
      rule('f', eLootAction.NoLoot),
    )
    expect(autoSortRules(p).rules.map((r) => r.name)).toEqual(['f', 'd', 'e', 'c', 'b', 'a'])
  })

  it('orders by the raw action number for the hidden User actions', () => {
    const p = profile(rule('a', eLootAction.User3), rule('b', eLootAction.User1), rule('c', eLootAction.Keep))
    expect(autoSortRules(p).rules.map((r) => r.name)).toEqual(['c', 'b', 'a'])
  })

  it('puts rules without an ID requirement before rules with one', () => {
    const needsId = rule('A needs id', eLootAction.Keep, [{ type: 0, pattern: '' }])
    const noId = rule('Z no id', eLootAction.Keep, [{ type: 7, vk: 2 }])
    expect(autoSortRules(profile(needsId, noId)).rules.map((r) => r.name)).toEqual(['Z no id', 'A needs id'])
    expect(autoSortRules(profile(noId, needsId)).rules.map((r) => r.name)).toEqual(['Z no id', 'A needs id'])
  })

  it('then compares the names culture-aware, so "Apple" sorts before "banana"', () => {
    const p = profile(rule('banana', eLootAction.Keep), rule('Apple', eLootAction.Keep))
    expect(autoSortRules(p).rules.map((r) => r.name)).toEqual(['Apple', 'banana'])
  })

  it('is stable: equal rules keep their order and their objects', () => {
    const first = rule('same', eLootAction.Keep)
    const second = rule('same', eLootAction.Keep)
    const sorted = autoSortRules(profile(first, second))
    expect(sorted.rules[0]).toBe(first)
    expect(sorted.rules[1]).toBe(second)
  })

  it('does not change the input', () => {
    const p = profile(rule('b', eLootAction.Sell), rule('a', eLootAction.Keep))
    const before = JSON.parse(JSON.stringify(p))
    const sorted = autoSortRules(p)
    expect(p).toEqual(before)
    expect(sorted).not.toBe(p)
  })

  it('handles an empty profile and a single rule', () => {
    expect(autoSortRules(profile()).rules).toEqual([])
    const one = rule('only', eLootAction.Sell)
    expect(autoSortRules(profile(one)).rules).toEqual([one])
  })

  it('sorts a real fixture into order and round-trips it', () => {
    const p = readProfile(readFileSync('fixtures/IAC_Level_NoCash.utl', 'utf8'))
    const sorted = autoSortRules(p)

    // The sorted list is a permutation of the rules of the input.
    const key = (r: LootRule) => JSON.stringify(r)
    expect(sorted.rules.map(key).sort()).toEqual(p.rules.map(key).sort())

    // Every adjacent pair is in the order the C# swap condition wants.
    const order = (r: LootRule): number => (r.action === eLootAction.KeepUpTo ? eLootAction.Keep : r.action)
    for (let i = 0; i < sorted.rules.length - 1; i++) {
      const a = sorted.rules[i]
      const b = sorted.rules[i + 1]
      if (!a || !b) continue
      const sameAction = order(a) === order(b)
      const sameId = anyReqRequiresID(a) === anyReqRequiresID(b)
      const ok =
        order(a) < order(b) ||
        (sameAction && !anyReqRequiresID(a) && anyReqRequiresID(b)) ||
        (sameAction && sameId && a.name.localeCompare(b.name) <= 0)
      expect(ok, `rules ${i} and ${i + 1}: "${a.name}" before "${b.name}"`).toBe(true)
    }

    // The 14 Salvage rules come after the 42 Keep and KeepUpTo rules.
    const lastKeep = sorted.rules.reduce((last, r, i) => (r.action === eLootAction.Salvage ? last : i), -1)
    expect(sorted.rules.slice(lastKeep + 1).every((r) => r.action === eLootAction.Salvage)).toBe(true)

    // Sorting changes the file, and the sorted file reads back the same.
    expect(writeProfile(sorted)).not.toBe(writeProfile(p))
    expect(readProfile(writeProfile(sorted))).toEqual(sorted)
  })

  it('is idempotent on a real fixture', () => {
    const p = readProfile(readFileSync('fixtures/IAC_Level_NoCash.utl', 'utf8'))
    expect(autoSortRules(autoSortRules(p))).toEqual(autoSortRules(p))
  })
})
