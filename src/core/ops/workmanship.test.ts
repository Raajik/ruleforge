// Tests for "Update workmanship requirements" (T24). The C# is
// ref/editor/Form1.cs 806-822, ref/editor/Macros.cs 119-143 and
// ref/editor/UpdateWorkReqsForm.cs.
//
// Macros.cs 119-142: for a chosen action, `by` is negated for Keep, then each
// DoubleValKeyGE of a matching rule takes Math.Min(10, keyval + by) and each
// DoubleValKeyLE takes Math.Max(1, keyval - by). The key value (vk) is ignored,
// so an unrelated DoubleValueKey changes too (the real fixtures show this).

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eLootAction } from '../format/enums'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { readProfile, writeProfile } from '../format/profile'
import { updateWorkmanshipRequirements } from './workmanship'

function rule(name: string, action: number = eLootAction.Keep, requirements: Requirement[] = []): LootRule {
  return { name, customExpression: '', priority: 0, action, lootActionData: 0, requirements }
}

function profile(...rules: LootRule[]): LootProfile {
  return { version: 1, rules, extraBlocks: [] }
}

const ge = (keyval: number): Requirement => ({ type: 5, keyval, vk: 167772169 })
const le = (keyval: number): Requirement => ({ type: 4, keyval, vk: 167772169 })

describe('updateWorkmanshipRequirements', () => {
  it('adds `by` to DoubleValKeyGE and subtracts it from DoubleValKeyLE', () => {
    const p = profile(rule('s', eLootAction.Salvage, [ge(3), le(9), { type: 6, keyval: 1 }]))
    const out = updateWorkmanshipRequirements(p, eLootAction.Salvage, 2)

    expect(out.rules[0]?.requirements).toEqual([ge(5), le(7), { type: 6, keyval: 1 }])
  })

  it('caps DoubleValKeyGE at 10 and floors DoubleValKeyLE at 1', () => {
    const p = profile(rule('s', eLootAction.Salvage, [ge(8), le(2)]))
    const out = updateWorkmanshipRequirements(p, eLootAction.Salvage, 5)

    expect(out.rules[0]?.requirements).toEqual([ge(10), le(1)])
  })

  it('negates `by` for the Keep action, as the C# does', () => {
    const p = profile(rule('k', eLootAction.Keep, [ge(9), le(4)]))
    const out = updateWorkmanshipRequirements(p, eLootAction.Keep, 2)

    // by becomes -2: GE 9 - 2 = 7, LE 4 + 2 = 6.
    expect(out.rules[0]?.requirements).toEqual([ge(7), le(6)])
  })

  it('clamps even when `by` is 0, because Math.Min and Math.Max always run', () => {
    const p = profile(rule('s', eLootAction.Salvage, [ge(20), le(0)]))
    const out = updateWorkmanshipRequirements(p, eLootAction.Salvage, 0)

    expect(out.rules[0]?.requirements).toEqual([ge(10), le(1)])
  })

  it('changes only the rules with the exact action', () => {
    const p = profile(
      rule('keep', eLootAction.Keep, [ge(3)]),
      rule('keepup', eLootAction.KeepUpTo, [ge(3)]),
      rule('salvage', eLootAction.Salvage, [ge(3)]),
    )
    const out = updateWorkmanshipRequirements(p, eLootAction.Keep, 1)

    expect(out.rules[0]?.requirements).toEqual([ge(2)])
    expect(out.rules[1]?.requirements).toEqual([ge(3)])
    expect(out.rules[2]?.requirements).toEqual([ge(3)])
  })

  it('leaves other requirement types and rules without requirements alone', () => {
    const other: Requirement = { type: 2, keyval: 3, vk: 176 }
    const p = profile(rule('s', eLootAction.Salvage, [other]), rule('empty', eLootAction.Salvage))
    const out = updateWorkmanshipRequirements(p, eLootAction.Salvage, 4)

    expect(out.rules[0]?.requirements).toEqual([other])
    expect(out.rules[1]?.requirements).toEqual([])
    expect(updateWorkmanshipRequirements(profile(), eLootAction.Keep, 3).rules).toEqual([])
  })

  it('does not change the input and gives the changed rules their own objects', () => {
    const p = profile(rule('s', eLootAction.Salvage, [ge(3)]), rule('keep', eLootAction.Keep, [ge(3)]))
    const before = JSON.parse(JSON.stringify(p))
    const out = updateWorkmanshipRequirements(p, eLootAction.Salvage, 1)

    expect(p).toEqual(before)
    expect(out).not.toBe(p)
    expect(out.rules[0]).not.toBe(p.rules[0])
    expect(out.rules[0]?.requirements[0]).not.toBe(p.rules[0]?.requirements[0])
    // A rule with another action keeps its object.
    expect(out.rules[1]).toBe(p.rules[1])
  })

  it('round-trips through writeProfile and readProfile', () => {
    const p = profile(rule('s', eLootAction.Salvage, [ge(3), le(9)]))
    const out = updateWorkmanshipRequirements(p, eLootAction.Salvage, 2)

    expect(readProfile(writeProfile(out))).toEqual(out)
  })

  it('works on a real fixture and round-trips it', () => {
    const p = readProfile(readFileSync('fixtures/vtclassic_editor_rich.utl', 'utf8'))
    // The single KeepUpTo rule has a SpellMatch, a DoubleValKeyGE(SalvageWorkmanship) = 7 and a DisabledRule.
    const out = updateWorkmanshipRequirements(p, eLootAction.KeepUpTo, 2)

    const others = (prof: LootProfile) => prof.rules[0]?.requirements.filter((q) => q.type !== 4 && q.type !== 5)
    expect(out.rules[0]?.requirements.filter((q) => q.type === 5)).toEqual([ge(9)])
    expect(others(out)).toEqual(others(p))
    expect(readProfile(writeProfile(out))).toEqual(out)
  })

  it('changes the unrelated DoubleValueKeys of LootSnobV4 too, as the C# macro does', () => {
    const p = readProfile(readFileSync('fixtures/LootSnobV4.utl', 'utf8'))
    // Keep negates by, so by = -3 adds 3 to every DoubleValKey of a Keep rule.
    const out = updateWorkmanshipRequirements(p, eLootAction.Keep, -3)

    const changed = (prof: LootProfile) =>
      prof.rules.flatMap((r) => r.requirements.filter((q) => q.type === 4 || q.type === 5))
    const before = changed(p)
    const after = changed(out)

    // 36 DoubleValKeyGE (1.03 and 1.04) and 1 DoubleValKeyLE (0.53) on Keep rules.
    expect(before.filter((q) => q.type === 5)).toHaveLength(36)
    expect(after.filter((q) => q.type === 5).every((q) => 'keyval' in q && (q.keyval === 4.04 || q.keyval === 4.03))).toBe(true)
    // DoubleValKeyLE subtracts by: 0.53 - 3 = -2.47, floored to 1.
    expect(after.filter((q) => q.type === 4).map((q) => ('keyval' in q ? q.keyval : null))).toEqual([1])
    expect(readProfile(writeProfile(out))).toEqual(out)
  })
})
