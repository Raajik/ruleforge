/**
 * Requirement field editor (T28). For each requirement type, the fields the
 * legacy editor shows: the acts-on combo, up to four text values and a color
 * sample. `SetCurrentReq` (ref/editor/Form1.cs 187-291) fills these controls
 * from the UI_* methods of each type, and the handlers at Form1.cs 656-769
 * set them. This module copies those methods. One entry per type holds the
 * line of the first UI_* override in ref/shared/LootRules.cs.
 *
 * The legacy text setters use `int.TryParse` and `double.TryParse`, so an
 * invalid text stores 0. The regex fields keep their text and are never
 * compiled here (PLAN.md Traps).
 */

import { formatDouble, haxConvertDouble } from '../format/doubles'
import { eLootRuleType } from '../format/enums'
import type { Requirement } from '../format/profile'
import { parseInt32 } from '../format/reader'
import { indexFromKeyValue, keyNames, keyValueFromIndex, type KeyKind } from '../gamedata/combokeys'
import { doubleValueKey, intValueKey } from '../gamedata/generated'

/**
 * The acts-on combo of type 15 lists the color slot names. The C# list always
 * has at least "None" (ref/shared/ColorXML.cs 73-74). The caller passes the
 * real list of its ColorSlots XML file.
 */
const DEFAULT_ARMOR_GROUPS: readonly string[] = ['None']

export type ReqTextId = 'value1' | 'value2' | 'value3' | 'value4'
export type ReqFieldId = 'actsOn' | ReqTextId | 'colorSample'

export interface ReqActsOnField {
  id: 'actsOn'
  kind: 'select'
  label: string
  options: readonly string[]
  /** The selected option. -1 when the value is not in the list, as an empty combo shows. */
  value: number
}

export interface ReqTextField {
  id: ReqTextId
  kind: 'text'
  label: string
  value: string
}

export interface ReqColorField {
  id: 'colorSample'
  kind: 'color'
  label: string
  /** The color as a CSS value, from R, G and B. */
  value: string
}

export type ReqField = ReqActsOnField | ReqTextField | ReqColorField

type ActsOnSpec =
  // `field` is where the key value lives: StringValueMatch stores it in
  // `key`, every other type in `vk`.
  | { kind: 'key'; label: string; keyKind: KeyKind; field: 'vk' | 'key' }
  | { kind: 'status' }
  | { kind: 'armor' }
  | { kind: 'keys'; label: string; keys: readonly (readonly [number, string])[] }

/** 'hex' and 'rgb' copy `int.TryParse(value, NumberStyles.HexNumber, ...)`. */
type ParseKind = 'text' | 'int' | 'double' | 'hex' | 'rgb'

interface TextSpec {
  id: ReqTextId
  label: string
  /** The field on the requirement object. Unused for 'rgb', which sets R, G and B. */
  field: string
  parse: ParseKind
}

interface TypeFields {
  actsOn?: ActsOnSpec
  text?: readonly TextSpec[]
  colorSample?: boolean
}

function t(id: ReqTextId, label: string, field: string, parse: ParseKind): TextSpec {
  return { id, label, field, parse }
}

// LootRules.cs 2566-2567 and 2640-2641: the two buffed acts-on lists, in this order.
const BUFFED_INT_KEYS: readonly (readonly [number, string])[] = [
  [intValueKey.ArmorLevel, 'ArmorLevel'],
  [intValueKey.MaxDamage, 'MaxDamage'],
]
const BUFFED_DOUBLE_KEYS: readonly (readonly [number, string])[] = [
  [doubleValueKey.AttackBonus, 'AttackBonus'],
  [doubleValueKey.ElementalDamageVersusMonsters, 'ElementalDamageVersusMonsters'],
  [doubleValueKey.ManaCBonus, 'ManaCBonus'],
  [doubleValueKey.MeleeDefenseBonus, 'MeleeDefenseBonus'],
]

const LVK: ActsOnSpec = { kind: 'key', label: 'Acts on', keyKind: 'lvk', field: 'vk' }
const DVK: ActsOnSpec = { kind: 'key', label: 'Acts on', keyKind: 'dvk', field: 'vk' }

const fieldSpecs: Record<number, TypeFields> = {
  0: { text: [t('value1', 'Spell Name Pattern', 'pattern', 'text')] }, // 337
  1: {
    actsOn: { kind: 'key', label: 'Acts on', keyKind: 'svk', field: 'key' }, // 410-414
    text: [t('value1', 'String Value Pattern', 'pattern', 'text')], // 405
  },
  2: { actsOn: LVK, text: [t('value1', 'Long Value', 'keyval', 'int')] }, // 522-531
  3: { actsOn: LVK, text: [t('value1', 'Long Value', 'keyval', 'int')] }, // 639-648
  4: { actsOn: DVK, text: [t('value1', 'Double Value', 'keyval', 'double')] }, // 714-723
  5: { actsOn: DVK, text: [t('value1', 'Double Value', 'keyval', 'double')] }, // 789-798
  6: { text: [t('value1', 'Damage Percent', 'keyval', 'double')] }, // 853
  7: { actsOn: { kind: 'key', label: 'ObjectClass is', keyKind: 'oc', field: 'vk' } }, // 910-914
  8: { text: [t('value1', 'Spell Count', 'keyval', 'int')] }, // 978
  9: {
    // 1068-1081: the second setter is `new Regex(value)` and throws on a bad
    // pattern in the C# app; here the pattern stays text (PLAN.md Traps).
    text: [
      t('value1', 'Does Match', 'rxDoesMatch', 'text'),
      t('value2', 'Does NOT Match', 'rxDoesNotMatch', 'text'),
      t('value3', 'Minimum spells that match', 'count', 'int'),
    ],
  },
  10: { text: [t('value1', 'Minimum Damage', 'keyval', 'double')] }, // 1145
  11: { actsOn: LVK, text: [t('value1', 'Long Value', 'keyval', 'int')] }, // 1213-1222
  12: { actsOn: LVK, text: [t('value1', 'Long Value', 'keyval', 'int')] }, // 1480-1489
  13: { actsOn: LVK, text: [t('value1', 'Long Value', 'keyval', 'int')] }, // 1597-1606
  14: {
    // 1982-1998
    text: [
      t('value1', 'RGB color value (hex)', 'r', 'rgb'),
      t('value2', 'Max diff (Hue 0-255)', 'maxDifferenceH', 'double'),
      t('value3', 'Max diff (S/V 0-1)', 'maxDifferenceSV', 'double'),
    ],
    colorSample: true,
  },
  15: {
    // 2148-2170
    actsOn: { kind: 'armor' },
    text: [
      t('value1', 'RGB color value (hex)', 'r', 'rgb'),
      t('value2', 'Max diff (Hue 0-255)', 'maxDifferenceH', 'double'),
      t('value3', 'Max diff (S/V 0-1)', 'maxDifferenceSV', 'double'),
    ],
    colorSample: true,
  },
  16: {
    // 2269-2290: value4 is labelled "Palette Entry #" but it holds Slot.
    text: [
      t('value1', 'RGB color value (hex)', 'r', 'rgb'),
      t('value2', 'Max diff (Hue 0-255)', 'maxDifferenceH', 'double'),
      t('value3', 'Max diff (S/V 0-1)', 'maxDifferenceSV', 'double'),
      t('value4', 'Palette Entry #', 'slot', 'int'),
    ],
    colorSample: true,
  },
  17: {
    // 2352-2360
    text: [t('value1', 'Palette Entry #', 'slot', 'int'), t('value2', 'Palette ID', 'palette', 'hex')],
  },
  1000: { actsOn: { kind: 'key', label: 'Acts on', keyKind: 'skill', field: 'vk' }, text: [t('value1', 'Buffed Skill Value', 'keyval', 'int')] }, // 1292-1301
  1001: { text: [t('value1', 'Empty Slots', 'keyval', 'int')] }, // 1370
  1002: { text: [t('value1', 'Character Level', 'keyval', 'int')] }, // 1661
  1003: { text: [t('value1', 'Character Level', 'keyval', 'int')] }, // 1718
  1004: {
    // 1793-1807
    actsOn: { kind: 'key', label: 'Acts on', keyKind: 'skill', field: 'vk' },
    text: [
      t('value1', 'Minimum Base Skill', 'minskill', 'int'),
      t('value2', 'Maximum Base Skill', 'maxskill', 'int'),
    ],
  },
  2000: { text: [t('value1', 'Calced Buffed Median Damage', 'keyval', 'double')] }, // 2430
  2001: { text: [t('value1', 'Calced Buffed Missile Damage', 'keyval', 'double')] }, // 2497
  2003: { actsOn: { kind: 'keys', label: 'Acts on', keys: BUFFED_INT_KEYS }, text: [t('value1', 'Buffed Long Value', 'keyval', 'double')] }, // 2561-2573
  2005: { actsOn: { kind: 'keys', label: 'Acts on', keys: BUFFED_DOUBLE_KEYS }, text: [t('value1', 'Buffed Double Value', 'keyval', 'double')] }, // 2635-2647
  2006: { text: [t('value1', 'Calced Buffed Tinked Damage', 'keyval', 'double')] }, // 2712
  2007: { text: [t('value1', 'Calced Total Ratings', 'keyval', 'double')] }, // 2779
  2008: {
    // 2849-2862
    text: [
      t('value1', 'Target Calced Buffed Tinked DoT', 'dot', 'double'),
      t('value2', 'Target Buffed Melee Defense Bonus', 'meleeDefenseBonus', 'double'),
      t('value3', 'Target Buffed Attack Bonus', 'attackBonus', 'double'),
    ],
  },
  [eLootRuleType.DisabledRule]: { actsOn: { kind: 'status' } }, // 1861-1870
}

function fields(req: Requirement): TypeFields {
  return fieldSpecs[req.type] ?? {}
}

function data(req: Requirement): Record<string, unknown> {
  return req as unknown as Record<string, unknown>
}

// The C# hex fields mask to 24 bits and use no leading zero: "FF", not "0000FF".
function hex24(value: number): string {
  return (value & 0xffffff).toString(16).toUpperCase()
}

// Copies `int.TryParse(value, NumberStyles.HexNumber, ...)`: an optional 0x
// prefix, 1 to 8 hex digits, and two's complement for a full 8 digits. An
// invalid or too long text gives 0, as a failed TryParse does.
function parseHex32(text: string): number {
  const s = text.trim().replace(/^0[xX]/, '')
  if (!/^[0-9a-fA-F]{1,8}$/.test(s)) return 0
  const n = Number.parseInt(s, 16)
  return n > 0x7fffffff ? n - 0x100000000 : n
}

// The R, G and B fields of the similar color types as one 24-bit value.
function rgb24(req: Requirement): number {
  const { r = 0, g = 0, b = 0 } = data(req) as { r?: number; g?: number; b?: number }
  return (r << 16) | (g << 8) | b
}

function textGet(req: Requirement, spec: TextSpec): string {
  switch (spec.parse) {
    case 'text':
      return typeof data(req)[spec.field] === 'string' ? (data(req)[spec.field] as string) : ''
    case 'int':
      return String(data(req)[spec.field] ?? 0)
    case 'double':
      // The C# getter is `double.ToString()`, which is G15 like formatDouble.
      return formatDouble(Number(data(req)[spec.field]))
    case 'hex':
      return hex24(Number(data(req)[spec.field]))
    case 'rgb':
      return hex24(rgb24(req))
  }
}

function actsOnLabel(spec: ActsOnSpec): string {
  if (spec.kind === 'status') return 'Status'
  if (spec.kind === 'armor') return 'Armor Type/Color Region'
  return spec.label
}

function actsOnOptions(spec: ActsOnSpec, armorGroups: readonly string[]): readonly string[] {
  switch (spec.kind) {
    case 'key':
      return keyNames(spec.keyKind)
    case 'status':
      return ['Disabled', 'Enabled']
    case 'armor':
      return armorGroups
    case 'keys':
      return spec.keys.map(([, name]) => name)
  }
}

function actsOnIndex(req: Requirement, spec: ActsOnSpec, armorGroups: readonly string[]): number {
  switch (spec.kind) {
    case 'key':
      return indexFromKeyValue(spec.keyKind, Number(data(req)[spec.field]))
    case 'status':
      return data(req).b === true ? 0 : 1
    case 'armor':
      return armorGroups.indexOf(String(data(req).armorGroup ?? ''))
    case 'keys':
      return spec.keys.findIndex(([value]) => value === data(req).vk)
  }
}

/** The fields `SetCurrentReq` shows for a requirement, in the legacy order. */
export function requirementFields(
  req: Requirement,
  armorGroups: readonly string[] = DEFAULT_ARMOR_GROUPS,
): ReqField[] {
  const spec = fields(req)
  const result: ReqField[] = []
  if (spec.actsOn) {
    result.push({
      id: 'actsOn',
      kind: 'select',
      label: actsOnLabel(spec.actsOn),
      options: actsOnOptions(spec.actsOn, armorGroups),
      value: actsOnIndex(req, spec.actsOn, armorGroups),
    })
  }
  for (const text of spec.text ?? []) {
    result.push({ id: text.id, kind: 'text', label: text.label, value: textGet(req, text) })
  }
  if (spec.colorSample) {
    result.push({ id: 'colorSample', kind: 'color', label: 'Color sample', value: `#${hex24(rgb24(req))}` })
  }
  return result
}

/**
 * Sets a text field, as `UI_TextValue*_Set` does (Form1.cs 690-769). A field
 * the type does not show leaves the requirement unchanged. It never changes
 * its input.
 */
export function setTextValue(req: Requirement, id: ReqTextId, text: string): Requirement {
  const spec = fields(req).text?.find((f) => f.id === id)
  if (!spec) return req
  switch (spec.parse) {
    case 'text':
      return { ...req, [spec.field]: text } as Requirement
    case 'int':
      // int.TryParse gives 0 when it fails (LootRules.cs 524).
      return { ...req, [spec.field]: parseInt32(text) ?? 0 } as Requirement
    case 'double':
      // double.TryParse gives 0 when it fails (LootRules.cs 716).
      return { ...req, [spec.field]: haxConvertDouble(text) } as Requirement
    case 'hex':
      return { ...req, [spec.field]: parseHex32(text) } as Requirement
    case 'rgb': {
      // LootRules.cs 1984: FromArgb(p | 0xFF000000), so alpha is forced on.
      const p = parseHex32(text)
      return { ...req, r: (p >>> 16) & 255, g: (p >>> 8) & 255, b: p & 255 } as Requirement
    }
  }
}

/**
 * Sets the acts-on combo, as `UI_ActsOnCombo_Set` does (Form1.cs 668). An
 * index the combo cannot give throws, as the C# list indexer does. It never
 * changes its input.
 */
export function setActsOn(
  req: Requirement,
  index: number,
  armorGroups: readonly string[] = DEFAULT_ARMOR_GROUPS,
): Requirement {
  const spec = fields(req).actsOn
  if (!spec) return req
  switch (spec.kind) {
    case 'key':
      return { ...req, [spec.field]: keyValueFromIndex(spec.keyKind, index) } as Requirement
    case 'status':
      return { ...req, b: index < 1 } as Requirement
    case 'armor': {
      const group = armorGroups[index]
      if (group === undefined) throw new RangeError(`armor group index out of range: ${index}`)
      return { ...req, armorGroup: group } as Requirement
    }
    case 'keys': {
      const entry = spec.keys[index]
      if (entry === undefined) throw new RangeError(`buffed key index out of range: ${index}`)
      return { ...req, vk: entry[0] } as Requirement
    }
  }
}
