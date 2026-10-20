// The item input of the loot evaluator (PLAN.md H3a). The C# Match methods of
// ref/shared/LootRules.cs read an item through GameItemInfo: the object class,
// int, double and string property values, the spell names and the palettes.
// The keys here are the enum names of gamedata/generated.ts, so a caller
// builds an item with intValueKey.Material and friends.

import { doubleValueKey, intValueKey, stringValueKey } from '../gamedata/generated'

/** An RGB color like System.Drawing.Color, with 0 to 255 channels. */
export interface Rgb {
  r: number
  g: number
  b: number
}

/** One palette of the item, like GameItemInfo.PaletteData. */
export interface ItemPalette {
  /** The palette id. Type 17 compares it masked to 24 bits. */
  palette: number
  /** The example color of the palette, like PaletteData.ExampleColor. */
  exampleColor: Rgb
}

/**
 * What the evaluator needs from an item, like the GameItemInfo of the plugin.
 * The value maps hold only the keys the item has. A key that is not there
 * falls back to the default of the C# call, as `GetValueInt(vk, 0)` does.
 */
export interface LootItem {
  /** ObjectClass, like GameItemInfo.ObjectClass (LootRules.cs 873). */
  objectClass: number
  /** IntValueKey values, for example `{ Material: 131 }`. */
  intValues: Record<string, number>
  /** DoubleValueKey values, for example `{ Variance: 0.25 }`. */
  doubleValues: Record<string, number>
  /** StringValueKey values, for example `{ Name: 'Obsidian Blade' }`. */
  stringValues: Record<string, string>
  /** The names of the item spells, like MySpell.Name (LootRules.cs 285). */
  spells: string[]
  /** Spell IDs for buff calculations (like GameItemInfo.Spells[i].Id). */
  spellIds?: number[]
  /** The palettes of the item, in slot order. */
  palettes: ItemPalette[]
}

// Number to enum name. Every value of the three generated enums is unique
// (checked in item.test.ts), so the reverse map is unambiguous.
const intValueKeyName = reverse(intValueKey)
const doubleValueKeyName = reverse(doubleValueKey)
const stringValueKeyName = reverse(stringValueKey)

function reverse(table: Record<string, number>): Map<number, string> {
  return new Map(Object.entries(table).map(([name, value]) => [value, name]))
}

/** `GetValueInt(vk, defaultValue)` on the int values of the item. */
export function getValueInt(item: LootItem, vk: number, defaultValue: number): number {
  const name = intValueKeyName.get(vk)
  if (name === undefined) return defaultValue
  return item.intValues[name] ?? defaultValue
}

/** `GetValueDouble(vk, defaultValue)` on the double values of the item. */
export function getValueDouble(item: LootItem, vk: number, defaultValue: number): number {
  const name = doubleValueKeyName.get(vk)
  if (name === undefined) return defaultValue
  return item.doubleValues[name] ?? defaultValue
}

/** `GetValueString(vk, defaultValue)` on the string values of the item. */
export function getValueString(item: LootItem, vk: number, defaultValue: string): string {
  const name = stringValueKeyName.get(vk)
  if (name === undefined) return defaultValue
  return item.stringValues[name] ?? defaultValue
}

/**
 * AnySimilarColor.ColorToHSV (LootRules.cs 1887-1895): hue from
 * System.Drawing.Color.GetHue (0 to 360, in float math), saturation
 * `1 - min / max` and value `max / 255`, both in double math.
 */
export function colorToHSV(color: Rgb): { hue: number; saturation: number; value: number } {
  const max = Math.max(color.r, Math.max(color.g, color.b))
  const min = Math.min(color.r, Math.min(color.g, color.b))
  return {
    hue: getHue(color),
    saturation: max === 0 ? 0 : 1 - min / max,
    value: max / 255,
  }
}

// System.Drawing.Color.GetHue: the channels divide by 255f and every step
// stays in single precision, so this uses Math.fround.
function getHue(color: Rgb): number {
  if (color.r === color.g && color.g === color.b) return 0
  const r1 = Math.fround(color.r / 255)
  const g1 = Math.fround(color.g / 255)
  const b1 = Math.fround(color.b / 255)
  const max = Math.max(r1, Math.max(g1, b1))
  const min = Math.min(r1, Math.min(g1, b1))
  const delta = Math.fround(max - min)
  let hue: number
  if (max === r1) hue = Math.fround((g1 - b1) / delta)
  else if (max === g1) hue = Math.fround(2 + Math.fround((b1 - r1) / delta))
  else hue = Math.fround(4 + Math.fround((r1 - g1) / delta))
  hue = Math.fround(hue * 60)
  if (hue < 0) hue += 360
  return hue
}
