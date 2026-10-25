// The Randomize roll of the armor preview (specs/armor-preview.md items 9-10).
// The game colours loot armor with one palette template and one shade, and
// every region of the piece takes its colour from that pair (ACE
// LootGenerationFactory.MutateColor; docs/gamedata.md). Ruleforge has no item
// material, so every template of a piece has the same weight.
//
// Two modes:
// - exact: the piece's real templates and palettes, read from the user's own
//   client_portal.dat (src/core/dat/). Only looks whose rule region passes the
//   rule's similar-colour test (src/core/eval) can come up.
// - approximate: a named template with a hand-tuned colour and a random shade.
//   The rule's region keeps the rule's colour.

import type { SimilarColorArmorTypeRequirement } from '../format/profile'
import { matchRequirement, type SlotDefinitions } from '../eval/match'
import type { LootItem, Rgb } from '../eval/item'
import { colorHex, NEUTRAL_COLOR, pieceGroups, PIECE_PARTS, type ArmorView } from './armorpreview'

/** One palette slot of a template: the shades of its PaletteSet and the entry its example colour comes from. */
export interface SlotLooks {
  /** The palette ids of the PaletteSet, in shade order. */
  palettes: Numbers
  /** The palette entry of the example colour: the middle of the slot's range. */
  entry: number
}

/** The templates of a piece's ClothingTable. A template's slots are its sub-palette ranges in file order. */
export interface PieceLooks {
  templates: readonly { id: number; slots: readonly SlotLooks[] }[]
}

/** Palette id to its colours (0xAARRGGBB). */
export type PaletteColors = ReadonlyMap<number, Numbers>

/** A number list: an array, or the Uint32Array the DAT parsers give. */
export type Numbers = ArrayLike<number> & Iterable<number>

/** The colours a rolled look gives the stand-in model. */
export interface Paint {
  parts: Readonly<Record<string, string>>
  pattern: string
}

export interface Look {
  template: number
  shade: number
  paint: Paint
  /** True for colours from the game files. */
  exact: boolean
  /** The text alternative, for example "Amuli Coat, Chest in #3060C0, rolled as AquaBlue at shade 0.42". */
  label: string
}

export type Roll = { kind: 'look'; look: Look } | { kind: 'never'; message: string }

/**
 * The names of ACE's PaletteTemplate enum, by id (ACE.Entity/Enum/PaletteTemplate.cs).
 * Names only; the exact roll reads the colours from the game files.
 */
const TEMPLATE_NAMES = [
  'Undef', 'AquaBlue', 'Blue', 'BluePurple', 'Brown', 'DarkBlue', 'DeepBrown', 'DeepGreen', 'Green', 'Grey',
  'LightBlue', 'Maroon', 'Navy', 'Purple', 'Red', 'RedPurple', 'Rose', 'Yellow', 'YellowBrown', 'Copper', 'Silver',
  'Gold', 'Aqua', 'DarkAquaMetal', 'DarkBlueMetal', 'DarkCopperMetal', 'DarkGoldMetal', 'DarkGreenMetal',
  'DarkPurpleMetal', 'DarkRedMetal', 'DarkSilverMetal', 'LightAquaMetal', 'LightBlueMetal', 'LightCopperMetal',
  'LightGoldMetal', 'LightGreenMetal', 'LightPurpleMetal', 'LightRedMetal', 'LightSilverMetal', 'Black', 'Bronze',
  'SandyYellow', 'DarkBrown', 'LightBrown', 'TanRed', 'PaleGreen', 'Tan', 'PastyYellow', 'SnowyWhite', 'RuddyYellow',
  'RuddierYellow', 'MidGrey', 'DarkGrey', 'BlueDullSilver', 'YellowPaleSilver', 'BrownBlueDark', 'BrownBlueMed',
  'GreenSilver', 'BrownGreen', 'YellowGreen', 'PalePurple', 'White', 'RedBrown', 'GreenBrown', 'OrangeBrown',
  'PaleGreenBrown', 'PaleOrange', 'GreenSlime', 'BlueSlime', 'YellowSlime', 'PurpleSlime', 'DullRed', 'GreyWhite',
  'MediumGrey', 'DullGreen', 'OliveGreen', 'Orange', 'BlueGreen', 'Olive', 'Lead', 'Iron', 'LiteGreen', 'PinkPurple',
  'Amber', 'DyeDarkGreen', 'DyeDarkRed', 'DyeDarkYellow', 'DyeBotched', 'DyeWinterBlue', 'DyeWinterGreen',
  'DyeWinterSilver', 'DyeSpringBlue', 'DyeSpringPurple', 'DyeSpringBlack',
]

export function templateName(id: number): string {
  return TEMPLATE_NAMES[id] ?? `Template ${id}`
}

/** Hand-tuned colours at the middle shade for the approximate roll. Not from the game files. */
export const APPROXIMATE_TEMPLATES: readonly { id: number; color: Rgb }[] = [
  { id: 1, color: { r: 0x3f, g: 0xa8, b: 0xb8 } },
  { id: 2, color: { r: 0x10, g: 0x5c, b: 0x96 } },
  { id: 3, color: { r: 0x4f, g: 0x45, b: 0xa8 } },
  { id: 4, color: { r: 0x7a, g: 0x52, b: 0x30 } },
  { id: 5, color: { r: 0x1f, g: 0x2f, b: 0x6b } },
  { id: 7, color: { r: 0x1f, g: 0x5a, b: 0x2e } },
  { id: 8, color: { r: 0x3d, g: 0x77, b: 0x09 } },
  { id: 9, color: { r: 0x80, g: 0x80, b: 0x80 } },
  { id: 11, color: { r: 0x6b, g: 0x1f, b: 0x2a } },
  { id: 13, color: { r: 0x52, g: 0x0a, b: 0x8d } },
  { id: 14, color: { r: 0x9a, g: 0x08, b: 0x0c } },
  { id: 17, color: { r: 0xc8, g: 0xb0, b: 0x30 } },
  { id: 19, color: { r: 0x85, g: 0x32, b: 0x0a } },
  { id: 20, color: { r: 0x7d, g: 0x7d, b: 0x80 } },
  { id: 21, color: { r: 0xa0, g: 0x73, b: 0x00 } },
  { id: 22, color: { r: 0x11, g: 0x66, b: 0x40 } },
  { id: 39, color: { r: 0x2e, g: 0x2e, b: 0x2e } },
]

/**
 * The palette of a set at a shade. ACE's PaletteSet.GetPaletteID (taken from
 * the client): the index is (count - 0.000001) * shade, cut to a whole number
 * and kept inside the list.
 */
export function paletteIndex(count: number, shade: number): number {
  const index = Math.trunc((count - 0.000001) * shade)
  return Math.min(Math.max(index, 0), count - 1)
}

/** The example colour of a slot at a shade, or null when the palette is not loaded or too short. */
export function slotColor(slot: SlotLooks, shade: number, colors: PaletteColors): Rgb | null {
  if (slot.palettes.length === 0) return null
  const palette = colors.get(slot.palettes[paletteIndex(slot.palettes.length, shade)]!)
  const argb = palette?.[slot.entry]
  if (argb === undefined) return null
  return { r: (argb >>> 16) & 0xff, g: (argb >>> 8) & 0xff, b: argb & 0xff }
}

/** The palette ids the match test needs: every shade of the slots of the rule's region. */
export function regionPalettes(looks: PieceLooks, regionSlots: readonly number[]): Set<number> {
  const ids = new Set<number>()
  for (const t of looks.templates) {
    for (const k of regionSlots) for (const id of t.slots[k]?.palettes ?? []) ids.add(id)
  }
  return ids
}

/** True when every template has every slot of the region, so the game files can colour it. */
export function hasRegion(looks: PieceLooks, regionSlots: readonly number[]): boolean {
  return (
    looks.templates.length > 0 &&
    regionSlots.length > 0 &&
    looks.templates.every((t) => regionSlots.every((k) => k >= 0 && k < t.slots.length))
  )
}

/** A template and a shade range in which the rule's region looks the same. */
export interface ShadeSpan {
  template: number
  from: number
  to: number
}

/**
 * The template and shade ranges whose look passes the rule. A slot's palette
 * only changes where its set's index steps, so testing the middle of each
 * step range covers every shade.
 */
export function matchingSpans(
  looks: PieceLooks,
  req: SimilarColorArmorTypeRequirement,
  slots: SlotDefinitions,
  colors: PaletteColors,
): ShadeSpan[] {
  const region = slots.get(req.armorGroup) ?? []
  const spans: ShadeSpan[] = []
  for (const t of looks.templates) {
    const cuts = new Set([0, 1])
    for (const k of region) {
      const n = t.slots[k]?.palettes.length ?? 0
      for (let j = 1; j < n; j++) cuts.add(j / (n - 0.000001))
    }
    const sorted = [...cuts].filter((c) => c >= 0 && c <= 1).sort((a, b) => a - b)
    for (let i = 0; i + 1 < sorted.length; i++) {
      const from = sorted[i]!
      const to = sorted[i + 1]!
      if (to > from && matchedSlot(t.slots, region, (from + to) / 2, colors, req) !== undefined) {
        spans.push({ template: t.id, from, to })
      }
    }
  }
  return spans
}

/**
 * The first slot of the region whose example colour passes the rule, or
 * undefined. Type 15 passes when any slot of its group passes
 * (LootRules.cs 2053-2100); each slot goes through the evaluator's type 16
 * test, the same similar-colour check on one slot. A slot without a known
 * colour does not pass.
 */
function matchedSlot(
  templateSlots: readonly SlotLooks[],
  region: readonly number[],
  shade: number,
  colors: PaletteColors,
  req: SimilarColorArmorTypeRequirement,
): number | undefined {
  const { r, g, b, maxDifferenceH, maxDifferenceSV } = req
  return region.find((k) => {
    const slot = templateSlots[k]
    const color = slot && slotColor(slot, shade, colors)
    if (!color) return false
    const item: LootItem = { objectClass: 0, intValues: {}, doubleValues: {}, stringValues: {}, spells: [], palettes: [] }
    item.palettes[k] = { palette: 0, exampleColor: color }
    return matchRequirement({ type: 16, r, g, b, maxDifferenceH, maxDifferenceSV, slot: k }, item) === true
  })
}

/** One look of the spans at random. Every shade is equally likely, so a span weighs as much as it is long. */
export function pickSpan(spans: readonly ShadeSpan[], random: () => number): { template: number; shade: number } | null {
  const total = spans.reduce((sum, s) => sum + (s.to - s.from), 0)
  if (spans.length === 0 || total <= 0) return null
  let at = random() * total
  for (const s of spans) {
    const length = s.to - s.from
    if (at < length || s === spans[spans.length - 1]) {
      // Stay off the span's ends: at a step the float product can land on the neighbour palette.
      return { template: s.template, shade: s.from + Math.min(Math.max(at, length * 1e-6), length * (1 - 1e-6)) }
    }
    at -= length
  }
  return null
}

/** The palette ids a look shows at its shade, for every slot of the template. */
export function lookPalettes(looks: PieceLooks, template: number, shade: number): Set<number> {
  const ids = new Set<number>()
  for (const slot of looks.templates.find((t) => t.id === template)?.slots ?? []) {
    if (slot.palettes.length > 0) ids.add(slot.palettes[paletteIndex(slot.palettes.length, shade)]!)
  }
  return ids
}

/**
 * The paint of an exact look. Each group of the piece colours its parts with
 * its first slot; the rule's region uses the first of its slots that passes
 * the rule. Parts that no group names take slot 0.
 */
export function exactPaint(
  view: ArmorView,
  req: SimilarColorArmorTypeRequirement,
  slots: SlotDefinitions,
  looks: PieceLooks,
  template: number,
  shade: number,
  colors: PaletteColors,
): Paint {
  const templateSlots = looks.templates.find((t) => t.id === template)?.slots ?? []
  const hex = (k: number | undefined) => {
    const slot = k === undefined ? undefined : templateSlots[k]
    const color = slot && slotColor(slot, shade, colors)
    return color ? colorHex(color.r, color.g, color.b) : NEUTRAL_COLOR
  }
  const region = slots.get(req.armorGroup) ?? []
  const matched = matchedSlot(templateSlots, region, shade, colors, req)
  const parts: Record<string, string> = {}
  for (const part of PIECE_PARTS[view.piece]) parts[part] = hex(0)
  for (const { group, view: g } of pieceGroups(view.name)) {
    for (const part of g.colored) parts[part] = hex(slots.get(group)?.[0])
  }
  const regionColor = hex(matched ?? region[0])
  for (const part of view.colored) parts[part] = regionColor
  return { parts, pattern: regionColor }
}

/** The paint of an approximate look: the rule's colour on its region, the template's colour elsewhere. */
export function approximatePaint(view: ArmorView, color: Rgb, shade: number): Paint {
  // Shade 0 is the darkest palette of a set and 1 the lightest (docs/gamedata.md).
  const scale = 0.55 + 0.9 * shade
  const tone = (factor: number) =>
    colorHex(Math.round(color.r * scale * factor), Math.round(color.g * scale * factor), Math.round(color.b * scale * factor))
  const parts: Record<string, string> = {}
  for (const part of PIECE_PARTS[view.piece]) {
    // Trims read as a second region, as the game's trims mostly come from another sub-palette.
    parts[part] = /trim|belt|collar|neck|horns|mask/.test(part) ? tone(0.7) : tone(1)
  }
  for (const part of view.colored) parts[part] = view.color
  return { parts, pattern: view.color }
}

export function rollLabel(view: ArmorView, template: number, shade: number): string {
  return `${view.label}, rolled as ${templateName(template)} at shade ${shade.toFixed(2)}`
}

/** The approximate roll: a template of the fixed list and a shade, both at random. */
export function rollApproximate(view: ArmorView, random: () => number): Look {
  const pick = APPROXIMATE_TEMPLATES[Math.min(Math.trunc(random() * APPROXIMATE_TEMPLATES.length), APPROXIMATE_TEMPLATES.length - 1)]!
  const shade = random()
  return {
    template: pick.id,
    shade,
    paint: approximatePaint(view, pick.color, shade),
    exact: false,
    label: rollLabel(view, pick.id, shade),
  }
}

/**
 * The ClothingTable of each piece that the default slot file names, from the
 * ClothingBase of the piece's weenie in ACE's world data (docs/gamedata.md).
 * "Celdon" names no piece; its slots fit the Celdon Breastplate.
 */
export const CLOTHING_TABLES: Readonly<Record<string, number>> = {
  'Amuli Coat': 0x100001a1,
  'Amuli Legs': 0x100001a0,
  Celdon: 0x10000188,
  'Chiran Coat': 0x1000053d,
  'Chiran Legs': 0x10000540,
  'Chiran Helm': 0x10000541,
  'Haebrean BP': 0x100007a5,
  'Haebrean Girth': 0x100007a7,
  'Haebrean Helm': 0x100007a9,
  'Haebrean Pauldrons': 0x100007aa,
  'Lorica BP': 0x10000547,
  'Lorica Legs': 0x10000545,
  'Nariyid BP': 0x1000054b,
  'Nariyid Girth': 0x10000548,
  'Nariyid Sleeves': 0x10000549,
  'Olthoi BP': 0x1000071b,
  'Olthoi Alduressa Legs': 0x10000739,
  'Olthoi Amuli Coat': 0x1000072c,
  'Olthoi Amuli Legs': 0x1000072b,
  'Olthoi Koujia Kabuton': 0x10000732,
  'Olthoi Koujia Legs': 0x10000734,
  'Scalemail Cuirass': 0x100000a1,
  'Tenassa Legs': 0x100005c1,
  'Tenassa BP': 0x100005ca,
  'Yoroi Cuirass': 0x100000a3,
  'Yoroi Girth': 0x10000047,
}

/** Where the exact roll reads a piece's looks and palettes (src/core/dat/looks.ts on the user's DAT). */
export interface LookSource {
  /** The looks of a ClothingTable, or null when the file has none with the id. */
  piece(clothingId: number): Promise<PieceLooks | null>
  /** The colours of the palettes. */
  colors(ids: Iterable<number>): Promise<PaletteColors>
}

/**
 * The exact roll of a type 15 view, or null when the game files cannot
 * colour it: no known ClothingTable for the piece, none in the file, or a
 * region slot that the piece's templates lack. The caller then uses the
 * approximate roll. A read error rejects.
 */
export async function rollExact(
  source: LookSource,
  view: ArmorView,
  req: SimilarColorArmorTypeRequirement,
  slots: SlotDefinitions,
  random: () => number,
): Promise<Roll | null> {
  const id = CLOTHING_TABLES[view.name]
  if (id === undefined) return null
  const looks = await source.piece(id)
  const region = slots.get(req.armorGroup) ?? []
  if (!looks || !hasRegion(looks, region)) return null
  const regionColors = await source.colors(regionPalettes(looks, region))
  const pick = pickSpan(matchingSpans(looks, req, slots, regionColors), random)
  if (!pick) return { kind: 'never', message: neverRollsMessage(view) }
  const colors = new Map(regionColors)
  for (const [k, v] of await source.colors(lookPalettes(looks, pick.template, pick.shade))) colors.set(k, v)
  return {
    kind: 'look',
    look: {
      template: pick.template,
      shade: pick.shade,
      paint: exactPaint(view, req, slots, looks, pick.template, pick.shade, colors),
      exact: true,
      label: rollLabel(view, pick.template, pick.shade),
    },
  }
}

/** The message when no template and shade of the piece passes the rule. */
export function neverRollsMessage(view: ArmorView): string {
  return `This armor never rolls this colour in ${view.region}.`
}
