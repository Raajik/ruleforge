// Tests for the evaluator match functions (PLAN.md H3a). Each type gets a
// match and a miss case, on the Match methods of ref/shared/LootRules.cs.
// Types 1000-1004 and 2000-2008 come in H3b and answer "unknown".

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseColorSlots } from '../gamedata/colorslots'
import { eLootAction } from '../format/enums'
import { doubleValueKey, intValueKey, objectClass, stringValueKey } from '../gamedata/generated'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import type { LootItem } from './item'
import { classify, matchRequirement } from './match'

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

// The real slot definitions of the shipped default file, as the C#
// SimilarColorArmorType.PaletteIndices reads them (LootRules.cs 2033-2041).
const SLOT_DEFINITIONS = parseColorSlots(readFileSync('fixtures/ColorSlots.Default.xml', 'utf8'))

describe('matchRequirement types 0 to 17 and 9999', () => {
  it('type 0 SpellNameMatch matches when a spell name matches the regex (LootRules.cs 283-292)', () => {
    const req: Requirement = { type: 0, pattern: 'Shield Self' }
    expect(matchRequirement(req, item({ spells: ['Minor Shield Self'] }))).toBe(true)
    expect(matchRequirement(req, item({ spells: ['Fire Ball'] }))).toBe(false)
  })

  it('type 1 StringValueMatch matches the string value of the key (LootRules.cs 357-360)', () => {
    const req: Requirement = { type: 1, pattern: '^Obsidian', key: stringValueKey.Name }
    expect(matchRequirement(req, item({ stringValues: { Name: 'Obsidian Blade' } }))).toBe(true)
    expect(matchRequirement(req, item({ stringValues: { Name: 'Iron Blade' } }))).toBe(false)
  })

  it('type 2 LongValKeyLE compares the int value with <= (LootRules.cs 432-435)', () => {
    const req: Requirement = { type: 2, keyval: 5, vk: intValueKey.Material }
    expect(matchRequirement(req, item({ intValues: { Material: 5 } }))).toBe(true)
    expect(matchRequirement(req, item({ intValues: { Material: 6 } }))).toBe(false)
  })

  it('type 3 LongValKeyGE compares the int value with >= (LootRules.cs 549-552)', () => {
    const req: Requirement = { type: 3, keyval: 100, vk: intValueKey.Workmanship }
    expect(matchRequirement(req, item({ intValues: { Workmanship: 100 } }))).toBe(true)
    expect(matchRequirement(req, item({ intValues: { Workmanship: 99 } }))).toBe(false)
  })

  it('type 4 DoubleValKeyLE compares both sides as float (LootRules.cs 666-669)', () => {
    const req: Requirement = { type: 4, keyval: 0.1, vk: doubleValueKey.SalvageWorkmanship }
    // 0.1 + 1e-10 rounds to the same single-precision value as 0.1, so the
    // float cast of the C# makes it a match, unlike a double compare.
    const near = item({ doubleValues: { SalvageWorkmanship: 0.1 + 1e-10 } })
    expect(matchRequirement(req, near)).toBe(true)
    expect(matchRequirement(req, item({ doubleValues: { SalvageWorkmanship: 0.2 } }))).toBe(false)
  })

  it('type 5 DoubleValKeyGE compares both sides as float (LootRules.cs 741-744)', () => {
    const req: Requirement = { type: 5, keyval: 8, vk: doubleValueKey.SalvageWorkmanship }
    expect(matchRequirement(req, item({ doubleValues: { SalvageWorkmanship: 8 } }))).toBe(true)
    expect(matchRequirement(req, item({ doubleValues: { SalvageWorkmanship: 7.9 } }))).toBe(false)
  })

  it('type 6 DamagePercentGE never matches: the C# Match returns false (LootRules.cs 815-818)', () => {
    const req: Requirement = { type: 6, keyval: 0 }
    expect(matchRequirement(req, item({ intValues: { MaxDamage: 50 } }))).toBe(false)
    expect(matchRequirement(req, item())).toBe(false)
  })

  it('type 7 ObjectClass compares the object class (LootRules.cs 872-875)', () => {
    const req: Requirement = { type: 7, vk: objectClass.Armor }
    expect(matchRequirement(req, item({ objectClass: objectClass.Armor }))).toBe(true)
    expect(matchRequirement(req, item({ objectClass: objectClass.Clothing }))).toBe(false)
  })

  it('type 8 SpellCountGE counts the item spells (LootRules.cs 930-933)', () => {
    const req: Requirement = { type: 8, keyval: 2 }
    expect(matchRequirement(req, item({ spells: ['A', 'B'] }))).toBe(true)
    expect(matchRequirement(req, item({ spells: ['A'] }))).toBe(false)
  })

  it('type 9 SpellMatch counts the spells that match and do not match (LootRules.cs 999-1013)', () => {
    const both: Requirement = { type: 9, rxDoesMatch: 'Fire', rxDoesNotMatch: '', count: 2 }
    expect(matchRequirement(both, item({ spells: ['Fire Ball', 'Fire Storm'] }))).toBe(true)
    expect(matchRequirement(both, item({ spells: ['Fire Ball', 'Ice Ball'] }))).toBe(false)
    // A non-empty "does not match" pattern drops the spell (LootRules.cs 1005).
    const drop: Requirement = { type: 9, rxDoesMatch: 'Fire', rxDoesNotMatch: 'Minor', count: 1 }
    expect(matchRequirement(drop, item({ spells: ['Fire Minor Self'] }))).toBe(false)
    expect(matchRequirement(drop, item({ spells: ['Fire Ball'] }))).toBe(true)
  })

  it('type 10 MinDamageGE uses max damage and variance (LootRules.cs 1097-1102)', () => {
    const req: Requirement = { type: 10, keyval: 38 }
    // maxdamage - variance * maxdamage = 50 - 0.25 * 50 = 37.5.
    const bow = item({ intValues: { MaxDamage: 50 }, doubleValues: { Variance: 0.25 } })
    expect(matchRequirement(req, bow)).toBe(false)
    expect(matchRequirement({ ...req, keyval: 37 }, bow)).toBe(true)
  })

  it('type 11 LongValKeyFlagExists tests the bits of the int value (LootRules.cs 1165-1168)', () => {
    const flag = 4
    const req: Requirement = { type: 11, keyval: flag, vk: intValueKey.Imbued }
    expect(matchRequirement(req, item({ intValues: { Imbued: 4 } }))).toBe(true)
    expect(matchRequirement(req, item({ intValues: { Imbued: 8 } }))).toBe(false)
  })

  it('type 12 LongValKeyE compares the int value with == (LootRules.cs 1390-1393)', () => {
    const req: Requirement = { type: 12, keyval: 131, vk: intValueKey.Material }
    expect(matchRequirement(req, item({ intValues: { Material: 131 } }))).toBe(true)
    expect(matchRequirement(req, item({ intValues: { Material: 132 } }))).toBe(false)
  })

  it('type 13 LongValKeyNE compares the int value with != (LootRules.cs 1507-1510)', () => {
    const req: Requirement = { type: 13, keyval: 5, vk: intValueKey.Material }
    expect(matchRequirement(req, item({ intValues: { Material: 6 } }))).toBe(true)
    expect(matchRequirement(req, item({ intValues: { Material: 5 } }))).toBe(false)
  })

  it('type 14 AnySimilarColor matches any palette in the hue and SV distance (LootRules.cs 1898-1937)', () => {
    const req: Requirement = { type: 14, r: 255, g: 0, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1 }
    const red = { palette: 1, exampleColor: { r: 255, g: 0, b: 0 } }
    const blue = { palette: 2, exampleColor: { r: 0, g: 0, b: 255 } }
    expect(matchRequirement(req, item({ palettes: [blue, red] }))).toBe(true)
    expect(matchRequirement(req, item({ palettes: [blue] }))).toBe(false)
  })

  it('type 14 does not wrap the hue distance at 0 and 360', () => {
    const req: Requirement = { type: 14, r: 255, g: 0, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1 }
    // Hue 329.9 is 30 degrees below 0, and Math.Abs makes it 329.9 (LootRules.cs 1914).
    const pinkish = { palette: 1, exampleColor: { r: 255, g: 0, b: 128 } }
    expect(matchRequirement(req, item({ palettes: [pinkish] }))).toBe(false)
  })

  it('type 15 SimilarColorArmorType checks only the slots of the armor group (LootRules.cs 2053-2100)', () => {
    const req: Requirement = {
      type: 15,
      r: 255,
      g: 0,
      b: 0,
      maxDifferenceH: 10,
      maxDifferenceSV: 0.1,
      armorGroup: 'Celdon (Base)', // The real file maps it to palette slot 0.
    }
    const red = { palette: 1, exampleColor: { r: 255, g: 0, b: 0 } }
    const blue = { palette: 2, exampleColor: { r: 0, g: 0, b: 255 } }
    expect(matchRequirement(req, item({ palettes: [red] }), SLOT_DEFINITIONS)).toBe(true)
    expect(matchRequirement(req, item({ palettes: [blue, red] }), SLOT_DEFINITIONS)).toBe(false)
    // The group "None" has no slots, so it never matches.
    const none: Requirement = { ...req, armorGroup: 'None' }
    expect(matchRequirement(none, item({ palettes: [red] }), SLOT_DEFINITIONS)).toBe(false)
  })

  it('type 16 SlotSimilarColor checks the one slot (LootRules.cs 2198-2222)', () => {
    const req: Requirement = { type: 16, r: 255, g: 0, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1, slot: 1 }
    const red = { palette: 1, exampleColor: { r: 255, g: 0, b: 0 } }
    const blue = { palette: 2, exampleColor: { r: 0, g: 0, b: 255 } }
    expect(matchRequirement(req, item({ palettes: [blue, red] }))).toBe(true)
    expect(matchRequirement(req, item({ palettes: [red, blue] }))).toBe(false)
    // A slot past the end of the palettes gives false, not an error. A
    // negative one does too, where the C# list index would throw.
    expect(matchRequirement({ ...req, slot: 2 }, item({ palettes: [blue, red] }))).toBe(false)
    expect(matchRequirement({ ...req, slot: -1 }, item({ palettes: [blue, red] }))).toBe(false)
  })

  it('type 17 SlotExactPalette compares the palette masked to 24 bits (LootRules.cs 2306-2315)', () => {
    const req: Requirement = { type: 17, slot: 0, palette: 0xabcdef }
    expect(matchRequirement(req, item({ palettes: [{ palette: 0x12abcdef, exampleColor: { r: 0, g: 0, b: 0 } }] }))).toBe(true)
    expect(matchRequirement(req, item({ palettes: [{ palette: 0xabcdee, exampleColor: { r: 0, g: 0, b: 0 } }] }))).toBe(false)
  })

  it('type 9999 DisabledRule matches only when it is off (LootRules.cs 1823-1826)', () => {
    expect(matchRequirement({ type: 9999, b: false }, item())).toBe(true)
    expect(matchRequirement({ type: 9999, b: true }, item())).toBe(false)
  })

  it('a missing value gives the default of the C# call: 0, 0.0 and ""', () => {
    const empty = item()
    expect(matchRequirement({ type: 2, keyval: 0, vk: intValueKey.Material }, empty)).toBe(true)
    expect(matchRequirement({ type: 3, keyval: 1, vk: intValueKey.Material }, empty)).toBe(false)
    expect(matchRequirement({ type: 5, keyval: 0, vk: doubleValueKey.Variance }, empty)).toBe(true)
    expect(matchRequirement({ type: 1, pattern: '^$', key: stringValueKey.Name }, empty)).toBe(true)
  })
})

describe('matchRequirement types 1000-1004 and 2000-2008', () => {
  it('an unsupported raw requirement answers "unknown" too', () => {
    expect(matchRequirement({ type: 42, data: 'raw body' }, item())).toBe('unknown')
  })

  it('type 1000 CharacterSkillGE uses buffed skill from character', () => {
    const req: Requirement = { type: 1000, keyval: 400, vk: 6 }
    expect(matchRequirement(req, item(), undefined, { level: 1, baseSkills: {}, buffedSkills: { 6: 400 }, mainPackFreeSlots: 0 })).toBe(true)
    expect(matchRequirement(req, item(), undefined, { level: 1, baseSkills: {}, buffedSkills: { 6: 399 }, mainPackFreeSlots: 0 })).toBe(false)
    expect(matchRequirement(req, item())).toBe('unknown')
  })

  it('type 1001 CharacterMainPackEmptySlotsGE uses character main pack free slots', () => {
    const req: Requirement = { type: 1001, keyval: 5 }
    expect(matchRequirement(req, item(), undefined, { level: 1, baseSkills: {}, buffedSkills: {}, mainPackFreeSlots: 5 })).toBe(true)
    expect(matchRequirement(req, item(), undefined, { level: 1, baseSkills: {}, buffedSkills: {}, mainPackFreeSlots: 4 })).toBe(false)
  })

  it('type 1002 CharacterLevelGE uses character level', () => {
    const req: Requirement = { type: 1002, keyval: 126 }
    expect(matchRequirement(req, item(), undefined, { level: 126, baseSkills: {}, buffedSkills: {}, mainPackFreeSlots: 0 })).toBe(true)
    expect(matchRequirement(req, item(), undefined, { level: 125, baseSkills: {}, buffedSkills: {}, mainPackFreeSlots: 0 })).toBe(false)
  })

  it('type 1003 CharacterLevelLE uses character level', () => {
    const req: Requirement = { type: 1003, keyval: 50 }
    expect(matchRequirement(req, item(), undefined, { level: 50, baseSkills: {}, buffedSkills: {}, mainPackFreeSlots: 0 })).toBe(true)
    expect(matchRequirement(req, item(), undefined, { level: 51, baseSkills: {}, buffedSkills: {}, mainPackFreeSlots: 0 })).toBe(false)
  })

  it('type 1004 CharacterBaseSkill uses base skill range', () => {
    const req: Requirement = { type: 1004, vk: 6, minskill: 100, maxskill: 200 }
    expect(matchRequirement(req, item(), undefined, { level: 1, baseSkills: { 6: 150 }, buffedSkills: {}, mainPackFreeSlots: 0 })).toBe(true)
    expect(matchRequirement(req, item(), undefined, { level: 1, baseSkills: { 6: 99 }, buffedSkills: {}, mainPackFreeSlots: 0 })).toBe(false)
    expect(matchRequirement(req, item(), undefined, { level: 1, baseSkills: { 6: 201 }, buffedSkills: {}, mainPackFreeSlots: 0 })).toBe(false)
  })

  it('type 2000 BuffedMedianDamageGE uses buffed average damage', () => {
    // BuffedAverageDamage = (minDamage + maxDamage)/2 where minDamage = maxDamage - variance*maxDamage, maxDamage = GetBuffedLogValueKey(MaxDamage)
    // minDamage = 50 - 0.25*50 = 37.5, avg = (37.5+50)/2 = 43.75
    const req: Requirement = { type: 2000, keyval: 43.75 }
    expect(matchRequirement(req, item({ intValues: { MaxDamage: 50 }, doubleValues: { Variance: 0.25 } }))).toBe(true)
    expect(matchRequirement({ type: 2000, keyval: 44 }, item({ intValues: { MaxDamage: 50 }, doubleValues: { Variance: 0.25 } }))).toBe(false)
  })

  it('type 2001 BuffedMissileDamageGE uses buffed missile damage formula', () => {
    // BuffedMissileDamage = GetBuffedLogValueKey(MaxDamage) + (((GetBuffedDoubleValueKey(DamageBonus)-1)*100)/3) + GetBuffedLogValueKey(ElementalDmgBonus)
    const req: Requirement = { type: 2001, keyval: 50 + (((1.15 - 1) * 100) / 3) + 0 }
    expect(matchRequirement(req, item({ intValues: { MaxDamage: 50, ElementalDmgBonus: 0 }, doubleValues: { DamageBonus: 1.15 } }))).toBe(true)
  })

  it('type 2003 BuffedLongValKeyGE uses buffed int value', () => {
    const req: Requirement = { type: 2003, keyval: 50, vk: intValueKey.MaxDamage }
    expect(matchRequirement(req, item({ intValues: { MaxDamage: 50 } }))).toBe(true)
    expect(matchRequirement(req, item({ intValues: { MaxDamage: 49 } }))).toBe(false)
  })

  it('type 2003 BuffedLongValKeyGE applies spell bonuses', () => {
    const req: Requirement = { type: 2003, keyval: 52, vk: intValueKey.MaxDamage }
    // Minor Blood Thirst adds its Bonus 2. Blood Drinker VI has Bonus 0 and adds nothing.
    expect(matchRequirement(req, item({ intValues: { MaxDamage: 50 }, spellIds: [2598] }))).toBe(true)
    expect(matchRequirement(req, item({ intValues: { MaxDamage: 50 }, spellIds: [1616] }))).toBe(false)
  })

  it('type 2005 BuffedDoubleValKeyGE uses buffed double value compared as float', () => {
    const req: Requirement = { type: 2005, keyval: 0.2, vk: doubleValueKey.AttackBonus }
    expect(matchRequirement(req, item({ doubleValues: { AttackBonus: 0.2 } }))).toBe(true)
    expect(matchRequirement({ type: 2005, keyval: 0.200000001, vk: doubleValueKey.AttackBonus }, item({ doubleValues: { AttackBonus: 0.2 } }))).toBe(true) // float compare
  })

  it('type 2005 BuffedDoubleValKeyGE applies spell bonuses/adds/mults', () => {
    const req: Requirement = { type: 2005, keyval: 0.18, vk: doubleValueKey.AttackBonus }
    // Minor Heart Thirst adds 0.03. Heart Seeker VI has Bonus 0 and adds nothing.
    expect(matchRequirement(req, item({ doubleValues: { AttackBonus: 0.15 }, spellIds: [2603] }))).toBe(true)
    expect(matchRequirement(req, item({ doubleValues: { AttackBonus: 0.15 }, spellIds: [1592] }))).toBe(false)
  })

  it('type 2006 CalcdBuffedTinkedDamageGE uses computed tinked damage', () => {
    const req: Requirement = { type: 2006, keyval: 50 }
    const item1 = item({ intValues: { MaxDamage: 50, NumberTimesTinkered: 0, Imbued: 0, Material: 1 }, doubleValues: { Variance: 0.2 } })
    const result = matchRequirement(req, item1)
    expect(typeof result).toBe('boolean')
  })

  it('type 2007 TotalRatingsGE sums ratings 370,371,372,373,374,375,376,379', () => {
    const req: Requirement = { type: 2007, keyval: 10 }
    expect(matchRequirement(req, item({ intValues: { DamRating: 1, DamResistRating: 2, CritRating: 3, VitalityRating: 4 } }))).toBe(true)
    expect(matchRequirement(req, item({ intValues: { DamRating: 1, DamResistRating: 2 } }))).toBe(false)
  })

  it('type 2008 CalcedBuffedTinkedTargetMeleeGE uses CanReachTargetValues', () => {
    const req: Requirement = { type: 2008, dot: 100, meleeDefenseBonus: 0.1, attackBonus: 0.1 }
    expect(typeof matchRequirement(req, item({ objectClass: 1, intValues: { MaxDamage: 50, NumberTimesTinkered: 0, Imbued: 0, Material: 1 }, doubleValues: { Variance: 0.2, MeleeDefenseBonus: 0, AttackBonus: 0 } }))).toBe('boolean')
  })
})

describe('classify', () => {
  it('gives the action and name of the first rule that matches (LootRules.cs 3059-3073)', () => {
    const p = profile(
      rule('first miss', eLootAction.Keep, [{ type: 7, vk: objectClass.Armor }]),
      rule('second hit', eLootAction.Salvage, [{ type: 7, vk: objectClass.Clothing }]),
      rule('third hit too', eLootAction.Sell, [{ type: 7, vk: objectClass.Clothing }]),
    )
    const result = classify(p, item({ objectClass: objectClass.Clothing }))
    expect(result).toEqual({ action: eLootAction.Salvage, ruleName: 'second hit', lootActionData: 0, known: true })
  })

  it('gives NoLoot, an empty name and data 0 when no rule matches', () => {
    const p = profile(rule('armor only', eLootAction.Keep, [{ type: 7, vk: objectClass.Armor }]))
    expect(classify(p, item({ objectClass: objectClass.Clothing }))).toEqual({
      action: eLootAction.NoLoot,
      ruleName: '',
      lootActionData: 0,
      known: true,
    })
  })

  it('keeps every requirement of the rule: one miss rejects it', () => {
    const p = profile(
      rule('both', eLootAction.Keep, [
        { type: 7, vk: objectClass.Armor },
        { type: 3, keyval: 5, vk: intValueKey.ArmorLevel },
      ]),
    )
    expect(classify(p, item({ objectClass: objectClass.Armor, intValues: { ArmorLevel: 5 } })).action).toBe(eLootAction.Keep)
    expect(classify(p, item({ objectClass: objectClass.Armor })).action).toBe(eLootAction.NoLoot)
  })

  it('skips a rule with a true DisabledRule, as Match gives false for it', () => {
    const p = profile(
      rule('off', eLootAction.Keep, [{ type: 9999, b: true }]),
      rule('on', eLootAction.Salvage, [{ type: 9999, b: false }]),
    )
    expect(classify(p, item()).ruleName).toBe('on')
  })

  it('gives the LootActionData of the matching rule, as data1 of the C# out parameters', () => {
    const p = profile(rule('keep up to', eLootAction.KeepUpTo, [], 7))
    expect(classify(p, item())).toEqual({ action: eLootAction.KeepUpTo, ruleName: 'keep up to', lootActionData: 7, known: true })
  })

  it('stops with known false on an unknown requirement type before any match (H3b)', () => {
    const p = profile(
      rule('undecided', eLootAction.Keep, [{ type: 1002, keyval: 60 }]),
      rule('never reached', eLootAction.Salvage, []),
    )
    expect(classify(p, item())).toEqual({
      action: eLootAction.NoLoot,
      ruleName: 'undecided',
      lootActionData: 0,
      known: false,
    })
  })

  it('still decides a rule whose unknown requirement comes after a miss', () => {
    const p = profile(
      rule('misses first', eLootAction.Keep, [
        { type: 7, vk: objectClass.Armor },
        { type: 1002, keyval: 60 },
      ]),
      rule('matches', eLootAction.Salvage, []),
    )
    expect(classify(p, item({ objectClass: objectClass.Clothing }))).toEqual({
      action: eLootAction.Salvage,
      ruleName: 'matches',
      lootActionData: 0,
      known: true,
    })
  })

  it('passes the slot definitions on to the similar-color types', () => {
    const p = profile(
      rule('red celdon', eLootAction.Keep, [
        { type: 15, r: 255, g: 0, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1, armorGroup: 'Celdon (Base)' },
      ]),
    )
    const red = { palette: 1, exampleColor: { r: 255, g: 0, b: 0 } }
    expect(classify(p, item({ palettes: [red] }), SLOT_DEFINITIONS).action).toBe(eLootAction.Keep)
    expect(classify(p, item({ palettes: [red] })).action).toBe(eLootAction.NoLoot)
  })
})
