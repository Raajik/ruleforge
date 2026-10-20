// The evaluator match functions (PLAN.md H3a). Each type copies the Match
// method of ref/shared/LootRules.cs. The regex fields are compiled here with
// the JS RegExp engine; the C# uses .NET Regex, and the core keeps the
// patterns as text everywhere else (see PLAN.md Traps).

import { eLootAction, eLootRuleType } from '../format/enums'
import { doubleValueKey, intValueKey } from '../gamedata/generated'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { colorToHSV, getValueDouble, getValueInt, getValueString, type LootItem, type Rgb } from './item'
import type { Character } from './character'
import {
  canReachTargetValues,
  getBuffedDoubleValueKey,
  getBuffedLogValueKey,
  getBuffedMissileDamage,
  getBuffedAverageDamage,
  getCalcedBuffedTinkedDamage,
  getTotalRatings,
} from './computed'

/**
 * true: the requirement matches. false: it does not. "unknown": the type is
 * not evaluated yet (types 1000-1004 and 2000-2008, and unsupported raw
 * requirements). H3b fills the unknown types in.
 */
export type MatchResult = boolean | 'unknown'

/** The color slot definitions of a ColorSlots XML file, like the C# ColorXML.SlotDefinitions. */
export type SlotDefinitions = ReadonlyMap<string, readonly number[]>

/**
 * `cLootItemRule.Match` (LootRules.cs 2901-2908): every requirement must
 * match, in order. It gives false at the first miss. It gives "unknown" when an undecided requirement comes
 * before a miss.
 */
function matchRule(rule: LootRule, item: LootItem, slots?: SlotDefinitions, character?: Character): MatchResult {
  for (const req of rule.requirements) {
    const result = matchRequirement(req, item, slots, character)
    if (result !== true) return result
  }
  return true
}

/** The result of `cLootRules.Classify` (LootRules.cs 3059-3073). */
export interface ClassifyResult {
  /** The action of the first matching rule, NoLoot (0) when none matches. */
  action: number
  /** The name of the first matching rule, empty when none matches. */
  ruleName: string
  /** The LootActionData of the first matching rule, 0 when none matches. */
  lootActionData: number
  /**
   * False when an unknown requirement type stopped the search before a
   * match. The other fields then describe the rule that stopped it (H3b).
   */
  known: boolean
}

/**
 * `cLootRules.Classify` (LootRules.cs 3059-3073): the first rule that matches
 * gives the action, the rule name and the LootActionData. NoLoot, an empty
 * name and data 0 when no rule matches.
 */
export function classify(profile: LootProfile, item: LootItem, slots?: SlotDefinitions, character?: Character): ClassifyResult {
  for (const rule of profile.rules) {
    const result = matchRule(rule, item, slots, character)
    if (result === 'unknown') return { action: eLootAction.NoLoot, ruleName: rule.name, lootActionData: 0, known: false }
    if (result) return { action: rule.action, ruleName: rule.name, lootActionData: rule.lootActionData, known: true }
  }
  return { action: eLootAction.NoLoot, ruleName: '', lootActionData: 0, known: true }
}

/**
 * One requirement against one item, on the Match method of its type.
 * `slots` gives the armor group palette slots that type 15 reads
 * (LootRules.cs 2033-2041). Without it, type 15 never matches.
 */
export function matchRequirement(req: Requirement, item: LootItem, slots?: SlotDefinitions, character?: Character): MatchResult {
  // cUnsupportedRequirement has no Match in the plugin, so it answers "unknown". The character types also answer
  // "unknown" when no character, or no value for the skill, is given.
  if ('data' in req) return 'unknown'
  switch (req.type) {
    case eLootRuleType.SpellNameMatch:
      // LootRules.cs 283-292: any spell name that matches the regex.
      return item.spells.some((name) => new RegExp(req.pattern).test(name))
    case eLootRuleType.StringValueMatch:
      // LootRules.cs 357-360.
      return new RegExp(req.pattern).test(getValueString(item, req.key, ''))
    case eLootRuleType.LongValKeyLE:
      // LootRules.cs 432-435.
      return getValueInt(item, req.vk, 0) <= req.keyval
    case eLootRuleType.LongValKeyGE:
      // LootRules.cs 549-552.
      return getValueInt(item, req.vk, 0) >= req.keyval
    case eLootRuleType.DoubleValKeyLE:
      // LootRules.cs 666-669: both sides cast to float.
      return Math.fround(getValueDouble(item, req.vk, 0)) <= Math.fround(req.keyval)
    case eLootRuleType.DoubleValKeyGE:
      // LootRules.cs 741-744: both sides cast to float.
      return Math.fround(getValueDouble(item, req.vk, 0)) >= Math.fround(req.keyval)
    case eLootRuleType.DamagePercentGE:
      // LootRules.cs 815-818: the C# Match returns false for every item.
      return false
    case eLootRuleType.ObjectClass:
      // LootRules.cs 872-875.
      return item.objectClass === req.vk
    case eLootRuleType.SpellCountGE:
      // LootRules.cs 930-933.
      return item.spells.length >= req.keyval
    case eLootRuleType.SpellMatch: {
      // LootRules.cs 999-1013: count the spells that match rxDoesMatch and,
      // when rxDoesNotMatch is not empty after a trim, do not match it.
      const doesNot = req.rxDoesNotMatch.trim() === '' ? null : new RegExp(req.rxDoesNotMatch)
      const does = new RegExp(req.rxDoesMatch)
      let count = 0
      for (const name of item.spells) {
        if (does.test(name) && (doesNot === null || !doesNot.test(name))) {
          count++
          if (count >= req.count) return true
        }
      }
      return false
    }
    case eLootRuleType.MinDamageGE: {
      // LootRules.cs 1097-1102: maxdamage - variance * maxdamage, in double.
      const maxDamage = getValueInt(item, intValueKey.MaxDamage, 0)
      const variance = getValueDouble(item, doubleValueKey.Variance, 0)
      return maxDamage - variance * maxDamage >= req.keyval
    }
    case eLootRuleType.LongValKeyFlagExists:
      // LootRules.cs 1165-1168.
      return (getValueInt(item, req.vk, 0) & req.keyval) > 0
    case eLootRuleType.LongValKeyE:
      // LootRules.cs 1390-1393.
      return getValueInt(item, req.vk, 0) === req.keyval
    case eLootRuleType.LongValKeyNE:
      // LootRules.cs 1507-1510.
      return getValueInt(item, req.vk, 0) !== req.keyval
    case eLootRuleType.AnySimilarColor: {
      // LootRules.cs 1898-1937: any palette whose hue distance and SV
      // distance fit. The hue does not wrap at 0 and 360.
      const target = colorToHSV({ r: req.r, g: req.g, b: req.b })
      return item.palettes.some((pal) => colorWithin(target, pal.exampleColor, req.maxDifferenceH, req.maxDifferenceSV))
    }
    case eLootRuleType.SimilarColorArmorType: {
      // LootRules.cs 2053-2100: only the palette slots of the armor group.
      // An unknown group has no slots, as PaletteIndices gives an empty array.
      const indices = slots?.get(req.armorGroup) ?? []
      const target = colorToHSV({ r: req.r, g: req.g, b: req.b })
      for (let i = 0; i < item.palettes.length; i++) {
        const pal = item.palettes[i]
        if (pal !== undefined && indices.includes(i) && colorWithin(target, pal.exampleColor, req.maxDifferenceH, req.maxDifferenceSV)) {
          return true
        }
      }
      return false
    }
    case eLootRuleType.SlotSimilarColor: {
      // LootRules.cs 2198-2222: the one slot. A slot past the end of the
      // palettes gives false. The C# would throw on a negative slot; false
      // keeps the evaluator total.
      const pal = paletteAt(item, req.slot)
      if (pal === null) return false
      const target = colorToHSV({ r: req.r, g: req.g, b: req.b })
      return colorWithin(target, pal.exampleColor, req.maxDifferenceH, req.maxDifferenceSV)
    }
    case eLootRuleType.SlotExactPalette: {
      // LootRules.cs 2306-2315: both palettes masked to 24 bits.
      const pal = paletteAt(item, req.slot)
      if (pal === null) return false
      return (pal.palette & 0xffffff) === (req.palette & 0xffffff)
    }
    case eLootRuleType.DisabledRule:
      // LootRules.cs 1823-1826: a disabled rule matches nothing.
      return !req.b
    case eLootRuleType.CharacterSkillGE: {
      // LootRules.cs 1240-1255: the buffed skill from Decal's CharacterFilter.
      if (!character) return 'unknown'
      const skill = character.buffedSkills[req.vk]
      if (skill === undefined) return 'unknown'
      return skill >= req.keyval
    }
    case eLootRuleType.CharacterMainPackEmptySlotsGE: {
      // LootRules.cs 1332-1335: the free main pack slots.
      if (!character) return 'unknown'
      return character.mainPackFreeSlots >= req.keyval
    }
    case eLootRuleType.CharacterLevelGE: {
      // LootRules.cs 1623-1626: character level >= keyval.
      if (!character) return 'unknown'
      return character.level >= req.keyval
    }
    case eLootRuleType.CharacterLevelLE: {
      // LootRules.cs 1680-1683: character level <= keyval.
      if (!character) return 'unknown'
      return character.level <= req.keyval
    }
    case eLootRuleType.CharacterBaseSkill: {
      // LootRules.cs 1739-1754: the base skill is in the range.
      if (!character) return 'unknown'
      const skill = character.baseSkills[req.vk]
      if (skill === undefined) return 'unknown'
      return skill >= req.minskill && skill <= req.maxskill
    }
    case eLootRuleType.BuffedMedianDamageGE: {
      // LootRules.cs 2378-2387: the buffed median damage.
      return getBuffedAverageDamage(item) >= req.keyval
    }
    case eLootRuleType.BuffedMissileDamageGE: {
      // LootRules.cs 2449-2454: ComputedItemInfo.BuffedMissileDamage.
      return getBuffedMissileDamage(item) >= req.keyval
    }
    case eLootRuleType.BuffedLongValKeyGE: {
      // LootRules.cs 2517-2524: the buffed int value >= keyval.
      const val = getBuffedLogValueKey(item, req.vk)
      return val >= req.keyval
    }
    case eLootRuleType.BuffedDoubleValKeyGE: {
      // LootRules.cs 2591-2598: the buffed double value, compared as float.
      const val = getBuffedDoubleValueKey(item, req.vk)
      return Math.fround(val) >= Math.fround(req.keyval)
    }
    case eLootRuleType.CalcdBuffedTinkedDamageGE: {
      // LootRules.cs 2664-2669: ComputedItemInfo.CalcedBuffedTinkedDamage.
      return getCalcedBuffedTinkedDamage(item) >= req.keyval
    }
    case eLootRuleType.TotalRatingsGE: {
      // LootRules.cs 2731-2736: the sum of the ratings.
      return getTotalRatings(item) >= req.keyval
    }
    case eLootRuleType.CalcedBuffedTinkedTargetMeleeGE: {
      // LootRules.cs 2797-2802: ComputedItemInfo.CanReachTargetValues.
      return canReachTargetValues(item, req.dot, req.meleeDefenseBonus, req.attackBonus)
    }
    default:
      return 'unknown'
  }
}

// The similar-color distance check of LootRules.cs 1911-1918: the hue within
// MaxDifferenceH, then the Euclidean distance of saturation and value within
// MaxDifferenceSV.
function colorWithin(target: { hue: number; saturation: number; value: number }, exc: Rgb, maxDifferenceH: number, maxDifferenceSV: number): boolean {
  const { hue, saturation, value } = colorToHSV(exc)
  if (Math.abs(hue - target.hue) > maxDifferenceH) return false
  const ss = saturation - target.saturation
  const vv = value - target.value
  return Math.sqrt(ss * ss + vv * vv) <= maxDifferenceSV
}

// The palette of a slot, or null when the slot has no palette.
function paletteAt(item: LootItem, slot: number): { palette: number; exampleColor: Rgb } | null {
  if (slot < 0 || slot >= item.palettes.length) return null
  return item.palettes[slot] ?? null
}
