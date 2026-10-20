// Tests for the loot preview (PLAN.md H3c). It gives the decision of a
// profile for one item, and the result of every requirement of the rule that
// decided it.

import { describe, expect, it } from 'vitest'
import { eLootAction } from '../format/enums'
import { objectClass, stringValueKey } from '../gamedata/generated'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import type { LootItem } from './item'
import { previewItem } from './preview'

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

function rule(name: string, action: number, requirements: Requirement[] = [], lootActionData = 0): LootRule {
  return { name, customExpression: '', priority: 0, action, lootActionData, requirements }
}

function profile(...rules: LootRule[]): LootProfile {
  return { version: 1, rules, extraBlocks: [] }
}

describe('previewItem', () => {
  it('gives the action, the name and the index of the first rule that matches', () => {
    const p = profile(
      rule('misses', eLootAction.Keep, [{ type: 7, vk: objectClass.Armor }]),
      rule('hits', eLootAction.Salvage, [{ type: 7, vk: objectClass.Clothing }]),
      rule('hits too', eLootAction.Sell, [{ type: 7, vk: objectClass.Clothing }]),
    )
    const decision = previewItem(p, item({ objectClass: objectClass.Clothing }))
    expect(decision.action).toBe(eLootAction.Salvage)
    expect(decision.ruleName).toBe('hits')
    expect(decision.ruleIndex).toBe(1)
    expect(decision.known).toBe(true)
    expect(decision.lootActionData).toBe(0)
  })

  it('gives the result of every requirement of the deciding rule', () => {
    const p = profile(
      rule('hits', eLootAction.Keep, [
        { type: 7, vk: objectClass.MissileWeapon },
        { type: 1, pattern: 'XP:', key: stringValueKey.FullDescription },
      ]),
    )
    const decision = previewItem(p, item({ objectClass: objectClass.MissileWeapon, stringValues: { FullDescription: 'a bow with XP: yes' } }))
    expect(decision.requirements.map((r) => r.outcome)).toEqual(['yes', 'yes'])
    expect(decision.requirements[0]!.text).toBe('ObjectClass MissileWeapon')
    expect(decision.requirements[1]!.text).toBe('StringValueMatch FullDescription XP:')
  })

  it('gives NoLoot and index -1 when no rule matches', () => {
    const p = profile(rule('armor only', eLootAction.Keep, [{ type: 7, vk: objectClass.Armor }]))
    const decision = previewItem(p, item({ objectClass: objectClass.Clothing }))
    expect(decision.action).toBe(eLootAction.NoLoot)
    expect(decision.ruleName).toBe('')
    expect(decision.ruleIndex).toBe(-1)
    expect(decision.known).toBe(true)
    expect(decision.requirements).toEqual([])
  })

  it('shows an invalid regex as an error on that rule, not a crash', () => {
    const p = profile(
      rule('broken', eLootAction.Keep, [{ type: 1, pattern: '[unclosed', key: stringValueKey.Name }]),
      rule('never reached', eLootAction.Salvage, []),
    )
    const decision = previewItem(p, item({ stringValues: { Name: 'Iron Blade' } }))
    expect(decision.known).toBe(false)
    expect(decision.ruleName).toBe('broken')
    expect(decision.ruleIndex).toBe(0)
    expect(decision.requirements[0]!.outcome).toBe('error')
    expect(decision.error).toBe('The pattern of this rule is not a valid regular expression.')
  })

  it('stops the requirement list at the first requirement that is not true', () => {
    const p = profile(
      rule('undecided', eLootAction.Keep, [
        { type: 7, vk: objectClass.Armor },
        { type: 42, data: 'raw body' },
        { type: 7, vk: objectClass.Clothing },
      ]),
    )
    const decision = previewItem(p, item({ objectClass: objectClass.Armor }))
    expect(decision.known).toBe(false)
    expect(decision.requirements.map((r) => r.outcome)).toEqual(['yes', 'unknown'])
  })

  it('counts the rules above the deciding rule', () => {
    const p = profile(
      rule('misses', eLootAction.Keep, [{ type: 7, vk: objectClass.Armor }]),
      rule('hits', eLootAction.Salvage, [{ type: 7, vk: objectClass.Clothing }]),
    )
    expect(previewItem(p, item({ objectClass: objectClass.Clothing })).rulesAbove).toBe(1)
  })

  it('gives the keep count of the deciding rule', () => {
    const p = profile(rule('keep ten', eLootAction.KeepUpTo, [], 10))
    const decision = previewItem(p, item())
    expect(decision.action).toBe(eLootAction.KeepUpTo)
    expect(decision.lootActionData).toBe(10)
  })
})
