// Tests for readProfile and writeProfile.
// Types 0-6 and 10-13 are parsed (T07-T09). Every other type
// stays raw text, so a fixture round-trips only when each requirement's
// length prefix is exact.

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
      'IAC_Level_NoCash.utl',
      'IAC_Level_ONLYCash.utl',
      'ILT_Legendary.utl',
      'LootSnobV4.utl',
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

describe('requirement type 2, LongValKeyLE', () => {
  it('writes the key and the value key, and reads them back', () => {
    const profile = literalProfile([{ type: 2, keyval: 700, vk: 5 }])
    const text = writeProfile(profile)

    // LootRules.cs 454-461: keyval line, then the IntValueKey number.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;2\r\n8\r\n700\r\n5\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads a negative keyval back with its sign', () => {
    const profile = literalProfile([{ type: 2, keyval: -5, vk: 5 }])
    expect(readProfile(writeProfile(profile))).toEqual(profile)
  })

  it('reads the real example of IAC_Level_NoCash.utl', () => {
    const text = readFileSync('fixtures/IAC_Level_NoCash.utl', 'latin1')
    const rule = readProfile(text).rules[13]!
    expect(rule.name).toBe('(A+) Armor')
    expect(rule.requirements[2]).toEqual({ type: 2, keyval: 700, vk: 5 })
  })
})

describe('requirement type 3, LongValKeyGE', () => {
  it('writes the key and the value key, and reads them back', () => {
    const profile = literalProfile([{ type: 3, keyval: 200, vk: 28 }])
    const text = writeProfile(profile)

    // LootRules.cs 571-578: keyval line, then the IntValueKey number.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;3\r\n9\r\n200\r\n28\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the real example of IAC_Level_NoCash.utl', () => {
    const text = readFileSync('fixtures/IAC_Level_NoCash.utl', 'latin1')
    const rule = readProfile(text).rules[13]!
    expect(rule.requirements[3]).toEqual({ type: 3, keyval: 200, vk: 28 })
  })
})

describe('requirement type 11, LongValKeyFlagExists', () => {
  it('writes the key and the value key, and reads them back', () => {
    const profile = literalProfile([{ type: 11, keyval: 3, vk: 2 }])
    const text = writeProfile(profile)

    // LootRules.cs 1187-1194: keyval line, then the IntValueKey number.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;11\r\n6\r\n3\r\n2\r\n')
    expect(readProfile(text)).toEqual(profile)
  })
})

describe('requirement type 12, LongValKeyE', () => {
  it('writes the key and the value key, and reads them back', () => {
    const profile = literalProfile([{ type: 12, keyval: 8, vk: 353 }])
    const text = writeProfile(profile)

    // LootRules.cs 1412-1419: keyval line, then the IntValueKey number.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;12\r\n8\r\n8\r\n353\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the two real examples of IAC_Level_NoCash.utl', () => {
    const text = readFileSync('fixtures/IAC_Level_NoCash.utl', 'latin1')
    const rule = readProfile(text).rules[2]!
    expect(rule.name).toBe('(W+) Bow')
    expect(rule.requirements[0]).toEqual({ type: 12, keyval: 8, vk: 353 })
    expect(rule.requirements[2]).toEqual({ type: 12, keyval: 47, vk: 159 })
  })
})

describe('requirement type 13, LongValKeyNE', () => {
  it('writes the key and the value key, and reads them back', () => {
    const profile = literalProfile([{ type: 13, keyval: 10, vk: 353 }])
    const text = writeProfile(profile)

    // LootRules.cs 1529-1536: keyval line, then the IntValueKey number.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;13\r\n9\r\n10\r\n353\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the real example of IAC_Level_NoCash.utl', () => {
    const text = readFileSync('fixtures/IAC_Level_NoCash.utl', 'latin1')
    const rule = readProfile(text).rules[5]!
    expect(rule.name).toBe('(W+) Weapon')
    expect(rule.requirements[2]).toEqual({ type: 13, keyval: 10, vk: 353 })
  })
})

describe('requirement types 4 and 5, DoubleValKeyLE and DoubleValKeyGE', () => {
  it('writes the keyval as G15 and the value key, and reads them back', () => {
    const profile = literalProfile([{ type: 4, keyval: 0.1 + 0.2, vk: 167772171 }])
    const text = writeProfile(profile)

    // LootRules.cs 692-696: keyval with Convert.ToString, then (int)vk.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;4\r\n16\r\n0.3\r\n167772171\r\n')
    expect(readProfile(text).rules[0]!.requirements[0]).toEqual({ type: 4, keyval: 0.3, vk: 167772171 })
  })

  it('reads the real examples of LootSnobV4.utl', () => {
    const rules = readProfile(readFileSync('fixtures/LootSnobV4.utl', 'latin1')).rules
    expect(rules[211]!.requirements[4]).toEqual({ type: 5, keyval: 1.04, vk: 150 })
    expect(rules[472]!.requirements[5]).toEqual({ type: 4, keyval: 0.53, vk: 167772171 })
  })
})

describe('requirement types 6 and 10, DamagePercentGE and MinDamageGE', () => {
  it('writes one keyval line and reads it back', () => {
    const profile = literalProfile([
      { type: 6, keyval: 1.5e20 },
      { type: 10, keyval: 12 },
    ])
    const text = writeProfile(profile)

    // LootRules.cs 832-835 and 1124-1127: one keyval line each.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;6;10\r\n9\r\n1.5E+20\r\n4\r\n12\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads a comma as the decimal point and bad text as 0, as HaxConvertDouble does', () => {
    const text = 'UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;6;10\r\n5\r\n1,5\r\n5\r\nabc\r\n'
    expect(readProfile(text).rules[0]!.requirements).toEqual([
      { type: 6, keyval: 1.5 },
      { type: 10, keyval: 0 },
    ])
  })
})
