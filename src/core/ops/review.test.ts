// Tests for the Review changes diff (PLAN.md H4). The rules of the examples
// are small, so a test can name every field and every requirement.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eLootAction, eLootRuleType } from '../format/enums'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { readProfile } from '../format/profile'
import { setRuleEnabled } from './categories'
import { diffProfiles, requirementText, undoChange, type RuleChange } from './review'

function rule(name: string, over: Partial<LootRule> = {}): LootRule {
  return {
    name,
    customExpression: '',
    priority: 0,
    action: eLootAction.Keep,
    lootActionData: 0,
    requirements: [],
    ...over,
  }
}

function profile(...rules: LootRule[]): LootProfile {
  return { version: 1, rules, extraBlocks: [] }
}

const DOUBLE: Requirement = { type: eLootRuleType.DoubleValKeyGE, keyval: 2, vk: 167772169 }

/** The first change of the list, when it is a changed rule. */
function changed(changes: RuleChange[]) {
  const change = changes[0]!
  if (change.kind !== 'changed') throw new Error(`the change is a ${change.kind} rule`)
  return change
}

describe('diffProfiles', () => {
  it('gives no change for the same profile', () => {
    const p = profile(rule('a'), rule('b', { action: eLootAction.Sell }))
    expect(diffProfiles(p, p)).toEqual([])
  })

  it('finds a changed action', () => {
    const base = profile(rule('a', { action: eLootAction.Keep }))
    const current = profile(rule('a', { action: eLootAction.Sell }))
    const changes = diffProfiles(base, current)
    expect(changes).toHaveLength(1)
    expect(changes[0]!.kind).toBe('changed')
    expect(changes[0]!.name).toBe('a')
    expect(changed(changes).fields).toEqual([{ label: 'Action', before: 'Keep', after: 'Sell' }])
  })

  it('finds a changed keep count, priority and custom expression', () => {
    const base = profile(rule('a', { lootActionData: 3, priority: 1, customExpression: 'x' }))
    const current = profile(rule('a', { lootActionData: 5, priority: 2, customExpression: 'y' }))
    expect(changed(diffProfiles(base, current)).fields).toEqual([
      { label: 'Keep count', before: '3', after: '5' },
      { label: 'Priority', before: '1', after: '2' },
      { label: 'Custom expression', before: 'x', after: 'y' },
    ])
  })

  it('shows the number of an action without a friendly name', () => {
    const base = profile(rule('a', { action: eLootAction.NoLoot }))
    const current = profile(rule('a', { action: eLootAction.User1 }))
    expect(changed(diffProfiles(base, current)).fields).toEqual([
      { label: 'Action', before: '0', after: '5' },
    ])
  })

  it('finds an added rule', () => {
    const base = profile(rule('a'))
    const current = profile(rule('a'), rule('b'))
    const changes = diffProfiles(base, current)
    expect(changes).toHaveLength(1)
    expect(changes[0]!.kind).toBe('added')
    expect(changes[0]!.name).toBe('b')
  })

  it('finds a removed rule', () => {
    const base = profile(rule('a'), rule('b'))
    const current = profile(rule('a'))
    const changes = diffProfiles(base, current)
    expect(changes).toHaveLength(1)
    expect(changes[0]!.kind).toBe('removed')
    expect(changes[0]!.name).toBe('b')
  })

  it('gives no change for a rule that moved', () => {
    const base = profile(rule('a'), rule('b'))
    const current = profile(rule('b'), rule('a'))
    expect(diffProfiles(base, current)).toEqual([])
  })

  it('gives one change of the name for a renamed rule', () => {
    const base = profile(rule('a', { requirements: [DOUBLE] }))
    const current = profile(rule('b', { requirements: [DOUBLE] }))
    const changes = diffProfiles(base, current)
    expect(changes).toHaveLength(1)
    expect(changes[0]!.kind).toBe('changed')
    expect(changed(changes).fields).toEqual([{ label: 'Name', before: 'a', after: 'b' }])
  })

  it('gives an added and a removed rule when the content differs too', () => {
    const base = profile(rule('a', { requirements: [DOUBLE] }))
    const current = profile(rule('b', { requirements: [{ ...DOUBLE, keyval: 9 }] }))
    const changes = diffProfiles(base, current)
    expect(changes.map((c) => c.kind)).toEqual(['added', 'removed'])
  })

  it('finds an added requirement', () => {
    const base = profile(rule('a'))
    const current = profile(rule('a', { requirements: [DOUBLE] }))
    const changes = diffProfiles(base, current)
    expect(changed(changes).requirements).toEqual([{ kind: 'added', after: DOUBLE }])
  })

  it('finds a removed requirement', () => {
    const base = profile(rule('a', { requirements: [DOUBLE] }))
    const current = profile(rule('a'))
    const changes = diffProfiles(base, current)
    expect(changed(changes).requirements).toEqual([{ kind: 'removed', before: DOUBLE }])
  })

  it('finds a changed requirement', () => {
    const other: Requirement = { ...DOUBLE, keyval: 9 }
    const base = profile(rule('a', { requirements: [DOUBLE] }))
    const current = profile(rule('a', { requirements: [other] }))
    const changes = diffProfiles(base, current)
    expect(changed(changes).requirements).toEqual([{ kind: 'changed', before: DOUBLE, after: other }])
  })

  it('gives no change for a requirement that moved', () => {
    const other: Requirement = { type: eLootRuleType.ObjectClass, vk: 9 }
    const base = profile(rule('a', { requirements: [DOUBLE] }))
    const current = profile(rule('a', { requirements: [other, DOUBLE] }))
    const changes = diffProfiles(base, current)
    expect(changed(changes).requirements).toEqual([{ kind: 'added', after: other }])
  })

  it('lists the changes in the order of the current profile, and the removed rules last', () => {
    const base = profile(rule('a'), rule('b'), rule('c'))
    // The new rule has a requirement, so it does not match the free rule "b".
    const current = profile(
      rule('c', { action: eLootAction.Sell }),
      rule('d', { requirements: [DOUBLE] }),
      rule('a'),
    )
    const changes = diffProfiles(base, current)
    expect(changes.map((c) => [c.kind, c.name])).toEqual([
      ['changed', 'c'],
      ['added', 'd'],
      ['removed', 'b'],
    ])
  })

  it('gives an added and a removed rule when two rules are free on each side', () => {
    const base = profile(rule('a', { requirements: [DOUBLE] }), rule('b'))
    const current = profile(rule('c', { requirements: [DOUBLE] }), rule('d'))
    const changes = diffProfiles(base, current)
    expect(changes.map((c) => [c.kind, c.name])).toEqual([
      ['added', 'c'],
      ['added', 'd'],
      ['removed', 'a'],
      ['removed', 'b'],
    ])
  })

  it('never changes the input profiles', () => {
    const base = profile(rule('a', { action: eLootAction.Keep }))
    const current = profile(rule('a', { action: eLootAction.Sell }))
    diffProfiles(base, current)
    expect(base.rules[0]!.action).toBe(eLootAction.Keep)
    expect(current.rules[0]!.action).toBe(eLootAction.Sell)
  })

  it('finds the change of a real rule of LootSnobV4.utl', () => {
    const base = readProfile(readFileSync('fixtures/LootSnobV4.utl', 'utf8'))
    // Rule 0 is the Trophies marker. It is off, so it has a DisabledRule.
    const current = setRuleEnabled(base, 0, true)
    const changes = diffProfiles(base, current)
    expect(changes).toHaveLength(1)
    expect(changes[0]!.kind).toBe('changed')
    expect(changes[0]!.name).toBe('***** Trophies *****')
    expect(changed(changes).requirements).toEqual([
      { kind: 'removed', before: { type: eLootRuleType.DisabledRule, b: true } },
    ])
  })
})

describe('undoChange', () => {
  it('removes an added rule', () => {
    const base = profile(rule('a'))
    const current = profile(rule('a'), rule('b'))
    const change = diffProfiles(base, current)[0]!
    expect(undoChange(current, change).rules.map((r) => r.name)).toEqual(['a'])
  })

  it('puts a removed rule back at its place', () => {
    const base = profile(rule('a'), rule('b'), rule('c'))
    const current = profile(rule('a'), rule('c'))
    const change = diffProfiles(base, current)[0]!
    expect(change.kind).toBe('removed')
    expect(undoChange(current, change).rules.map((r) => r.name)).toEqual(['a', 'b', 'c'])
  })

  it('puts a removed rule back before the rule that follows it', () => {
    // The rules "a" and "b" are gone. The undo of "b" puts it before "c".
    const base = profile(rule('a'), rule('b'), rule('c'))
    const current = profile(rule('c'))
    const change = diffProfiles(base, current).find((c) => c.name === 'b')!
    expect(undoChange(current, change).rules.map((r) => r.name)).toEqual(['b', 'c'])
  })

  it('gives the base order back when every removed rule comes back', () => {
    const base = profile(rule('a'), rule('b'), rule('c'))
    const current = profile(rule('c'))
    let next = current
    let changes = diffProfiles(base, next)
    while (changes.length > 0) {
      next = undoChange(next, changes[0]!)
      changes = diffProfiles(base, next)
    }
    expect(next.rules.map((r) => r.name)).toEqual(['a', 'b', 'c'])
  })

  it('gives the base rule back for a changed rule', () => {
    const base = profile(rule('a', { action: eLootAction.Keep, requirements: [DOUBLE] }))
    const current = profile(rule('a', { action: eLootAction.Sell, requirements: [] }))
    const change = diffProfiles(base, current)[0]!
    const next = undoChange(current, change)
    expect(next.rules[0]!.action).toBe(eLootAction.Keep)
    expect(next.rules[0]!.requirements).toEqual([DOUBLE])
  })

  it('gives the old name back for a renamed rule', () => {
    const base = profile(rule('a', { requirements: [DOUBLE] }))
    const current = profile(rule('b', { requirements: [DOUBLE] }))
    const change = diffProfiles(base, current)[0]!
    expect(undoChange(current, change).rules.map((r) => r.name)).toEqual(['a'])
  })

  it('never changes the input profile', () => {
    const base = profile(rule('a'))
    const current = profile(rule('a'), rule('b'))
    const change = diffProfiles(base, current)[0]!
    undoChange(current, change)
    expect(current.rules.map((r) => r.name)).toEqual(['a', 'b'])
  })

  it('gives the base profile back when every change is undone', () => {
    const base = profile(rule('a', { action: eLootAction.Keep }), rule('b'))
    const current = profile(rule('a', { action: eLootAction.Sell }), rule('c'))
    let next = current
    let changes = diffProfiles(base, next)
    while (changes.length > 0) {
      next = undoChange(next, changes[0]!)
      changes = diffProfiles(base, next)
    }
    expect(next.rules.map((r) => r.name)).toEqual(['a', 'b'])
    expect(next.rules[0]!.action).toBe(eLootAction.Keep)
  })
})

describe('requirementText', () => {
  it('names a DisabledRule by its state', () => {
    expect(requirementText({ type: eLootRuleType.DisabledRule, b: true })).toBe('Disabled')
    expect(requirementText({ type: eLootRuleType.DisabledRule, b: false })).toBe('Enabled')
  })

  it('names the other requirements with their acts-on key and value', () => {
    expect(requirementText({ type: 12, keyval: 8, vk: 353 })).toBe(
      'LongValKeyE WeaponMasteryCategory 8',
    )
  })
})
