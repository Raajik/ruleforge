// Port of ref/plugin/ComputedItemInfo.cs: the buffed and tinked values of the types 2000-2008 (PLAN.md H3b).

import { doubleValueKey, intValueKey } from '../gamedata/generated'
import { getValueDouble, getValueInt, type LootItem } from './item'

// ComputedItemInfo.cs 46-63: Change is the full effect of the spell, Bonus the part that the item adds on top.

type SpellInfo<T> = { key: T; change: number; bonus: number }

const LongValueKeySpellEffects = new Map<number, SpellInfo<number>>()
const DoubleValueKeySpellEffects = new Map<number, SpellInfo<number>>()

function init() {
  // IntValueKey spell effects
  LongValueKeySpellEffects.set(1616, { key: intValueKey.MaxDamage, change: 20, bonus: 0 }) // Blood Drinker VI
  LongValueKeySpellEffects.set(2096, { key: intValueKey.MaxDamage, change: 22, bonus: 0 }) // Infected Caress
  LongValueKeySpellEffects.set(5183, { key: intValueKey.MaxDamage, change: 24, bonus: 0 }) // Incantation of Blood Drinker Post Feb-2013
  LongValueKeySpellEffects.set(4395, { key: intValueKey.MaxDamage, change: 24, bonus: 0 }) // Incantation of Blood Drinker
  LongValueKeySpellEffects.set(2598, { key: intValueKey.MaxDamage, change: 2, bonus: 2 }) // Minor Blood Thirst
  LongValueKeySpellEffects.set(2586, { key: intValueKey.MaxDamage, change: 4, bonus: 4 }) // Major Blood Thirst
  LongValueKeySpellEffects.set(4661, { key: intValueKey.MaxDamage, change: 7, bonus: 7 }) // Epic Blood Thirst
  LongValueKeySpellEffects.set(6089, { key: intValueKey.MaxDamage, change: 10, bonus: 10 }) // Legendary Blood Thirst
  LongValueKeySpellEffects.set(3688, { key: intValueKey.MaxDamage, change: 300, bonus: 0 }) // Prodigal Blood Drinker
  LongValueKeySpellEffects.set(2604, { key: intValueKey.ArmorLevel, change: 20, bonus: 20 }) // Minor Impenetrability
  LongValueKeySpellEffects.set(2592, { key: intValueKey.ArmorLevel, change: 40, bonus: 40 }) // Major Impenetrability
  LongValueKeySpellEffects.set(4667, { key: intValueKey.ArmorLevel, change: 60, bonus: 60 }) // Epic Impenetrability
  LongValueKeySpellEffects.set(6095, { key: intValueKey.ArmorLevel, change: 80, bonus: 80 }) // Legendary Impenetrability

  // DoubleValueKey spell effects
  DoubleValueKeySpellEffects.set(3258, { key: doubleValueKey.ElementalDamageVersusMonsters, change: 0.06, bonus: 0 }) // Spirit Drinker VI
  DoubleValueKeySpellEffects.set(3259, { key: doubleValueKey.ElementalDamageVersusMonsters, change: 0.07, bonus: 0 }) // Infected Spirit Caress
  DoubleValueKeySpellEffects.set(5182, { key: doubleValueKey.ElementalDamageVersusMonsters, change: 0.08, bonus: 0 }) // Incantation of Spirit Drinker Post Feb-2013
  DoubleValueKeySpellEffects.set(4414, { key: doubleValueKey.ElementalDamageVersusMonsters, change: 0.08, bonus: 0 }) // Incantation of Spirit Drinker

  DoubleValueKeySpellEffects.set(3251, { key: doubleValueKey.ElementalDamageVersusMonsters, change: 0.01, bonus: 0.01 }) // Minor Spirit Thirst
  DoubleValueKeySpellEffects.set(3250, { key: doubleValueKey.ElementalDamageVersusMonsters, change: 0.03, bonus: 0.03 }) // Major Spirit Thirst
  DoubleValueKeySpellEffects.set(4670, { key: doubleValueKey.ElementalDamageVersusMonsters, change: 0.05, bonus: 0.05 }) // Epic Spirit Thirst
  DoubleValueKeySpellEffects.set(6098, { key: doubleValueKey.ElementalDamageVersusMonsters, change: 0.07, bonus: 0.07 }) // Legendary Spirit Thirst
  DoubleValueKeySpellEffects.set(3735, { key: doubleValueKey.ElementalDamageVersusMonsters, change: 0.15, bonus: 0 }) // Prodigal Spirit Drinker

  DoubleValueKeySpellEffects.set(1592, { key: doubleValueKey.AttackBonus, change: 0.15, bonus: 0 }) // Heart Seeker VI
  DoubleValueKeySpellEffects.set(2106, { key: doubleValueKey.AttackBonus, change: 0.17, bonus: 0 }) // Elysa's Sight
  DoubleValueKeySpellEffects.set(4405, { key: doubleValueKey.AttackBonus, change: 0.2, bonus: 0 }) // Incantation of Heart Seeker

  DoubleValueKeySpellEffects.set(2603, { key: doubleValueKey.AttackBonus, change: 0.03, bonus: 0.03 }) // Minor Heart Thirst
  DoubleValueKeySpellEffects.set(2591, { key: doubleValueKey.AttackBonus, change: 0.05, bonus: 0.05 }) // Major Heart Thirst
  DoubleValueKeySpellEffects.set(4666, { key: doubleValueKey.AttackBonus, change: 0.07, bonus: 0.07 }) // Epic Heart Thirst
  DoubleValueKeySpellEffects.set(6094, { key: doubleValueKey.AttackBonus, change: 0.09, bonus: 0.09 }) // Legendary Heart Thirst

  DoubleValueKeySpellEffects.set(1605, { key: doubleValueKey.MeleeDefenseBonus, change: 0.15, bonus: 0 }) // Defender VI
  DoubleValueKeySpellEffects.set(2101, { key: doubleValueKey.MeleeDefenseBonus, change: 0.17, bonus: 0 }) // Cragstone's Will
  DoubleValueKeySpellEffects.set(4400, { key: doubleValueKey.MeleeDefenseBonus, change: 0.2, bonus: 0 }) // Incantation of Defender Post Feb-2013

  DoubleValueKeySpellEffects.set(2600, { key: doubleValueKey.MeleeDefenseBonus, change: 0.03, bonus: 0.03 }) // Minor Defender
  DoubleValueKeySpellEffects.set(3985, { key: doubleValueKey.MeleeDefenseBonus, change: 0.04, bonus: 0.04 }) // Mukkir Sense
  DoubleValueKeySpellEffects.set(2588, { key: doubleValueKey.MeleeDefenseBonus, change: 0.05, bonus: 0.05 }) // Major Defender
  DoubleValueKeySpellEffects.set(4663, { key: doubleValueKey.MeleeDefenseBonus, change: 0.07, bonus: 0.07 }) // Epic Defender
  DoubleValueKeySpellEffects.set(6091, { key: doubleValueKey.MeleeDefenseBonus, change: 0.09, bonus: 0.09 }) // Legendary Defender
  DoubleValueKeySpellEffects.set(3699, { key: doubleValueKey.MeleeDefenseBonus, change: 0.25, bonus: 0 }) // Prodigal Defender

  DoubleValueKeySpellEffects.set(1480, { key: doubleValueKey.ManaCBonus, change: 1.6, bonus: 0 }) // Hermetic Link VI
  DoubleValueKeySpellEffects.set(2117, { key: doubleValueKey.ManaCBonus, change: 1.7, bonus: 0 }) // Mystic's Blessing
  DoubleValueKeySpellEffects.set(4418, { key: doubleValueKey.ManaCBonus, change: 1.8, bonus: 0 }) // Incantation of Hermetic Link

  DoubleValueKeySpellEffects.set(3201, { key: doubleValueKey.ManaCBonus, change: 1.05, bonus: 1.05 }) // Feeble Hermetic Link
  DoubleValueKeySpellEffects.set(3199, { key: doubleValueKey.ManaCBonus, change: 1.1, bonus: 1.1 }) // Minor Hermetic Link
  DoubleValueKeySpellEffects.set(3202, { key: doubleValueKey.ManaCBonus, change: 1.15, bonus: 1.15 }) // Moderate Hermetic Link
  DoubleValueKeySpellEffects.set(3200, { key: doubleValueKey.ManaCBonus, change: 1.2, bonus: 1.2 }) // Major Hermetic Link
  DoubleValueKeySpellEffects.set(6086, { key: doubleValueKey.ManaCBonus, change: 1.25, bonus: 1.25 }) // Epic Hermetic Link
  DoubleValueKeySpellEffects.set(6087, { key: doubleValueKey.ManaCBonus, change: 1.3, bonus: 1.3 }) // Legendary Hermetic Link
}

init()

// ComputedItemInfo.cs 266 and 289: KeyExistsInt and KeyExistsDouble. A missing key gives the default and no spell
// adds to it.
const intName = reverse(intValueKey)
const doubleName = reverse(doubleValueKey)

function reverse(table: Record<string, number>): Map<number, string> {
  return new Map(Object.entries(table).map(([name, value]) => [value, name]))
}

function hasInt(item: LootItem, key: number): boolean {
  const name = intName.get(key)
  return name !== undefined && name in item.intValues
}

function hasDouble(item: LootItem, key: number): boolean {
  const name = doubleName.get(key)
  return name !== undefined && name in item.doubleValues
}

/**
 * ComputedItemInfo.cs 259-280: the int value plus the Bonus of each item spell on that key. A spell with Bonus 0,
 * for example Blood Drinker VI, adds nothing. `(int)` truncates the Bonus.
 */
export function getBuffedLogValueKey(item: LootItem, key: number, defaultValue = 0): number {
  if (!hasInt(item, key)) return defaultValue
  let value = getValueInt(item, key, defaultValue)
  for (const id of item.spellIds ?? []) {
    const effect = LongValueKeySpellEffects.get(id)
    if (effect && effect.key === key && effect.bonus !== 0) value += Math.trunc(effect.bonus)
  }
  return value
}

/**
 * ComputedItemInfo.cs 282-308: the double value with the Bonus of each item spell on that key. When `(int)Change`
 * is 1 (the Hermetic Link spells), the Bonus multiplies, else it adds.
 */
export function getBuffedDoubleValueKey(item: LootItem, key: number, defaultValue = 0): number {
  if (!hasDouble(item, key)) return defaultValue
  let value = getValueDouble(item, key, defaultValue)
  for (const id of item.spellIds ?? []) {
    const effect = DoubleValueKeySpellEffects.get(id)
    if (!effect || effect.key !== key || effect.bonus === 0) continue
    if (Math.trunc(effect.change) === 1) value *= effect.bonus
    else value += effect.bonus
  }
  return value
}

/** ComputedItemInfo.cs 233-249, with a crit chance of 0.1 and a crit multiplier of 2 by default. */
export function calculateDamageOverTime(maxDamage: number, variance: number, critChance = 0.1, critMultiplier = 2): number {
  return maxDamage * (((1 - critChance) * (2 - variance)) / 2 + critChance * critMultiplier)
}

/** ComputedItemInfo.cs 134-144, and the Match of BuffedMedianDamageGE (LootRules.cs 2378-2387). */
export function getBuffedAverageDamage(item: LootItem): number {
  const variance = getValueDouble(item, doubleValueKey.Variance, 0)
  const maxDamage = getBuffedLogValueKey(item, intValueKey.MaxDamage)
  const minDamage = maxDamage - variance * maxDamage
  return (minDamage + maxDamage) / 2
}

/** ComputedItemInfo.cs 251-257. */
export function getBuffedMissileDamage(item: LootItem): number {
  return (
    getBuffedLogValueKey(item, intValueKey.MaxDamage) +
    ((getBuffedDoubleValueKey(item, doubleValueKey.DamageBonus) - 1) * 100) / 3 +
    getBuffedLogValueKey(item, intValueKey.ElementalDmgBonus)
  )
}

/** ComputedItemInfo.cs 153-160: 10 tinks, one less without an imbue, none for an item without a material. */
function tinksLeft(item: LootItem): number {
  let left = Math.max(10 - getValueInt(item, intValueKey.NumberTimesTinkered, 0), 0)
  if (getValueInt(item, intValueKey.Imbued, 0) === 0) left--
  if (getValueInt(item, intValueKey.Material, 0) === 0) left = 0
  return left
}

/** ComputedItemInfo.cs 162-171: one tink, iron (+1 max damage) or granite (variance x 0.8), whichever gives more. */
function bestTink(state: { maxDamage: number; variance: number }): void {
  const iron = calculateDamageOverTime(state.maxDamage + 24 + 1, state.variance)
  const granite = calculateDamageOverTime(state.maxDamage + 24, state.variance * 0.8)
  if (iron >= granite) state.maxDamage++
  else state.variance *= 0.8
}

/** ComputedItemInfo.cs 146-175. */
export function getCalcedBuffedTinkedDamage(item: LootItem): number {
  const state = { maxDamage: getBuffedLogValueKey(item, intValueKey.MaxDamage), variance: getValueDouble(item, doubleValueKey.Variance, 0) }
  for (let i = tinksLeft(item); i > 0; i--) bestTink(state)
  return calculateDamageOverTime(state.maxDamage + 24, state.variance)
}

/** ComputedItemInfo.cs 177-213: tinks go to melee defense first, then to attack, then to damage. */
export function canReachTargetValues(item: LootItem, targetDoT: number, targetMeleeDefense: number, targetAttack: number): boolean {
  let meleeDefense = getBuffedDoubleValueKey(item, doubleValueKey.MeleeDefenseBonus)
  let attack = getBuffedDoubleValueKey(item, doubleValueKey.AttackBonus)
  const state = { maxDamage: getBuffedLogValueKey(item, intValueKey.MaxDamage), variance: getValueDouble(item, doubleValueKey.Variance, 0) }
  for (let i = tinksLeft(item); i > 0; i--) {
    if (meleeDefense < targetMeleeDefense) meleeDefense += 0.01
    else if (attack < targetAttack) attack += 0.01
    else bestTink(state)
  }
  return calculateDamageOverTime(state.maxDamage + 24, state.variance) >= targetDoT && meleeDefense >= targetMeleeDefense && attack >= targetAttack
}

/** ComputedItemInfo.cs 215-231: the sum of the 8 rating keys 370-376 and 379. */
export function getTotalRatings(item: LootItem): number {
  const keys = [370, 371, 372, 373, 374, 375, 376, 379]
  return keys.reduce((sum, key) => sum + getValueInt(item, key, 0), 0)
}
