// Tests for "Add Packslot Requirements" (T22). The C# is
// ref/editor/Form1.cs 856-899 and ref/editor/SelectMinPackSlotsForm.cs.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eLootAction } from '../format/enums'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { readProfile, writeProfile } from '../format/profile'
import { addPackslotRequirements } from './packslots'

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

const packslots = (keyval: number): Requirement => ({ type: 1001, keyval })

describe('addPackslotRequirements', () => {
  it('adds a requirement at the end of each rule with the chosen action', () => {
    const other: Requirement = { type: 6, keyval: 0 }
    const p = profile(
      rule('keep a', eLootAction.Keep, [other]),
      rule('keep b', eLootAction.Keep),
      rule('sell', eLootAction.Sell, [other]),
    )
    const added = addPackslotRequirements(p, eLootAction.Keep, 10, false)
    expect(added.rules[0]?.requirements).toEqual([other, packslots(10)])
    expect(added.rules[1]?.requirements).toEqual([packslots(10)])
    // A rule with another action keeps its requirements.
    expect(added.rules[2]?.requirements).toEqual([other])
  })

  it('matches the action exactly, so KeepUpTo rules do not match Keep', () => {
    const p = profile(rule('up to', eLootAction.KeepUpTo), rule('keep', eLootAction.Keep))
    const added = addPackslotRequirements(p, eLootAction.Keep, 10, false)
    expect(added.rules[0]?.requirements).toEqual([])
    expect(added.rules[1]?.requirements).toEqual([packslots(10)])
  })

  it('keeps an existing value when updateExisting is false, as the OK button does', () => {
    const p = profile(rule('has one', eLootAction.Keep, [packslots(3)]))
    const added = addPackslotRequirements(p, eLootAction.Keep, 10, false)
    expect(added.rules[0]?.requirements).toEqual([packslots(3)])
  })

  it('updates the first existing requirement only, as the Yes button does', () => {
    const p = profile(rule('has two', eLootAction.Keep, [packslots(3), packslots(5)]))
    const added = addPackslotRequirements(p, eLootAction.Keep, 10, true)
    expect(added.rules[0]?.requirements).toEqual([packslots(10), packslots(5)])
  })

  it('adds a requirement when updateExisting is true and none exists', () => {
    const p = profile(rule('none', eLootAction.Keep))
    const added = addPackslotRequirements(p, eLootAction.Keep, 10, true)
    expect(added.rules[0]?.requirements).toEqual([packslots(10)])
  })

  it('keeps unsupported requirements as they are', () => {
    const raw: Requirement = { type: 42, data: 'raw' }
    const p = profile(rule('raw', eLootAction.Keep, [raw]))
    const added = addPackslotRequirements(p, eLootAction.Keep, 10, true)
    expect(added.rules[0]?.requirements).toEqual([raw, packslots(10)])
  })

  it('does not change the input', () => {
    const p = profile(rule('a', eLootAction.Keep, [packslots(3)]), rule('b', eLootAction.Sell))
    const before = JSON.parse(JSON.stringify(p))
    const added = addPackslotRequirements(p, eLootAction.Keep, 10, true)
    expect(p).toEqual(before)
    expect(added).not.toBe(p)
    expect(added.rules[0]).not.toBe(p.rules[0])
  })

  it('handles an empty profile and a profile without a matching rule', () => {
    expect(addPackslotRequirements(profile(), eLootAction.Keep, 10, true).rules).toEqual([])
    const p = profile(rule('sell', eLootAction.Sell))
    expect(addPackslotRequirements(p, eLootAction.Keep, 10, true).rules).toEqual(p.rules)
  })

  it('adds the requirement to a real fixture and round-trips it', () => {
    const p = readProfile(readFileSync('fixtures/IAC_Level_NoCash.utl', 'utf8'))
    const added = addPackslotRequirements(p, eLootAction.Keep, 5, false)

    // A Keep rule without a packslot requirement gets one, one that has it
    // keeps it on OK, and no other rule changed.
    let addedCount = 0
    let keptCount = 0
    for (let i = 0; i < p.rules.length; i++) {
      const before = p.rules[i]
      const after = added.rules[i]
      if (!before || !after) continue
      if (before.action !== eLootAction.Keep) {
        expect(after).toEqual(before)
      } else if (before.requirements.some((r) => r.type === 1001)) {
        expect(after.requirements, `rule "${after.name}"`).toEqual(before.requirements)
        keptCount++
      } else {
        expect(after.requirements, `rule "${after.name}"`).toEqual([...before.requirements, packslots(5)])
        addedCount++
      }
    }
    expect(addedCount).toBeGreaterThan(0)
    expect(keptCount).toBeGreaterThan(0)

    // Yes updates the real packslot values from 12 to 5.
    const updated = addPackslotRequirements(p, eLootAction.Keep, 5, true)
    const oldValues = p.rules.flatMap((r) =>
      r.action === eLootAction.Keep ? r.requirements.filter((q) => q.type === 1001) : [],
    )
    expect(oldValues).toEqual([packslots(12), packslots(12)])
    const newValues = updated.rules.flatMap((r) =>
      r.action === eLootAction.Keep ? r.requirements.filter((q) => q.type === 1001) : [],
    )
    expect(newValues).toHaveLength(2 + addedCount)
    expect(newValues.every((q) => q.type === 1001 && 'keyval' in q && q.keyval === 5)).toBe(true)

    // The changed profile writes and reads back the same.
    expect(writeProfile(added)).not.toBe(writeProfile(p))
    expect(readProfile(writeProfile(added))).toEqual(added)
  })
})
