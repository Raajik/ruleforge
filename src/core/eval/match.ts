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
 * true: the requirement matches. false: it does not. "unknown": an
 * unsupported raw requirement, or a character type (1000-1004) without a
 * Character or a skill value. "error": the rule holds an invalid regex
 * pattern, so the evaluator cannot decide it.
 */
export type MatchResult = boolean | 'unknown' | 'error'

/** The result of one requirement of a rule. */
export interface RequirementOutcome {
  req: Requirement
  result: MatchResult
}

/** The color slot definitions of a ColorSlots XML file, like the C# ColorXML.SlotDefinitions. */
export type SlotDefinitions = ReadonlyMap<string, readonly number[]>

/**
 * `cLootItemRule.Match` (LootRules.cs 2901-2908): every requirement must
 * match, in order. It gives false at the first miss. It gives "unknown" when an undecided requirement comes
 * before a miss. The list stops at the first requirement that is not true.
 */
function evaluateRule(
  rule: LootRule,
  item: LootItem,
  slots?: SlotDefinitions,
  character?: Character,
): RequirementOutcome[] {
  const outcomes: RequirementOutcome[] = []
  for (const req of rule.requirements) {
    const result = matchRequirement(req, item, slots, character)
    outcomes.push({ req, result })
    if (result !== true) break
  }
  return outcomes
}

/** The rule that decides an item. */
export interface RuleDecision {
  /** The index of the rule in the profile. */
  index: number
  rule: LootRule
  /** The requirements of the rule, with their results. */
  outcomes: RequirementOutcome[]
  /** The result of the rule: true, 'unknown' or 'error'. */
  result: MatchResult
}

/**
 * The first rule that decides the item is the first rule that matches. It is
 * also the first rule with an unknown or broken requirement. A rule that
 * misses does not decide, so the search goes on. Null when no rule decides.
 */
export function decideRule(
  profile: LootProfile,
  item: LootItem,
  slots?: SlotDefinitions,
  character?: Character,
): RuleDecision | null {
  for (let index = 0; index < profile.rules.length; index++) {
    const rule = profile.rules[index]!
    const outcomes = evaluateRule(rule, item, slots, character)
    const last = outcomes[outcomes.length - 1]
    const result: MatchResult = last ? last.result : true
    if (result !== false) return { index, rule, outcomes, result }
  }
  return null
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
  const decision = decideRule(profile, item, slots, character)
  if (!decision) return { action: eLootAction.NoLoot, ruleName: '', lootActionData: 0, known: true }
  // An unknown or broken requirement stops the search: the rule above may
  // match, so the item has no known action.
  if (decision.result === 'unknown' || decision.result === 'error') {
    return { action: eLootAction.NoLoot, ruleName: decision.rule.name, lootActionData: 0, known: false }
  }
  return {
    action: decision.rule.action,
    ruleName: decision.rule.name,
    lootActionData: decision.rule.lootActionData,
    known: true,
  }
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
    case eLootRuleType.SpellNameMatch: {
      // LootRules.cs 283-292: any spell name that matches the regex.
      const rx = compilePattern(req.pattern)
      if (!rx) return 'error'
      return item.spells.some((name) => rx.test(name))
    }
    case eLootRuleType.StringValueMatch: {
      // LootRules.cs 357-360.
      const rx = compilePattern(req.pattern)
      if (!rx) return 'error'
      return rx.test(getValueString(item, req.key, ''))
    }
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
      let doesNot: RegExp | null = null
      if (req.rxDoesNotMatch.trim() !== '') {
        doesNot = compilePattern(req.rxDoesNotMatch)
        if (!doesNot) return 'error'
      }
      const does = compilePattern(req.rxDoesMatch)
      if (!does) return 'error'
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

// The regex of a pattern, or null when the pattern is invalid. The pattern
// fields stay text in the core (PLAN.md Traps), and the C# compiles them
// when it reads the file (LootRules.cs 311-313). A bad pattern then gives
// the result "error" on that rule, not a crash.
function compilePattern(pattern: string): RegExp | null {
  const js = dotNetToJs(pattern)
  if (!js) return null
  try {
    return new RegExp(js.source, js.flags)
  } catch {
    return null
  }
}

// The patterns are .NET regexes (specs/ruleforge-ui.md). This rewrites the
// .NET syntax that JS reads differently, and gives null for .NET syntax that
// JS would read as a different pattern without an error.
function dotNetToJs(pattern: string): { source: string; flags: string } | null {
  let flags = ''
  let i = 0
  const lead = /^\(\?([ims]+)\)/.exec(pattern)
  if (lead) {
    flags = [...new Set(lead[1])].join('')
    i = lead[0].length
  }
  // .NET numbers named groups after the unnamed ones, JS numbers them in order, so \1 can mean another group.
  if (/\(\?<[A-Za-z_]/.test(pattern) && /\\[1-9]/.test(pattern)) return null
  let out = ''
  let inClass = false
  for (; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\') {
      const next = pattern[i + 1] ?? ''
      i++
      if (next === 'p' || next === 'P' || next === 'G') return null
      if (next === 'e') out += '\\x1b'
      else if (next === 'a') out += '\\x07'
      else if (!inClass && next === 'A') out += '(?<![\\s\\S])'
      else if (!inClass && next === 'z') out += '(?![\\s\\S])'
      else if (!inClass && next === 'Z') out += '(?=\\n?(?![\\s\\S]))'
      else out += c + next
    } else if (inClass) {
      if (c === '-' && pattern[i + 1] === '[') return null
      if (c === ']') inClass = false
      out += c
    } else if (c === '[') {
      // .NET reads a ] right after [ or [^ as a literal; JS reads it as the end of an empty class.
      const start = pattern[i + 1] === '^' ? i + 2 : i + 1
      if (pattern[start] === ']') return null
      inClass = true
      out += c
    } else if (c === '(' && pattern[i + 1] === '?' && pattern[i + 2] === '>') {
      return null
    } else if (c === '.' && !flags.includes('s')) {
      // .NET . stops only at \n; JS . also stops at \r, \u2028 and \u2029.
      out += '[^\\n]'
    } else if (c === '$' && !flags.includes('m')) {
      // .NET $ also matches before a final \n, as \Z does.
      out += '(?=\\n?(?![\\s\\S]))'
    } else {
      out += c
    }
  }
  return { source: out, flags }
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
