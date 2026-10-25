/**
 * Rule and requirement edits, as the legacy editor does them. Every function
 * is pure: it returns a new profile and never changes its input.
 *
 * The C# lines are in ref/editor/Form1.cs, except where one names a file.
 * Rule lines: clone 481-496, new 497-506, delete 507-511 with DeleteRule
 * 1021-1049, rename 577-588, action and keep count 589-629.
 * Requirement lines: new, clone and delete 522-576, change type 630-655.
 * Move rule up and down: Macros.cs 36-65. A Ctrl click moves 3: 770-789.
 * Toggle disabled: 910-938.
 */

import { eLootAction, eLootRuleType } from '../format/enums'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { doubleValueKey, intValueKey, objectClass, stringValueKey, vtcSkillID } from '../gamedata/generated'

/**
 * The default requirement of each type, as `LootRuleCreator.CreateLootRule`
 * (ref/shared/LootRules.cs 172-218) makes it from the C# field initializers.
 * Returns null for a type the legacy editor cannot create.
 */
export function defaultRequirement(type: number): Requirement | null {
  switch (type) {
    case eLootRuleType.SpellNameMatch:
      return { type: 0, pattern: '' }
    case eLootRuleType.StringValueMatch:
      return { type: 1, pattern: '', key: stringValueKey.FullDescription }
    case eLootRuleType.LongValKeyLE:
      return { type: 2, keyval: 0, vk: intValueKey.ActivationReqSkillId }
    case eLootRuleType.LongValKeyGE:
      return { type: 3, keyval: 0, vk: intValueKey.ActivationReqSkillId }
    case eLootRuleType.DoubleValKeyLE:
      return { type: 4, keyval: 0, vk: doubleValueKey.AcidProt }
    case eLootRuleType.DoubleValKeyGE:
      return { type: 5, keyval: 0, vk: doubleValueKey.AcidProt }
    case eLootRuleType.DamagePercentGE:
      return { type: 6, keyval: 0 }
    case eLootRuleType.ObjectClass:
      return { type: 7, vk: objectClass.Armor }
    case eLootRuleType.SpellCountGE:
      return { type: 8, keyval: 0 }
    case eLootRuleType.SpellMatch:
      return { type: 9, rxDoesMatch: '', rxDoesNotMatch: '', count: 1 }
    case eLootRuleType.MinDamageGE:
      return { type: 10, keyval: 0 }
    case eLootRuleType.LongValKeyFlagExists:
      return { type: 11, keyval: 0, vk: intValueKey.ActivationReqSkillId }
    case eLootRuleType.LongValKeyE:
      return { type: 12, keyval: 0, vk: intValueKey.ActivationReqSkillId }
    case eLootRuleType.LongValKeyNE:
      return { type: 13, keyval: 0, vk: intValueKey.ActivationReqSkillId }
    // System.Drawing.Color.White, MaxDifferenceH 10, MaxDifferenceSV 0.1.
    case eLootRuleType.AnySimilarColor:
      return { type: 14, r: 255, g: 255, b: 255, maxDifferenceH: 10, maxDifferenceSV: 0.1 }
    case eLootRuleType.SimilarColorArmorType:
      return { type: 15, r: 255, g: 255, b: 255, maxDifferenceH: 10, maxDifferenceSV: 0.1, armorGroup: 'None' } // LootRules.cs 2016: ArmorGroups()[0], and ColorXML.cs 74 adds "None" first.
    case eLootRuleType.SlotSimilarColor:
      return { type: 16, r: 255, g: 255, b: 255, maxDifferenceH: 10, maxDifferenceSV: 0.1, slot: 0 }
    case eLootRuleType.SlotExactPalette:
      return { type: 17, slot: 0, palette: 0 }
    case eLootRuleType.CharacterSkillGE:
      return { type: 1000, keyval: 0, vk: vtcSkillID.Alchemy }
    case eLootRuleType.CharacterMainPackEmptySlotsGE:
      return { type: 1001, keyval: 0 }
    case eLootRuleType.CharacterLevelGE:
      return { type: 1002, keyval: 0 }
    case eLootRuleType.CharacterLevelLE:
      return { type: 1003, keyval: 0 }
    case eLootRuleType.CharacterBaseSkill:
      return { type: 1004, vk: vtcSkillID.Alchemy, minskill: 0, maxskill: 0 }
    case eLootRuleType.BuffedMedianDamageGE:
      return { type: 2000, keyval: 0 }
    case eLootRuleType.BuffedMissileDamageGE:
      return { type: 2001, keyval: 0 }
    case eLootRuleType.BuffedLongValKeyGE:
      return { type: 2003, keyval: 0, vk: intValueKey.MaxDamage }
    case eLootRuleType.BuffedDoubleValKeyGE:
      return { type: 2005, keyval: 0, vk: doubleValueKey.AttackBonus }
    case eLootRuleType.CalcdBuffedTinkedDamageGE:
      return { type: 2006, keyval: 0 }
    case eLootRuleType.TotalRatingsGE:
      return { type: 2007, keyval: 0 }
    case eLootRuleType.CalcedBuffedTinkedTargetMeleeGE:
      return { type: 2008, dot: 0, meleeDefenseBonus: 0, attackBonus: 0 }
    case eLootRuleType.DisabledRule:
      return { type: 9999, b: true }
    default:
      return null
  }
}

/**
 * `FriendlyName` of each type that `defaultRequirement` can make
 * (ref/shared/LootRules.cs, the overrides at 326 to 2838).
 */
const FRIENDLY_NAMES: Readonly<Record<number, string>> = {
  [eLootRuleType.SpellNameMatch]: 'Spell Name Match',
  [eLootRuleType.StringValueMatch]: 'String Value Match',
  [eLootRuleType.LongValKeyLE]: 'Long Value Key <=',
  [eLootRuleType.LongValKeyGE]: 'Long Value Key >=',
  [eLootRuleType.DoubleValKeyLE]: 'Double Value Key <=',
  [eLootRuleType.DoubleValKeyGE]: 'Double Value Key >=',
  [eLootRuleType.DamagePercentGE]: 'Damage Percentage >=',
  [eLootRuleType.ObjectClass]: 'ObjectClass',
  [eLootRuleType.SpellCountGE]: 'Spell Count >=',
  [eLootRuleType.SpellMatch]: 'Spell Match and Count',
  [eLootRuleType.MinDamageGE]: 'Minimum Damage >=',
  [eLootRuleType.LongValKeyFlagExists]: 'Long Value Key Has Flags',
  [eLootRuleType.CharacterSkillGE]: 'Character Buffed Skill >=',
  [eLootRuleType.CharacterMainPackEmptySlotsGE]: 'Free Main Pack Slots >=',
  [eLootRuleType.LongValKeyE]: 'Long Value Key ==',
  [eLootRuleType.LongValKeyNE]: 'Long Value Key !=',
  [eLootRuleType.CharacterLevelGE]: 'Character Level >=',
  [eLootRuleType.CharacterLevelLE]: 'Character Level <=',
  [eLootRuleType.CharacterBaseSkill]: 'Base Skill Range',
  [eLootRuleType.DisabledRule]: 'Enable/Disable',
  [eLootRuleType.AnySimilarColor]: 'One Similar Color',
  [eLootRuleType.SimilarColorArmorType]: 'Armor Type Similar Color',
  [eLootRuleType.SlotSimilarColor]: 'Slot Similar Color',
  [eLootRuleType.SlotExactPalette]: 'Slot Exact Palette',
  [eLootRuleType.BuffedMedianDamageGE]: 'Calced Buffed Median Damage >=',
  [eLootRuleType.BuffedMissileDamageGE]: 'Calced Buffed Missile Damage >=',
  [eLootRuleType.BuffedLongValKeyGE]: 'Buffed Long Value Key >=',
  [eLootRuleType.BuffedDoubleValKeyGE]: 'Buffed Double Value Key >=',
  [eLootRuleType.CalcdBuffedTinkedDamageGE]: 'Calced Buffed Tinked Dmg >=',
  [eLootRuleType.TotalRatingsGE]: 'Calced Total Ratings >=',
  [eLootRuleType.CalcedBuffedTinkedTargetMeleeGE]: 'Calced Buffed Tinked Target Melee',
}

/**
 * The requirement type combo (Form1.cs 204-220): "Enable/Disable" first, then
 * every other type by friendly name. The C# `SortedList<string, ...>` sorts
 * in culture order.
 */
export function requirementTypeCombo(): { type: number; name: string }[] {
  const byCulture = new Intl.Collator('en').compare
  const rest = Object.entries(FRIENDLY_NAMES)
    .map(([type, name]) => ({ type: Number(type), name }))
    .filter((entry) => entry.type !== eLootRuleType.DisabledRule)
    .sort((a, b) => byCulture(a.name, b.name))
  return [{ type: eLootRuleType.DisabledRule, name: FRIENDLY_NAMES[eLootRuleType.DisabledRule]! }, ...rest]
}

/** Where the legacy editor inserts a new item: after the given one, else at the end. */
function afterIndex(length: number, after: number): number {
  return after >= 0 && after < length ? after + 1 : length
}

function insertAt<T>(items: T[], item: T, at: number): T[] {
  return [...items.slice(0, at), item, ...items.slice(at)]
}

function without<T>(items: T[], index: number): T[] {
  return [...items.slice(0, index), ...items.slice(index + 1)]
}

function replaceRule(profile: LootProfile, index: number, rule: LootRule): LootProfile {
  return { ...profile, rules: profile.rules.map((r, i) => (i === index ? rule : r)) }
}

/** Adds a new Keep rule named "New Rule" (Form1.cs 497-506). */
export function newRule(profile: LootProfile, after = -1): LootProfile {
  const created: LootRule = {
    name: 'New Rule',
    customExpression: '',
    priority: 0,
    action: eLootAction.Keep,
    lootActionData: 0,
    requirements: [],
  }
  return { ...profile, rules: insertAt(profile.rules, created, afterIndex(profile.rules.length, after)) }
}

/**
 * Copies a rule (Form1.cs 481-496). The legacy clone builds a fresh rule. It
 * keeps the name, the action and the requirements. It loses the priority, the
 * custom expression and the keep count.
 */
export function cloneRule(profile: LootProfile, index: number, after = -1): LootProfile {
  const source = profile.rules[index]
  if (!source) return profile

  const created: LootRule = {
    name: source.name,
    customExpression: '',
    priority: 0,
    action: source.action,
    lootActionData: 0,
    requirements: source.requirements.map((r) => ({ ...r })),
  }
  return { ...profile, rules: insertAt(profile.rules, created, afterIndex(profile.rules.length, after)) }
}

/** Removes the rule at the index (Form1.cs 1021-1049). */
export function deleteRule(profile: LootProfile, index: number): LootProfile {
  if (index < 0 || index >= profile.rules.length) return profile
  return { ...profile, rules: without(profile.rules, index) }
}

/**
 * Moves a rule by `offset` places, negative for up. The caller passes 1 or 3,
 * because a Ctrl click moves three (Form1.cs 770-789). A move past an end stops
 * at it, as the repeated C# call does (Macros.cs 36-65).
 */
export function moveRule(profile: LootProfile, index: number, offset: number): LootProfile {
  const moved = profile.rules[index]
  if (!moved || offset === 0) return profile

  const target = Math.min(Math.max(index + offset, 0), profile.rules.length - 1)
  if (target === index) return profile
  return { ...profile, rules: insertAt(without(profile.rules, index), moved, target) }
}

function withRequirementInserted(
  profile: LootProfile,
  ruleIndex: number,
  requirement: Requirement,
  after: number,
): LootProfile {
  const rule = profile.rules[ruleIndex]
  if (!rule) return profile
  const at = afterIndex(rule.requirements.length, after)
  return replaceRule(profile, ruleIndex, { ...rule, requirements: insertAt(rule.requirements, requirement, at) })
}

/** Adds a SpellNameMatch requirement (Form1.cs 522-545). */
export function newRequirement(profile: LootProfile, ruleIndex: number, after = -1): LootProfile {
  const created = defaultRequirement(eLootRuleType.SpellNameMatch)
  if (!created) return profile
  return withRequirementInserted(profile, ruleIndex, created, after)
}

/** Copies the requirement at the index (Form1.cs 546-567). */
export function cloneRequirement(
  profile: LootProfile,
  ruleIndex: number,
  reqIndex: number,
  after = -1,
): LootProfile {
  const source = profile.rules[ruleIndex]?.requirements[reqIndex]
  if (!source) return profile
  return withRequirementInserted(profile, ruleIndex, { ...source }, after)
}

/** Removes the requirement at the index (Form1.cs 568-576). */
export function deleteRequirement(profile: LootProfile, ruleIndex: number, reqIndex: number): LootProfile {
  const rule = profile.rules[ruleIndex]
  if (!rule || reqIndex < 0 || reqIndex >= rule.requirements.length) return profile
  return replaceRule(profile, ruleIndex, { ...rule, requirements: without(rule.requirements, reqIndex) })
}

/** Renames a rule (Form1.cs 577-588). */
export function setRuleName(profile: LootProfile, ruleIndex: number, name: string): LootProfile {
  const rule = profile.rules[ruleIndex]
  if (!rule) return profile
  return replaceRule(profile, ruleIndex, { ...rule, name })
}

/** Sets the action. The keep count keeps its value (Form1.cs 589-629). */
export function setRuleAction(profile: LootProfile, ruleIndex: number, action: number): LootProfile {
  const rule = profile.rules[ruleIndex]
  if (!rule) return profile
  return replaceRule(profile, ruleIndex, { ...rule, action })
}

/**
 * Sets the keep count. The legacy text box uses `int.TryParse`, so an empty or
 * invalid text gives 0 (Form1.cs 616-627).
 */
export function setKeepCount(profile: LootProfile, ruleIndex: number, count: number): LootProfile {
  const rule = profile.rules[ruleIndex]
  if (!rule) return profile
  return replaceRule(profile, ruleIndex, { ...rule, lootActionData: count })
}

/**
 * Replaces a requirement with the default of the new type (Form1.cs 630-655).
 * The same type, or a type with no creator, keeps the current requirement.
 */
export function setRequirementType(
  profile: LootProfile,
  ruleIndex: number,
  reqIndex: number,
  type: number,
): LootProfile {
  const rule = profile.rules[ruleIndex]
  const current = rule?.requirements[reqIndex]
  if (!rule || !current || current.type === type) return profile

  const replacement = defaultRequirement(type)
  if (!replacement) return profile
  const requirements = rule.requirements.map((r, i) => (i === reqIndex ? replacement : r))
  return replaceRule(profile, ruleIndex, { ...rule, requirements })
}

/**
 * True when the rule has a `DisabledRule` requirement with `b` true
 * (LootRules.cs 1839-1844). The rule list badge and `toggleDisabled` use it.
 */
export function isRuleDisabled(rule: LootRule): boolean {
  return rule.requirements.some((r) => r.type === eLootRuleType.DisabledRule && 'b' in r && r.b)
}

/**
 * Turns the rule off or on (Form1.cs 910-938). It removes every DisabledRule
 * requirement. It adds a true one at the end, unless one of them was true.
 */
export function toggleDisabled(profile: LootProfile, ruleIndex: number): LootProfile {
  const rule = profile.rules[ruleIndex]
  if (!rule) return profile

  const wasDisabled = isRuleDisabled(rule)
  const rest = rule.requirements.filter((r) => r.type !== eLootRuleType.DisabledRule)
  const requirements: Requirement[] = wasDisabled ? rest : [...rest, { type: eLootRuleType.DisabledRule, b: true }]
  return replaceRule(profile, ruleIndex, { ...rule, requirements })
}
