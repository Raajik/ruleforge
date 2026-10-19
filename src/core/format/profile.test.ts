// Tests for readProfile and writeProfile.
// Types 0 and 1 are parsed (T07); every other type stays raw text, so a fixture
// round-trips only when each requirement's length prefix is exact.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eLootAction } from './enums'
import { LootProfile, readProfile, writeProfile } from './profile'

function literalProfile(requirements: LootProfile['rules'][number]['requirements']): LootProfile {
  return {
    version: 1,
    rules: [
      {
        name: 'rule',
        customExpression: '',
        priority: 0,
        action: eLootAction.Keep,
        lootActionData: 0,
        requirements,
      },
    ],
    extraBlocks: [],
  }
}

describe('readProfile and writeProfile', () => {
  it('round-trips the fixtures byte for byte, typed and raw requirements mixed', () => {
    for (const name of [
      'vtclassic_editor_minimal.utl',
      'vtclassic_editor_rich.utl',
      'BuffedLongBuffedDouble.utl',
      'UnfamilarShores.utl',
    ]) {
      const text = readFileSync(`fixtures/${name}`, 'latin1')
      expect(writeProfile(readProfile(text)), name).toBe(text)
    }
  })

  it('reads the rule and the raw requirement of the minimal fixture', () => {
    const text = readFileSync('fixtures/vtclassic_editor_minimal.utl', 'latin1')
    const profile = readProfile(text)

    expect(profile.version).toBe(1)
    expect(profile.rules).toHaveLength(1)

    const rule = profile.rules[0]!
    expect(rule.name).toBe('fixture_minimal_editor')
    expect(rule.customExpression).toBe('')
    expect(rule.priority).toBe(0)
    expect(rule.action).toBe(eLootAction.Keep)
    expect(rule.requirements).toEqual([{ type: 0, pattern: 'Legendary Strength' }])

    expect(profile.extraBlocks).toHaveLength(1)
    expect(profile.extraBlocks[0]!.typeId).toBe('SalvageCombine')
    expect(profile.extraBlocks[0]!.data.length).toBe(277)
  })

  it('reads the KeepUpTo value and multiple raw requirements of the rich fixture', () => {
    const text = readFileSync('fixtures/vtclassic_editor_rich.utl', 'latin1')
    const rule = readProfile(text).rules[0]!

    expect(rule.name).toBe('richer-rule')
    expect(rule.action).toBe(eLootAction.KeepUpTo)
    expect(rule.lootActionData).toBe(17)
    expect(rule.requirements.map((r) => r.type)).toEqual([9, 5, 9999])
  })

  it('reads a version 0 header, which has no version line', () => {
    const profile = readProfile('0\r\n')
    expect(profile.version).toBe(0)
    expect(profile.rules).toHaveLength(0)
  })
})

describe('requirement type 0, SpellNameMatch', () => {
  it('writes one line and reads it back', () => {
    const profile = literalProfile([{ type: 0, pattern: 'Legendary .*' }])
    const text = writeProfile(profile)

    // LootRules.cs 313: the body is one line, so the prefix is 12 + CRLF.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;0\r\n14\r\nLegendary .*\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('keeps an empty pattern as an empty line', () => {
    const profile = literalProfile([{ type: 0, pattern: '' }])
    expect(readProfile(writeProfile(profile))).toEqual(profile)
  })

  it('reads the real example of vtclassic_editor_minimal.utl', () => {
    const text = readFileSync('fixtures/vtclassic_editor_minimal.utl', 'latin1')
    expect(readProfile(text).rules[0]!.requirements).toEqual([
      { type: 0, pattern: 'Legendary Strength' },
    ])
  })
})

describe('requirement type 1, StringValueMatch', () => {
  it('writes the pattern and the key, and reads them back', () => {
    const profile = literalProfile([{ type: 1, pattern: 'Name', key: 16 }])
    const text = writeProfile(profile)

    // LootRules.cs 379: pattern line, then the key line.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;1\r\n10\r\nName\r\n16\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the five real examples of UnfamilarShores.utl', () => {
    const text = readFileSync('fixtures/UnfamilarShores.utl', 'latin1')
    const requirements = readProfile(text).rules.flatMap((r) => r.requirements)

    expect(requirements).toEqual([
      {
        type: 1,
        pattern: 'Holy Grail|Shimmering Skeleton Key|Sunscript|Doubloon|Shekel|Chronoglyph|Dark Revenant Thighbone|Olthoi Ichor',
        key: 1,
      },
      { type: 1, pattern: 'Pyreal', key: 1 },
      // Type 7 stays raw after the typed requirement of the same rule.
      { type: 7, data: '7\r\n' },
      { type: 1, pattern: 'Scroll', key: 1 },
      { type: 1, pattern: 'Blank Exploration Contract|Map', key: 1 },
      { type: 1, pattern: 'Mote', key: 1 },
    ])
  })
})
