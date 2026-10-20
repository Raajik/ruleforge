// Combo key lists and ID properties (T17). Copies ComboKeys.cs (VTClassic):
// the five key enums sorted by name, index <-> value mapping, and
// GameInfo.IsIDProperty (Constants.cs 425-484). The UI colors a key dark red
// when it is an ID property, white otherwise; ObjectClass and VTCSkillID are
// always white (ComboKeys.cs 191-198).

import { doubleValueKey, intValueKey, objectClass, stringValueKey, vtcSkillID } from './generated'

export type KeyKind = 'svk' | 'lvk' | 'dvk' | 'oc' | 'skill'

const enums = {
  svk: stringValueKey,
  lvk: intValueKey,
  dvk: doubleValueKey,
  oc: objectClass,
  skill: vtcSkillID,
} as const

// C# ComboKeys sorts the enum names with Array.Sort, which uses culture order, not ordinal order.
const byCulture = new Intl.Collator('en').compare
const sortedNames: Record<KeyKind, readonly string[]> = {
  svk: Object.keys(stringValueKey).sort(byCulture),
  lvk: Object.keys(intValueKey).sort(byCulture),
  dvk: Object.keys(doubleValueKey).sort(byCulture),
  oc: Object.keys(objectClass).sort(byCulture),
  skill: Object.keys(vtcSkillID).sort(byCulture),
}

export function keyNames(kind: KeyKind): readonly string[] {
  return sortedNames[kind]
}

export function keyValueFromIndex(kind: KeyKind, index: number): number {
  const name = sortedNames[kind][index]
  if (name === undefined) throw new RangeError(`combo key index out of range: ${kind} ${index}`)
  return (enums[kind] as Record<string, number>)[name] as number
}

export function indexFromKeyValue(kind: KeyKind, value: number): number {
  return sortedNames[kind].findIndex(
    (name) => (enums[kind] as Record<string, number>)[name] === value,
  )
}

/** The enum name of a key value, or the number as text for a value not in the list. */
export function keyNameFromValue(kind: KeyKind, value: number): string {
  const index = indexFromKeyValue(kind, value)
  return index === -1 ? String(value) : sortedNames[kind][index]!
}

const nonIdValues = {
  svk: new Set<number>([stringValueKey.Name, stringValueKey.SecondaryName]),
  lvk: new Set<number>([
    intValueKey.CreateFlags1,
    intValueKey.Type,
    intValueKey.Icon,
    intValueKey.Category,
    intValueKey.Behavior,
    intValueKey.CreateFlags2,
    intValueKey.IconUnderlay,
    intValueKey.ItemSlots,
    intValueKey.PackSlots,
    intValueKey.MissileType,
    intValueKey.Value,
    intValueKey.UsageMask,
    intValueKey.IconOutline,
    intValueKey.EquipType,
    intValueKey.UsesRemaining,
    intValueKey.UsesTotal,
    intValueKey.StackCount,
    intValueKey.StackMax,
    intValueKey.Container,
    intValueKey.Slot,
    intValueKey.EquipableSlots,
    intValueKey.EquippedSlots,
    intValueKey.Coverage,
    intValueKey.Unknown8000000,
    intValueKey.Monarch,
    intValueKey.HookMask,
    intValueKey.IconOverlay,
    intValueKey.Material,
  ]),
  dvk: new Set<number>([doubleValueKey.ApproachDistance, doubleValueKey.SalvageWorkmanship]),
} as const

export function isIdProperty(kind: KeyKind, value: number): boolean {
  // ComboKeys.GetOCColor and GetSkillColor always return white.
  if (kind === 'oc' || kind === 'skill') return false
  return !nonIdValues[kind].has(value)
}
