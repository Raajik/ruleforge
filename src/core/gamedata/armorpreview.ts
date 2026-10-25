// The armor preview of a colour requirement (specs/armor-preview.md): which
// stand-in piece to show, which of its parts get the rule's colour, and the
// text alternative. Pure data; the three.js scene lives in src/ui/.

import type { Requirement } from '../format/profile'

export type ArmorPiece =
  | 'coat'
  | 'breastplate'
  | 'legs'
  | 'girth'
  | 'helm'
  | 'pauldrons'
  | 'sleeves'
  | 'greaves'
  | 'suit'

/** The parts (separate meshes) of each stand-in piece. */
export const PIECE_PARTS: Record<ArmorPiece, readonly string[]> = {
  coat: ['chest', 'collar', 'shoulders', 'arms', 'trim'],
  breastplate: ['chest', 'shoulders', 'neck', 'trim', 'belt'],
  legs: ['belt', 'girth', 'crotch', 'legs', 'knees', 'shins', 'sides', 'trim'],
  girth: ['base', 'belt'],
  helm: ['base', 'mask', 'horns'],
  pauldrons: ['base'],
  sleeves: ['shoulders', 'upper', 'lower'],
  greaves: ['base'],
  suit: ['chest', 'arms', 'legs', 'helm'],
}

export type PatternKind = 'stripes' | 'studs'

export interface ArmorGroupView {
  piece: ArmorPiece
  /** The piece as the group names it, for example "Amuli Coat". */
  name: string
  /** The region as the group names it, for example "Chest". */
  region: string
  /** The parts in the rule's colour. The other parts are neutral grey. */
  colored: readonly string[]
  /** A pattern region shows as stripes or studs in the colour on one part. */
  pattern: { kind: PatternKind; on: string } | null
}

export interface ArmorView extends ArmorGroupView {
  /** The rule's R, G, B as #RRGGBB. */
  color: string
  /** The text alternative, for example "Amuli Coat, Chest in #3060C0". */
  label: string
  /** Type 16 only: the slot region depends on the armor. */
  note: string | null
}

type Entry = [ArmorPiece, readonly string[], (readonly [PatternKind, string])?]

// One entry per slot definition of fixtures/ColorSlots.Default.xml. "Base"
// covers every part that the piece's other slots do not name.
const GROUPS: Record<string, Entry> = {
  'Amuli Coat (Chest)': ['coat', ['chest']],
  'Amuli Coat (Collar/Shoulder)': ['coat', ['collar', 'shoulders']],
  'Amuli Coat (Arms/Trim)': ['coat', ['arms', 'trim']],
  'Amuli Legs (Base)': ['legs', ['belt', 'girth', 'crotch', 'legs', 'knees', 'shins', 'sides']],
  'Amuli Legs (Trim)': ['legs', ['trim']],
  // The group names no piece; Celdon is a breastplate, girth, leggings and sleeves set.
  'Celdon (Base)': ['breastplate', ['chest', 'shoulders', 'neck', 'trim', 'belt']],
  'Celdon (Veins)': ['breastplate', [], ['stripes', 'chest']],
  'Chiran Coat (Base/Arms)': ['coat', ['chest', 'collar', 'shoulders', 'arms', 'trim']],
  'Chiran Coat (Stripes)': ['coat', [], ['stripes', 'chest']],
  'Chiran Legs (Girth)': ['legs', ['belt', 'girth', 'crotch']],
  'Chiran Legs (Legs)': ['legs', ['legs', 'knees', 'shins', 'sides']],
  'Chiran Legs (Trim)': ['legs', ['trim']],
  'Chiran Helm (Horns)': ['helm', ['horns']],
  'Chiran Helm (Base)': ['helm', ['base', 'mask']],
  'Haebrean BP (Chest) *': ['breastplate', ['chest', 'shoulders', 'neck', 'belt']],
  'Haebrean BP (Ornaments)': ['breastplate', [], ['studs', 'chest']],
  'Haebrean BP (Trim)': ['breastplate', ['trim']],
  'Haebrean Girth (Base) *': ['girth', ['base']],
  'Haebrean Girth (Belt/Scales)': ['girth', ['belt']],
  'Haebrean Helm (Base)': ['helm', ['base', 'horns']],
  'Haebrean Helm (Mask)': ['helm', ['mask']],
  'Haebrean Pauldrons (Base) *': ['pauldrons', ['base']],
  'Haebrean Pauldrons (Ornaments)': ['pauldrons', [], ['studs', 'base']],
  'Lorica BP (Veins)': ['breastplate', [], ['stripes', 'chest']],
  'Lorica BP (Base)': ['breastplate', ['chest', 'shoulders', 'belt']],
  'Lorica BP (Neck/Trim) *': ['breastplate', ['neck', 'trim']],
  'Lorica Legs (Base)': ['legs', ['girth', 'sides', 'trim']],
  'Lorica Legs (Knees/Belt/Crotch) *': ['legs', ['knees', 'belt', 'crotch']],
  'Lorica Legs (Legs) *': ['legs', ['legs', 'shins']],
  'Nariyid BP (Circle/Lines)': ['breastplate', [], ['stripes', 'chest']],
  'Nariyid BP (Base)': ['breastplate', ['chest', 'neck', 'trim', 'belt']],
  'Nariyid BP (Shoulders)': ['breastplate', ['shoulders']],
  'Nariyid Girth (Base) *': ['girth', ['base']],
  'Nariyid Girth (Belt/Lines)': ['girth', ['belt'], ['stripes', 'base']],
  'Nariyid Girth (Ornaments)': ['girth', [], ['studs', 'base']],
  'Nariyid Sleeves (Shoulders)': ['sleeves', ['shoulders']],
  'Nariyid Sleeves (Upper Arm)': ['sleeves', ['upper']],
  'Nariyid Sleeves (Lower Arm)': ['sleeves', ['lower']],
  'Olthoi BP (Base)': ['breastplate', ['chest', 'shoulders', 'neck', 'trim', 'belt']],
  'Olthoi BP (Veins)': ['breastplate', [], ['stripes', 'chest']],
  'Olthoi Alduressa Legs (Girth: Base)': ['legs', ['belt', 'girth', 'crotch']],
  'Olthoi Alduressa Legs (Girth: Lines)': ['legs', [], ['stripes', 'girth']],
  'Olthoi Alduressa Legs (Legs: Lines)': ['legs', [], ['stripes', 'legs']],
  'Olthoi Amuli Coat (Base) *': ['coat', ['chest', 'arms']],
  'Olthoi Amuli Coat (Trim)': ['coat', ['collar', 'trim']],
  'Olthoi Amuli Coat (Shoulders)': ['coat', ['shoulders']],
  'Olthoi Amuli Legs (Trim)': ['legs', ['trim']],
  'Olthoi Koujia Kabuton (Base)': ['helm', ['base', 'mask']],
  'Olthoi Koujia Kabuton (Horns)': ['helm', ['horns']],
  'Olthoi Koujia Legs (Base)': ['legs', ['belt', 'girth', 'crotch', 'legs', 'knees', 'trim']],
  'Olthoi Koujia Legs (Sides/Shins)': ['legs', ['sides', 'shins']],
  'Scalemail Cuirass (Base)': ['breastplate', ['chest', 'shoulders', 'neck', 'trim']],
  'Scalemail Cuirass (Bumps)': ['breastplate', [], ['studs', 'chest']],
  'Scalemail Cuirass (Belt)': ['breastplate', ['belt']],
  'Tenassa Legs (Line at Side)': ['legs', ['sides']],
  'Tenassa Legs (Base)': ['legs', ['belt', 'girth', 'crotch', 'legs', 'knees', 'shins', 'trim']],
  'Tenassa Legs (Hilight)': ['legs', [], ['stripes', 'legs']],
  'Tenassa BP (Shoulders)': ['breastplate', ['shoulders']],
  'Tenassa BP (Base)': ['breastplate', ['chest', 'neck', 'trim', 'belt']],
  'Yoroi Cuirass (Base)': ['breastplate', ['chest', 'shoulders', 'neck', 'trim']],
  'Yoroi Cuirass (Belt)': ['breastplate', ['belt']],
  'Yoroi Girth (Base)': ['girth', ['base']],
  'Yoroi Girth (Belt)': ['girth', ['belt']],
}

// Name words for a group that is not in the map, such as one from a user's own
// slot file. Checked in order, so "Coat" wins over "Sleeves" in a coat name.
const PIECE_WORDS: readonly [RegExp, ArmorPiece][] = [
  [/\bcoat\b/i, 'coat'],
  [/\b(bp|breastplate|cuirass|hauberk|shirt)\b/i, 'breastplate'],
  [/\bgirth\b/i, 'girth'],
  [/\b(legs|leggings|tassets|pants)\b/i, 'legs'],
  [/\b(helm|helmet|kabuton|hat|cap|coif|basinet)\b/i, 'helm'],
  [/\bpauldrons?\b/i, 'pauldrons'],
  [/\b(sleeves|vambraces|bracers)\b/i, 'sleeves'],
  [/\bgreaves\b/i, 'greaves'],
]

const SUIT_NAME = 'Armor suit'
const WHOLE = 'every region'

/** Splits "Lorica Legs (Knees/Belt/Crotch) *" into the piece name and the region. */
function splitGroup(group: string): { name: string; region: string | null } {
  const match = /^(.*?)\s*\(([^)]*)\)\s*\*?\s*$/.exec(group)
  if (!match) return { name: group.trim(), region: null }
  return { name: match[1]!, region: match[2]! }
}

/** The piece and coloured parts of a type 15 armor group. */
export function armorGroupView(group: string): ArmorGroupView {
  const { name, region } = splitGroup(group)
  const entry = GROUPS[group]
  if (entry) {
    const [piece, colored, pattern] = entry
    return { piece, name, region: region ?? WHOLE, colored, pattern: pattern ? { kind: pattern[0], on: pattern[1] } : null }
  }
  const piece = PIECE_WORDS.find(([words]) => words.test(name))?.[1] ?? 'suit'
  return {
    piece,
    name: piece === 'suit' && name === '' ? SUIT_NAME : name,
    region: WHOLE,
    colored: PIECE_PARTS[piece],
    pattern: null,
  }
}

/** #RRGGBB of the rule's R, G and B, each kept in 0-255. */
export function colorHex(r: number, g: number, b: number): string {
  const byte = (v: number) => Math.min(255, Math.max(0, Math.trunc(v) || 0))
  return `#${[r, g, b].map((v) => byte(v).toString(16).toUpperCase().padStart(2, '0')).join('')}`
}

/** The preview of a requirement, or null for a type that gets no preview. */
export function armorView(req: Requirement): ArmorView | null {
  // A raw requirement (UnsupportedRequirement) can carry any type number.
  if ('data' in req || (req.type !== 14 && req.type !== 15 && req.type !== 16)) return null
  const color = colorHex(req.r, req.g, req.b)
  const group: ArmorGroupView =
    req.type === 15
      ? armorGroupView(req.armorGroup)
      : { piece: 'suit', name: SUIT_NAME, region: WHOLE, colored: PIECE_PARTS.suit, pattern: null }
  return {
    ...group,
    color,
    label: `${group.name}, ${group.region} in ${color}`,
    note: req.type === 16 ? `Slot ${req.slot}: the region depends on the armor.` : null,
  }
}
