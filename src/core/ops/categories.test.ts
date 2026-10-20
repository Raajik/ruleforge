// Tests for the Customize categories (PLAN.md H2). The counts of the two
// fixtures come from the section marker rules of the file itself.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eLootRuleType } from '../format/enums'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { readProfile, writeProfile } from '../format/profile'
import { categorizeRules, requirementSummary, ruleSummary, setRuleEnabled } from './categories'

function rule(name: string, requirements: Requirement[] = []): LootRule {
  return { name, customExpression: '', priority: 0, action: 1, lootActionData: 0, requirements }
}

function profile(...rules: LootRule[]): LootProfile {
  return { version: 1, rules, extraBlocks: [] }
}

function fixture(name: string): LootProfile {
  return readProfile(readFileSync(`fixtures/${name}`, 'utf8'))
}

describe('categorizeRules', () => {
  it('makes a top section of a trimmed name with two or more stars at both ends', () => {
    const p = profile(rule('***** Trophies *****'), rule('a rule'), rule('*** Armor ***'))
    const cats = categorizeRules(p)
    expect(cats.map((c) => c.name)).toEqual(['***** Trophies *****', '*** Armor ***'])
    expect(cats.every((c) => c.sub === false)).toBe(true)
  })

  it('makes a sub-section of a name that starts with a space, or has exactly two stars', () => {
    const p = profile(rule('***** Trophies *****'), rule('   ** Aetheria **'), rule('**AT**'), rule('x'))
    const cats = categorizeRules(p)
    expect(cats.map((c) => [c.name, c.sub])).toEqual([
      ['***** Trophies *****', false],
      ['** Aetheria **', true],
      ['**AT**', true],
    ])
  })

  it('keeps the rule index of each rule and the rules of its section', () => {
    const p = profile(rule('***** Trophies *****'), rule('before'), rule('   ** Keys **'), rule('after'))
    const cats = categorizeRules(p)
    // Rule 0 is the Trophies marker. Rule 1 is its only rule. "before" is not
    // in the "Keys" section: it comes before it.
    expect(cats[0]!.rules).toEqual([1])
    expect(cats[1]!.rules).toEqual([3])
    expect(cats[0]!.index).toBe(0)
    expect(cats[1]!.index).toBe(2)
  })

  it('puts the rules before the first section in an Uncategorized section', () => {
    const p = profile(rule('one'), rule('***** Trophies *****'), rule('two'))
    const cats = categorizeRules(p)
    expect(cats[0]!.name).toBe('Uncategorized')
    expect(cats[0]!.rules).toEqual([0])
    expect(cats[1]!.name).toBe('***** Trophies *****')
    expect(cats[1]!.rules).toEqual([2])
  })

  it('does not trim a name that is not a section marker', () => {
    // A trailing star with no leading stars is not a marker.
    const p = profile(rule('* one *'), rule('two **'), rule('*** three'))
    expect(categorizeRules(p).map((c) => c.name)).toEqual(['Uncategorized'])
    expect(categorizeRules(p)[0]!.rules).toEqual([0, 1, 2])
  })

  it('finds 16 top sections and 50 sub-sections in LootSnobV4.utl', () => {
    const cats = categorizeRules(fixture('LootSnobV4.utl'))
    expect(cats.filter((c) => !c.sub && c.name !== 'Uncategorized')).toHaveLength(16)
    expect(cats.filter((c) => c.sub)).toHaveLength(50)
  })

  it('finds 3 top sections and no sub-section in IAC_Level_NoCash.utl', () => {
    const cats = categorizeRules(fixture('IAC_Level_NoCash.utl'))
    expect(cats.filter((c) => !c.sub && c.name !== 'Uncategorized')).toHaveLength(3)
    expect(cats.filter((c) => c.sub)).toHaveLength(0)
  })

  it('gives each rule exactly one section, and every section is a run of rules', () => {
    const p = fixture('LootSnobV4.utl')
    const cats = categorizeRules(p)
    const all = cats.flatMap((c) => c.rules).sort((a, b) => a - b)
    // Every rule index appears once, unless it is a marker rule.
    const markers = new Set(cats.map((c) => c.index).filter((i) => i >= 0))
    const expected = p.rules.map((_, i) => i).filter((i) => !markers.has(i))
    expect(all).toEqual(expected)
  })
})

describe('setRuleEnabled', () => {
  it('removes every DisabledRule when the rule turns on', () => {
    const p = profile(rule('r', [{ type: eLootRuleType.DisabledRule, b: true }, { type: 6, keyval: 1 }]))
    const next = setRuleEnabled(p, 0, true)
    expect(next.rules[0]!.requirements).toEqual([{ type: 6, keyval: 1 }])
  })

  it('adds one DisabledRule with b true when the rule turns off', () => {
    const p = profile(rule('r', [{ type: 6, keyval: 1 }]))
    const next = setRuleEnabled(p, 0, false)
    expect(next.rules[0]!.requirements).toEqual([
      { type: 6, keyval: 1 },
      { type: eLootRuleType.DisabledRule, b: true },
    ])
  })

  it('leaves another rule alone and never changes its input', () => {
    const p = profile(rule('a'), rule('b'))
    const next = setRuleEnabled(p, 1, false)
    expect(next.rules[0]!.requirements).toEqual([])
    expect(p.rules[1]!.requirements).toEqual([])
  })

  it('gives the same profile for a bad index', () => {
    const p = profile(rule('a'))
    expect(setRuleEnabled(p, 5, false)).toBe(p)
    expect(setRuleEnabled(p, -1, true)).toBe(p)
  })
})

describe('ruleSummary', () => {
  it('names each requirement with its acts-on key and value', () => {
    // Type 12, LongValKeyE on "Weapon mastery category" (vk 353), value 8.
    const r = rule('(W+) Bow', [{ type: 12, keyval: 8, vk: 353 }])
    expect(ruleSummary(r)).toBe('LongValKeyE WeaponMasteryCategory 8')
  })

  it('shows a type with no acts-on key by its name and value alone', () => {
    expect(ruleSummary(rule('r', [{ type: 6, keyval: 1.5 }]))).toBe('DamagePercentGE 1.5')
  })

  it('skips a DisabledRule and gives an empty text for a rule with no other requirement', () => {
    expect(ruleSummary(rule('r', [{ type: eLootRuleType.DisabledRule, b: true }]))).toBe('')
  })

  it('joins the requirements in order with a comma', () => {
    const r = rule('r', [
      { type: 7, vk: 9 },
      { type: eLootRuleType.DisabledRule, b: true },
      { type: 2005, keyval: 1.1, vk: 29 },
    ])
    expect(ruleSummary(r)).toBe('ObjectClass MissileWeapon, BuffedDoubleValKeyGE MeleeDefenseBonus 1.1')
  })

  it('describes a regex requirement with its pattern, not a number', () => {
    expect(ruleSummary(rule('r', [{ type: 1, pattern: '-->', key: 16 }]))).toBe(
      'StringValueMatch FullDescription -->',
    )
  })

  it('gives a plain text for the real (W+) Bow of IAC_Level_NoCash.utl', () => {
    const p = fixture('IAC_Level_NoCash.utl')
    const bow = p.rules.find((r) => r.name === '(W+) Bow')!
    expect(ruleSummary(bow)).toBe(
      'LongValKeyE WeaponMasteryCategory 8, ObjectClass MissileWeapon, ' +
        'LongValKeyE WieldReqAttribute 47, BuffedDoubleValKeyGE MeleeDefenseBonus 1.1, ' +
        'StringValueMatch FullDescription -->, StringValueMatch FullDescription ->',
    )
  })
})

describe('requirementSummary', () => {
  it('names the type, the acts-on key and the value', () => {
    expect(requirementSummary({ type: 12, keyval: 8, vk: 353 })).toBe(
      'LongValKeyE WeaponMasteryCategory 8',
    )
  })

  it('gives an empty text for a DisabledRule', () => {
    expect(requirementSummary({ type: eLootRuleType.DisabledRule, b: true })).toBe('')
  })
})

describe('categorizeRules and setRuleEnabled on a real fixture', () => {
  it('turns a rule on and off in LootSnobV4.utl and the file still round-trips', () => {
    const p = fixture('LootSnobV4.utl')
    // Rule 0 is the Trophies marker, which is off. Turn it on.
    const on = setRuleEnabled(p, 0, true)
    expect(on.rules[0]!.requirements.some((q) => q.type === 9999)).toBe(false)
    const off = setRuleEnabled(on, 0, false)
    expect(off.rules[0]!.requirements.some((q) => q.type === 9999)).toBe(true)
    // Toggling off appends the DisabledRule, so the bytes move. The file must
    // still read and write the same bytes as the changed profile.
    expect(writeProfile(readProfile(writeProfile(off)))).toBe(writeProfile(off))
  })
})
