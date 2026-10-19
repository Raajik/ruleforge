// Tests for "Add or update salvage rules" (T23). The C# is
// ref/editor/Form1.cs 790-805, ref/editor/Macros.cs 66-118 and
// ref/editor/AddSalvageRulesForm.cs.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eLootAction } from '../format/enums'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { readProfile, writeProfile } from '../format/profile'
import { doubleValueKey, intValueKey, materialGroups, materialNames } from '../gamedata/generated'
import { addSalvageRules } from './salvage'

function rule(name: string, action: number = eLootAction.Keep, requirements: Requirement[] = []): LootRule {
  return { name, customExpression: '', priority: 0, action, lootActionData: 0, requirements }
}

function profile(...rules: LootRule[]): LootProfile {
  return { version: 1, rules, extraBlocks: [] }
}

/** The three requirements a salvage rule gets (Macros.cs 110-117). */
function salvageReqs(matId: number, work: number): Requirement[] {
  return [
    { type: 2, keyval: matId, vk: intValueKey.Material },
    { type: 3, keyval: matId, vk: intValueKey.Material },
    { type: 5, keyval: work, vk: doubleValueKey.SalvageWorkmanship },
  ]
}

// "Basic Tinkering" is the group of Ivory (51) and Leather (52).
const basic = 'Basic Tinkering'

describe('addSalvageRules', () => {
  it('adds one rule per material at the end, in group order', () => {
    const keep: Requirement[] = [{ type: 6, keyval: 0 }]
    const p = profile(rule('keep a', eLootAction.Keep, keep))
    const added = addSalvageRules(p, basic, 10, false)

    expect(added.rules).toHaveLength(3)
    expect(added.rules[0]).toEqual(rule('keep a', eLootAction.Keep, keep))
    expect(added.rules[1]).toEqual(rule('S: Ivory', eLootAction.Salvage, salvageReqs(51, 10)))
    expect(added.rules[2]).toEqual(rule('S: Leather', eLootAction.Salvage, salvageReqs(52, 10)))
  })

  it('keeps the requirements of an existing matching rule, as the "Add rules" button does', () => {
    const old: Requirement[] = [{ type: 6, keyval: 1 }]
    const p = profile(rule('S: Ivory', eLootAction.Salvage, old))
    const added = addSalvageRules(p, basic, 10, false)

    expect(added.rules).toHaveLength(2)
    expect(added.rules[0]?.requirements).toEqual(old)
    expect(added.rules[1]).toEqual(rule('S: Leather', eLootAction.Salvage, salvageReqs(52, 10)))
  })

  it('replaces every requirement of an existing rule, as the "Add/Update rules" button does', () => {
    const old: Requirement[] = [{ type: 6, keyval: 1 }, { type: 1001, keyval: 7 }]
    const p = profile(rule('S: Ivory', eLootAction.Salvage, old))
    const added = addSalvageRules(p, basic, 4, true)

    expect(added.rules).toHaveLength(2)
    expect(added.rules[0]?.requirements).toEqual(salvageReqs(51, 4))
    expect(added.rules[1]).toEqual(rule('S: Leather', eLootAction.Salvage, salvageReqs(52, 4)))
  })

  it('matches the name and the action exactly', () => {
    const p = profile(
      rule('S: Ivory', eLootAction.Keep),
      rule('(S) Leather', eLootAction.Salvage),
      rule('s: ivory', eLootAction.Salvage),
    )
    const added = addSalvageRules(p, basic, 10, true)

    // None of them matches, so two fresh rules join the list.
    expect(added.rules).toHaveLength(5)
    expect(added.rules.map((r) => r.name)).toEqual(['S: Ivory', '(S) Leather', 's: ivory', 'S: Ivory', 'S: Leather'])
    expect(added.rules[3]?.action).toBe(eLootAction.Salvage)
  })

  it('gives an unknown group the same profile back', () => {
    const p = profile(rule('a'))
    expect(addSalvageRules(p, 'No Such Group', 10, true)).toEqual(p)
    expect(addSalvageRules(profile(), '', 10, true).rules).toEqual([])
  })

  it('does not change the input', () => {
    const p = profile(rule('S: Ivory', eLootAction.Salvage, [{ type: 6, keyval: 1 }]), rule('keep'))
    const before = JSON.parse(JSON.stringify(p))
    const added = addSalvageRules(p, basic, 10, true)

    expect(p).toEqual(before)
    expect(added).not.toBe(p)
    expect(added.rules[0]).not.toBe(p.rules[0])
  })

  it('gives every material of every group a name and round-trips the result', () => {
    for (const [, ids] of materialGroups) for (const id of ids) expect(new Map(materialNames).get(id), `id ${id}`).toBeTruthy()

    const p = profile(rule('keep', eLootAction.Keep))
    const added = addSalvageRules(p, 'Weapon Imbues', 7, true)
    expect(added.rules.map((r) => r.name)).toEqual([
      'keep',
      'S: Aquamarine',
      'S: Black Garnet',
      'S: Emerald',
      'S: Imperial Topaz',
      'S: Jet',
      'S: Red Garnet',
      'S: White Sapphire',
      'S: Sunstone',
      'S: Black Opal',
    ])
    expect(readProfile(writeProfile(added))).toEqual(added)
  })

  it('adds the rules to a real fixture and round-trips it', () => {
    const p = readProfile(readFileSync('fixtures/IAC_Level_NoCash.utl', 'utf8'))
    const added = addSalvageRules(p, basic, 10, false)

    // Every old rule is unchanged. The fixture rules are named "(S) ..." so
    // they never match the "S: ..." names of the C# macro.
    expect(added.rules.slice(0, p.rules.length)).toEqual(p.rules)
    expect(added.rules.slice(p.rules.length)).toEqual([
      rule('S: Ivory', eLootAction.Salvage, salvageReqs(51, 10)),
      rule('S: Leather', eLootAction.Salvage, salvageReqs(52, 10)),
    ])
    expect(writeProfile(added)).not.toBe(writeProfile(p))
    expect(readProfile(writeProfile(added))).toEqual(added)
  })
})
