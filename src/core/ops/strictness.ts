/**
 * The strictness levels and the character choices of the Overview page
 * (PLAN.md H5, specs/ruleforge-ui.md "Strictness").
 *
 * The level table is data in `strictness.json`. A level turns LootSnob v4
 * rules on and off. It never changes a threshold.
 *
 * A ladder is a run of rules next to each other in one section. Their names
 * are the same after every digit run becomes a hash. The first rule of a
 * ladder is the best rung.
 *
 * A level keeps the top rungs of a ladder and turns the rest off.
 *
 * The gear tiers are the sub-sections of Armor, Cloth Armor, Clothing and
 * Jewelry. Value and Death Items are off in LootSnob, so they get their own
 * rung depths. Trophies, Item Only, Shields, Tailoring, Tailoring (Special)
 * and Salvage are not touched by strictness.
 *
 * Every function is pure: it returns a new profile and never changes its
 * input.
 */

import type { LootProfile } from '../format/profile'
import { categorizeRules, setRuleEnabled } from './categories'
import { isRuleDisabled } from './rules'
import table from './strictness.json'

/** One level of the strictness table. */
export interface StrictnessLevel {
  id: string
  name: string
  /** The line under the level buttons. */
  note: string
  /** The number of top rungs of a ladder that stay on. Null means every rung. */
  rungs: number | null
  /** The same for the Value and Death Items ladders. Null means every rung. */
  valueRungs: number | null
  /** The gear tier groups that stay on. */
  gearTiers: string[]
}

/** One weapon type of the character step. */
export interface WeaponChoice {
  id: string
  name: string
  /** The prefix of the rule names of this weapon type. */
  prefix: string
}

/** A group of rules that the character step turns on and off. */
export interface RuleGroup {
  name: string
  rules: number[]
}

export const STRICTNESS_LEVELS: StrictnessLevel[] = table.levels
export const WEAPON_CHOICES: WeaponChoice[] = table.weapons

/** The name of a section without its stars: "** Legendary Sets **" gives "Legendary Sets". */
function plainName(name: string): string {
  return name.replace(/^\*+/, '').replace(/\*+$/, '').trim()
}

/** The key of a ladder: the name of the rule with every digit run as a hash. */
export function ladderKey(name: string): string {
  return name.trim().replace(/\d+/g, '#')
}

/**
 * The ladders of a section: a run of rules next to each other with the same
 * ladder key. The best rung comes first. A rule with an empty name is a
 * separator, so it is in no ladder.
 */
export function findLadders(profile: LootProfile, rules: number[]): number[][] {
  const ladders: number[][] = []
  let run: number[] = []
  let key = ''
  for (const index of rules) {
    const name = profile.rules[index]!.name
    if (name === '') {
      if (run.length > 0) ladders.push(run)
      run = []
      key = ''
      continue
    }
    const next = ladderKey(name)
    if (next !== key) {
      if (run.length > 0) ladders.push(run)
      run = []
      key = next
    }
    run.push(index)
  }
  if (run.length > 0) ladders.push(run)
  return ladders
}

/** Sets the on/off state of the given rules. A rule that has it stays as it is. */
function setStates(profile: LootProfile, wanted: Map<number, boolean>): LootProfile {
  let next = profile
  for (const [index, on] of wanted) {
    if (isRuleDisabled(profile.rules[index]!) === !on) continue
    next = setRuleEnabled(next, index, on)
  }
  return next
}

/**
 * Turns the rules of a profile on and off, as the strictness level of the
 * Overview page does. It touches the ladder sections, the gear tiers and the
 * Value and Death Items. The other sections keep their state.
 */
export function applyStrictness(profile: LootProfile, level: StrictnessLevel): LootProfile {
  const wanted = new Map<number, boolean>()
  const keep = level.rungs === null ? Infinity : level.rungs
  const keepValue = level.valueRungs === null ? Infinity : level.valueRungs
  let parent = ''

  for (const category of categorizeRules(profile)) {
    const name = plainName(category.name)
    if (category.sub) {
      // A sub-section of a gear section is a gear tier.
      if (table.gearSections.includes(parent)) {
        const tier = Object.entries(table.gearTiers).find(([, names]) => names.includes(name))?.[0]
        // A sub-section that is no tier of the table keeps its state.
        if (tier === undefined) continue
        const on = level.gearTiers.includes(tier)
        for (const index of category.rules) {
          // A rule with an empty name is a separator, so strictness leaves it.
          if (profile.rules[index]!.name === '') continue
          wanted.set(index, on)
        }
      }
      continue
    }
    parent = name
    if (table.ladderSections.includes(name)) {
      for (const ladder of findLadders(profile, category.rules)) {
        ladder.forEach((index, rung) => wanted.set(index, rung < keep))
      }
    } else if (table.wholeLadderSections.includes(name)) {
      // The whole section is one ladder in file order.
      const ladder = category.rules.filter((index) => profile.rules[index]!.name !== '')
      ladder.forEach((index, rung) => wanted.set(index, rung < keep))
    } else if (table.valueLadderSections.includes(name)) {
      for (const ladder of findLadders(profile, category.rules)) {
        ladder.forEach((index, rung) => wanted.set(index, rung < keepValue))
      }
    }
  }

  return setStates(profile, wanted)
}

/**
 * The weapon choice of the character step: the rules of the other weapon
 * types go off. The rules of the chosen type keep their state, so the
 * strictness level stays the master of the ladder.
 */
export function applyWeaponChoice(profile: LootProfile, prefix: string): LootProfile {
  const wanted = new Map<number, boolean>()
  profile.rules.forEach((rule, index) => {
    const name = rule.name.trim()
    if (WEAPON_CHOICES.some((w) => w.prefix !== prefix && name.startsWith(w.prefix))) {
      wanted.set(index, false)
    }
  })
  return setStates(profile, wanted)
}

/**
 * The strictness level and the weapon choice together. The level comes first.
 * Then the weapon choice turns the rules of the other weapon types off.
 */
export function applySettings(
  profile: LootProfile,
  level: StrictnessLevel,
  prefix: string,
): LootProfile {
  return applyWeaponChoice(applyStrictness(profile, level), prefix)
}

/**
 * The Trophies groups: the sub-sections of the Trophies section. Strictness
 * does not touch them, so the character step turns them on and off.
 */
export function trophyGroups(profile: LootProfile): RuleGroup[] {
  const groups: RuleGroup[] = []
  let inTrophies = false
  for (const category of categorizeRules(profile)) {
    if (!category.sub) {
      inTrophies = plainName(category.name) === 'Trophies'
      continue
    }
    if (inTrophies) groups.push({ name: plainName(category.name), rules: category.rules })
  }
  return groups
}

/** Turns the rules of a group on or off. A rule with an empty name keeps its state. */
export function setGroupEnabled(profile: LootProfile, group: RuleGroup, on: boolean): LootProfile {
  const wanted = new Map<number, boolean>()
  for (const index of group.rules) {
    if (profile.rules[index]!.name === '') continue
    wanted.set(index, on)
  }
  return setStates(profile, wanted)
}
