// Tests for readProfile and writeProfile.
// Types 0-13, 1000-1004 and 14-17 and 9999 are parsed (T07-T12). Every
// other type stays raw text, so a fixture round-trips only when each
// requirement's length prefix is exact.

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
    expect(profile.extraBlocks[0]!.kind).toBe('salvageCombine')
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
      // Type 7 in the same rule.
      { type: 7, vk: 7 },
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

describe('requirement type 7, ObjectClass', () => {
  it('writes one line and reads it back', () => {
    const profile = literalProfile([{ type: 7, vk: 7 }])
    const text = writeProfile(profile)

    // LootRules.cs 891-893: one ObjectClass line, written as (int)vk.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;7\r\n3\r\n7\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the real example of UnfamilarShores.utl', () => {
    const text = readFileSync('fixtures/UnfamilarShores.utl', 'latin1')
    const requirements = readProfile(text).rules[1]!.requirements
    expect(requirements[1]).toEqual({ type: 7, vk: 7 })
  })
})

describe('requirement type 8, SpellCountGE', () => {
  it('writes one keyval line and reads it back', () => {
    const profile = literalProfile([{ type: 8, keyval: 3 }])
    const text = writeProfile(profile)

    // LootRules.cs 957-959: one Convert.ToInt32 keyval line.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;8\r\n3\r\n3\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads a negative keyval back with its sign', () => {
    const profile = literalProfile([{ type: 8, keyval: -2 }])
    expect(readProfile(writeProfile(profile))).toEqual(profile)
  })
})

describe('requirement type 9, SpellMatch', () => {
  it('writes the two regex patterns and the count, and reads them back', () => {
    const profile = literalProfile([
      { type: 9, rxDoesMatch: 'a', rxDoesNotMatch: 'b', count: 2 },
    ])
    const text = writeProfile(profile)

    // LootRules.cs 1043-1046: two regex lines, then the Count line.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;9\r\n9\r\na\r\nb\r\n2\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('keeps an empty "does not match" pattern as an empty line', () => {
    const profile = literalProfile([{ type: 9, rxDoesMatch: 'x', rxDoesNotMatch: '', count: 1 }])
    expect(readProfile(writeProfile(profile))).toEqual(profile)
  })

  it('reads the real example of vtclassic_editor_rich.utl', () => {
    const text = readFileSync('fixtures/vtclassic_editor_rich.utl', 'latin1')
    expect(readProfile(text).rules[0]!.requirements[0]).toEqual({
      type: 9,
      rxDoesMatch: 'Legendary Str|Legendary End|Legendary Coord',
      rxDoesNotMatch: 'Epic|Major|Minor',
      count: 2,
    })
  })
})

describe('requirement type 1000, CharacterSkillGE', () => {
  it('writes the skill value and the skill id, and reads them back', () => {
    const profile = literalProfile([{ type: 1000, keyval: 350, vk: 23 }])
    const text = writeProfile(profile)

    // LootRules.cs 1264-1273: keyval line, then the VTCSkillID line as (int)vk.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;1000\r\n9\r\n350\r\n23\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the real example of ILT_Legendary.utl', () => {
    const text = readFileSync('fixtures/ILT_Legendary.utl', 'latin1')
    const rule = readProfile(text).rules.find((r) => r.name === '    (T) Shattered Mana Forge Key')!
    expect(rule.requirements[1]).toEqual({ type: 1000, keyval: 350, vk: 23 })
  })
})

describe('requirement type 1001, CharacterMainPackEmptySlotsGE', () => {
  it('writes one keyval line and reads it back', () => {
    const profile = literalProfile([{ type: 1001, keyval: 12 }])
    const text = writeProfile(profile)

    // LootRules.cs 1344-1351: one Convert.ToInt32 keyval line.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;1001\r\n4\r\n12\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the real example of IAC_Level_NoCash.utl', () => {
    const text = readFileSync('fixtures/IAC_Level_NoCash.utl', 'latin1')
    const rule = readProfile(text).rules.find((r) => r.name === '($) Veteran')!
    expect(rule.requirements[2]).toEqual({ type: 1001, keyval: 12 })
  })
})

describe('requirement types 1002 and 1003, CharacterLevelGE and CharacterLevelLE', () => {
  it('write one keyval line each and read them back', () => {
    const profile = literalProfile([
      { type: 1002, keyval: 100 },
      { type: 1003, keyval: 27 },
    ])
    const text = writeProfile(profile)

    // LootRules.cs 1635-1642 and 1692-1699: one Convert.ToInt32 keyval line each.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;1002;1003\r\n5\r\n100\r\n4\r\n27\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads a negative keyval back with its sign', () => {
    const profile = literalProfile([{ type: 1002, keyval: -1 }])
    expect(readProfile(writeProfile(profile))).toEqual(profile)
  })
})

describe('requirement type 1004, CharacterBaseSkill', () => {
  it('writes the skill id, the minimum and the maximum, and reads them back', () => {
    const profile = literalProfile([{ type: 1004, vk: 1, minskill: 50, maxskill: 999 }])
    const text = writeProfile(profile)

    // LootRules.cs 1763-1774: vk line, minskill line, maxskill line.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;1004\r\n12\r\n1\r\n50\r\n999\r\n')
    expect(readProfile(text)).toEqual(profile)
  })
})

describe('requirement type 9999, DisabledRule', () => {
  it('writes true and false as lowercase one-line bodies and reads them back', () => {
    const profile = literalProfile([
      { type: 9999, b: true },
      { type: 9999, b: false },
    ])
    const text = writeProfile(profile)

    // LootRules.cs 1842-1844: one line, "true" or "false".
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;9999;9999\r\n6\r\ntrue\r\n7\r\nfalse\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads only lowercase true as true, as "true".Equals does', () => {
    const text = 'UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;9999\r\n6\r\nTrue\r\n'
    expect(readProfile(text).rules[0]!.requirements).toEqual([{ type: 9999, b: false }])
  })

  it('reads the real example of vtclassic_editor_rich.utl', () => {
    const text = readFileSync('fixtures/vtclassic_editor_rich.utl', 'latin1')
    expect(readProfile(text).rules[0]!.requirements[2]).toEqual({ type: 9999, b: true })
  })
})

describe('requirement type 14, AnySimilarColor', () => {
  it('writes the RGB lines and the two differences, and reads them back', () => {
    const profile = literalProfile([{ type: 14, r: 255, g: 128, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1 }])
    const text = writeProfile(profile)

    // LootRules.cs 1935-1940: R, G, B lines, then MaxDifferenceH and MaxDifferenceSV.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;14\r\n22\r\n255\r\n128\r\n0\r\n10\r\n0.1\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads a comma as the decimal point, as HaxConvertDouble does', () => {
    const text = 'UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;14\r\n22\r\n255\r\n128\r\n0\r\n10\r\n0,1\r\n'
    expect(readProfile(text).rules[0]!.requirements).toEqual([
      { type: 14, r: 255, g: 128, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1 },
    ])
  })
})

describe('requirement type 15, SimilarColorArmorType', () => {
  it('writes the color lines and the armor group, and reads them back', () => {
    const profile = literalProfile([
      { type: 15, r: 255, g: 128, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1, armorGroup: 'Leather' },
    ])
    const text = writeProfile(profile)

    // LootRules.cs 2084-2090: R, G, B, MaxDifferenceH, MaxDifferenceSV, then ArmorGroup.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;15\r\n31\r\n255\r\n128\r\n0\r\n10\r\n0.1\r\nLeather\r\n')
    expect(readProfile(text)).toEqual(profile)
  })
})

describe('requirement type 16, SlotSimilarColor', () => {
  it('writes the color lines and the slot, and reads them back', () => {
    const profile = literalProfile([
      { type: 16, r: 255, g: 128, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1, slot: 3 },
    ])
    const text = writeProfile(profile)

    // LootRules.cs 2240-2245: R, G, B, MaxDifferenceH, MaxDifferenceSV, then Slot.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;16\r\n25\r\n255\r\n128\r\n0\r\n10\r\n0.1\r\n3\r\n')
    expect(readProfile(text)).toEqual(profile)
  })
})

describe('requirement type 17, SlotExactPalette', () => {
  it('writes the slot and the palette, and reads them back', () => {
    const profile = literalProfile([{ type: 17, slot: 2, palette: 12345 }])
    const text = writeProfile(profile)

    // LootRules.cs 2327-2329: Slot line, then Palette line.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;17\r\n10\r\n2\r\n12345\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads a negative slot back with its sign', () => {
    const profile = literalProfile([{ type: 17, slot: -1, palette: 0 }])
    expect(readProfile(writeProfile(profile))).toEqual(profile)
  })
})

describe('T12 types together', () => {
  it('writes and reads all five types in one rule', () => {
    const profile = literalProfile([
      { type: 9999, b: true },
      { type: 14, r: 255, g: 128, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1 },
      { type: 15, r: 255, g: 128, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1, armorGroup: 'Leather' },
      { type: 16, r: 255, g: 128, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1, slot: 3 },
      { type: 17, slot: 2, palette: 12345 },
    ])
    expect(readProfile(writeProfile(profile))).toEqual(profile)
  })
})

describe('requirement types 2000 and 2001, BuffedMedianDamageGE and BuffedMissileDamageGE', () => {
  it('write one keyval line each and read them back', () => {
    const profile = literalProfile([
      { type: 2000, keyval: 5 },
      { type: 2001, keyval: 78.6 },
    ])
    const text = writeProfile(profile)

    // LootRules.cs 2404-2408 and 2471-2475: one double keyval line each.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;2000;2001\r\n3\r\n5\r\n6\r\n78.6\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the real example of LootSnobV4.utl', () => {
    const text = readFileSync('fixtures/LootSnobV4.utl', 'latin1')
    const rule = readProfile(text).rules.find((r) => r.name === '(M) Bow (OD +10)')!
    expect(rule.requirements[2]).toEqual({ type: 2001, keyval: 78.6 })
  })
})

describe('requirement type 2003, BuffedLongValKeyGE', () => {
  it('writes the keyval and the key, and reads them back', () => {
    const profile = literalProfile([{ type: 2003, keyval: 200, vk: 28 }])
    const text = writeProfile(profile)

    // LootRules.cs 2533-2538: keyval line, then the IntValueKey line as (int)vk.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;2003\r\n9\r\n200\r\n28\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the real example of BuffedLongBuffedDouble.utl', () => {
    const text = readFileSync('fixtures/BuffedLongBuffedDouble.utl', 'latin1')
    expect(readProfile(text).rules[0]!.requirements[0]).toEqual({ type: 2003, keyval: 200, vk: 28 })
  })
})

describe('requirement type 2005, BuffedDoubleValKeyGE', () => {
  it('writes the keyval and the key, and reads them back', () => {
    const profile = literalProfile([{ type: 2005, keyval: 20, vk: 167772172 }])
    const text = writeProfile(profile)

    // LootRules.cs 2607-2612: keyval line, then the DoubleValueKey line as (int)vk.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;2005\r\n15\r\n20\r\n167772172\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the real example of BuffedLongBuffedDouble.utl', () => {
    const text = readFileSync('fixtures/BuffedLongBuffedDouble.utl', 'latin1')
    expect(readProfile(text).rules[0]!.requirements[1]).toEqual({
      type: 2005,
      keyval: 20,
      vk: 167772172,
    })
  })
})

describe('requirement type 2006, CalcdBuffedTinkedDamageGE', () => {
  it('writes one keyval line and reads it back', () => {
    const profile = literalProfile([{ type: 2006, keyval: 1.5 }])
    const text = writeProfile(profile)

    // LootRules.cs 2686-2690: one double keyval line.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;2006\r\n5\r\n1.5\r\n')
    expect(readProfile(text)).toEqual(profile)
  })
})

describe('requirement type 2007, TotalRatingsGE', () => {
  it('writes one keyval line and reads it back', () => {
    const profile = literalProfile([{ type: 2007, keyval: 300 }])
    const text = writeProfile(profile)

    // LootRules.cs 2753-2757: one double keyval line.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;2007\r\n5\r\n300\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the real example of BuffedLongBuffedDouble.utl', () => {
    const text = readFileSync('fixtures/BuffedLongBuffedDouble.utl', 'latin1')
    const rule = readProfile(text).rules.find((r) => r.name === 'Quick rule')!
    expect(rule.requirements[1]).toEqual({ type: 2007, keyval: 300 })
  })
})

describe('requirement type 2008, CalcedBuffedTinkedTargetMeleeGE', () => {
  it('writes the three double lines and reads them back', () => {
    const profile = literalProfile([
      { type: 2008, dot: 109, meleeDefenseBonus: 1.17, attackBonus: 1.17 },
    ])
    const text = writeProfile(profile)

    // LootRules.cs 2819-2827: DoT line, melee defense bonus line, attack bonus line.
    expect(text).toBe('UTL\r\n1\r\n1\r\nrule\r\n\r\n0;1;2008\r\n17\r\n109\r\n1.17\r\n1.17\r\n')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the real example of ILT_Legendary.utl', () => {
    const text = readFileSync('fixtures/ILT_Legendary.utl', 'latin1')
    const rule = readProfile(text).rules.find((r) => r.name === '(H) 430 Insane')!
    expect(rule.requirements[2]).toEqual({
      type: 2008,
      dot: 109,
      meleeDefenseBonus: 1.17,
      attackBonus: 1.17,
    })
  })
})

describe('T13 types together', () => {
  it('writes and reads all seven types in one rule', () => {
    const profile = literalProfile([
      { type: 2000, keyval: 5 },
      { type: 2001, keyval: 78.6 },
      { type: 2003, keyval: 200, vk: 28 },
      { type: 2005, keyval: 20, vk: 167772172 },
      { type: 2006, keyval: 1.5 },
      { type: 2007, keyval: 300 },
      { type: 2008, dot: 109, meleeDefenseBonus: 1.17, attackBonus: 1.17 },
    ])
    expect(readProfile(writeProfile(profile))).toEqual(profile)
  })
})

describe('extra block, SalvageCombine', () => {
  it('writes a literal block and reads it back', () => {
    const profile: LootProfile = {
      version: 1,
      rules: [],
      extraBlocks: [
        {
          kind: 'salvageCombine',
          defaultCombineString: '1-6, 7-8, 9, 10',
          materialCombineStrings: new Map([
            [5, '1-10'],
            [13, '3-4'],
          ]),
          materialValueModeValues: new Map([[25, 500]]),
        },
      ],
    }
    const text = writeProfile(profile)

    // UTLFileExtraBlockManager.cs 131-136: type id line, body length line,
    // body. The body copies UTLBlock_SalvageCombine.Write (302-321).
    expect(text).toBe(
      'UTL\r\n1\r\n0\r\nSalvageCombine\r\n53\r\n1\r\n1-6, 7-8, 9, 10\r\n2\r\n5\r\n1-10\r\n13\r\n3-4\r\n1\r\n25\r\n500\r\n',
    )
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads the real block of BuffedLongBuffedDouble.utl', () => {
    const text = readFileSync('fixtures/BuffedLongBuffedDouble.utl', 'latin1')
    const block = readProfile(text).extraBlocks[0]!
    if (block.kind !== 'salvageCombine') throw new Error('expected a parsed SalvageCombine block')

    expect(block.defaultCombineString).toBe('1-6, 7-8, 9, 10')
    expect(block.materialCombineStrings.size).toBe(25)
    // The file is not sorted by material id (52 comes before 51), so the map
    // must keep the file order.
    expect([...block.materialCombineStrings.keys()]).toEqual([
      10, 14, 16, 17, 18, 19, 22, 25, 29, 30, 36, 37, 41, 47, 35, 27, 26, 21, 15, 13, 50, 49, 34, 52, 51,
    ])
    expect(block.materialCombineStrings.get(10)).toBe('1-10')
    expect(block.materialValueModeValues.size).toBe(0)
  })

  it('round-trips BuffedLongBuffedDouble.utl with its block parsed', () => {
    const text = readFileSync('fixtures/BuffedLongBuffedDouble.utl', 'latin1')
    const profile = readProfile(text)
    expect(profile.extraBlocks.map((b) => b.kind)).toEqual(['salvageCombine'])
    expect(writeProfile(profile)).toBe(text)
  })

  it('keeps a block with an unknown type id as raw data', () => {
    const profile: LootProfile = {
      version: 1,
      rules: [],
      extraBlocks: [{ kind: 'raw', typeId: 'SomeFutureBlock', data: 'abc\r\ndef' }],
    }
    const text = writeProfile(profile)

    expect(text).toBe('UTL\r\n1\r\n0\r\nSomeFutureBlock\r\n8\r\nabc\r\ndef')
    expect(readProfile(text)).toEqual(profile)
  })

  it('reads an old block that ends before the value mode section', () => {
    // UTLBlock_SalvageCombine.cs 289-290: an old block has no value mode lines.
    const text =
      'UTL\r\n1\r\n0\r\nSalvageCombine\r\n32\r\n1\r\n1-6, 7-8, 9, 10\r\n1\r\n5\r\n1-10\r\n'
    const block = readProfile(text).extraBlocks[0]!
    if (block.kind !== 'salvageCombine') throw new Error('expected a parsed SalvageCombine block')
    expect([...block.materialCombineStrings]).toEqual([[5, '1-10']])
    expect(block.materialValueModeValues.size).toBe(0)

    // UTLBlock_SalvageCombine.cs 315: the writer always writes the count, so
    // an old block gains the "0" line on save.
    expect(writeProfile(readProfile(text))).toBe(
      'UTL\r\n1\r\n0\r\nSalvageCombine\r\n35\r\n1\r\n1-6, 7-8, 9, 10\r\n1\r\n5\r\n1-10\r\n0\r\n',
    )
  })

  it('throws on a bad integer line, as the C# int.Parse does', () => {
    // UTLBlock_SalvageCombine.cs 281: int.Parse of the material count throws
    // on a missing or a non-numeric line, so a bad block fails to load
    // instead of reading a wrong one.
    const badCount = 'UTL\r\n1\r\n0\r\nSalvageCombine\r\n25\r\n1\r\n1-6, 7-8, 9, 10\r\nabc\r\n'
    expect(() => readProfile(badCount)).toThrow(/material count/)

    const missingLine = 'UTL\r\n1\r\n0\r\nSalvageCombine\r\n3\r\n1\r\n'
    expect(() => readProfile(missingLine)).toThrow(/material count/)
  })
})

describe('readProfile on a file that is not a profile', () => {
  it('throws, so a save cannot write an empty profile over the wrong file', () => {
    for (const text of ['', 'not a profile', '12abc\r\n', 'UTL\r\nx\r\n0\r\n', 'UTL\r\n1\r\n-1\r\n']) {
      expect(() => readProfile(text), JSON.stringify(text)).toThrow('This file is not a loot profile.')
    }
  })
})
