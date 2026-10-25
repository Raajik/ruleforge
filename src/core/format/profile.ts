/**
 * Reads and writes the rule section of a .utl profile, as cLootRules,
 * cLootItemRule and cUnsupportedRequirement do in ref/shared/LootRules.cs.
 *
 * Requirement types 0 to 13, 1000 to 1004, 14 to 17, 9999 and 2000 to 2008
 * have their own reader and writer (T07-T13). Every other type stays raw text.
 * Each requirement keeps its own type number and its serialized body.
 * The extra blocks after the rules parse SalvageCombine and keep every other
 * block as raw text (T14).
 */

import { eLootAction, eLootRuleType } from './enums'
import { formatDouble, haxConvertDouble } from './doubles'
import { LineReader, parseInt32 } from './reader'
import { CountedWriter } from './writer'

// ref/shared/FileVersioning.cs line 49.
const MAX_PROFILE_VERSION = 1

// ref/shared/FileVersioning.cs line 41: the feature bits of eUTLFileFeature.
const RULE_EXPRESSION = 1
const REQUIREMENT_LENGTH_CODE = 2

function versionHasFeature(feature: number, version: number): boolean {
  if (version === 1) return feature === RULE_EXPRESSION || feature === REQUIREMENT_LENGTH_CODE
  return false
}

/** A requirement whose type has no reader yet. `data` is its serialized body. */
export interface UnsupportedRequirement {
  type: number
  data: string
}

/** Type 0, SpellNameMatch. The body is one line (LootRules.cs 311-315). */
export interface SpellNameMatchRequirement {
  type: 0
  /** The regex pattern as text. It is never compiled here (see PLAN.md Traps). */
  pattern: string
}

/** Type 1, StringValueMatch. The body is two lines (LootRules.cs 377-387). */
export interface StringValueMatchRequirement {
  type: 1
  /** The regex pattern as text. */
  pattern: string
  /** StringValueKey, written base 10 as Convert.ToString does. */
  key: number
}

/** Type 2, LongValKeyLE. The body is two lines (LootRules.cs 452-462). */
export interface LongValKeyLERequirement {
  type: 2
  keyval: number
  /** IntValueKey, written base 10 as Convert.ToString((int)vk) does. */
  vk: number
}

/** Type 3, LongValKeyGE. The body is two lines (LootRules.cs 569-579). */
export interface LongValKeyGERequirement {
  type: 3
  keyval: number
  /** IntValueKey, written base 10 as Convert.ToString((int)vk) does. */
  vk: number
}

/** Type 11, LongValKeyFlagExists. The body is two lines (LootRules.cs 1185-1195). */
export interface LongValKeyFlagExistsRequirement {
  type: 11
  keyval: number
  /** IntValueKey, written base 10 as Convert.ToString((int)vk) does. */
  vk: number
}

/** Type 12, LongValKeyE. The body is two lines (LootRules.cs 1410-1420). */
export interface LongValKeyERequirement {
  type: 12
  keyval: number
  /** IntValueKey, written base 10 as Convert.ToString((int)vk) does. */
  vk: number
}

/** Type 13, LongValKeyNE. The body is two lines (LootRules.cs 1527-1537). */
export interface LongValKeyNERequirement {
  type: 13
  keyval: number
  /** IntValueKey, written base 10 as Convert.ToString((int)vk) does. */
  vk: number
}

/** Type 4, DoubleValKeyLE. The body is two lines (LootRules.cs 686-696). */
export interface DoubleValKeyLERequirement {
  type: 4
  keyval: number
  /** DoubleValueKey, written base 10 as Convert.ToString((int)vk) does. */
  vk: number
}

/** Type 5, DoubleValKeyGE. The body is two lines (LootRules.cs 761-798). */
export interface DoubleValKeyGERequirement {
  type: 5
  keyval: number
  /** DoubleValueKey, written base 10 as Convert.ToString((int)vk) does. */
  vk: number
}

/** Type 6, DamagePercentGE. The body is one line (LootRules.cs 827-835). */
export interface DamagePercentGERequirement {
  type: 6
  keyval: number
}

/** Type 10, MinDamageGE. The body is one line (LootRules.cs 1119-1127). */
export interface MinDamageGERequirement {
  type: 10
  keyval: number
}

/** Type 7, ObjectClassE. The body is one line (LootRules.cs 891-893). */
export interface ObjectClassERequirement {
  type: 7
  /** ObjectClass, written base 10 as Convert.ToString((int)vk) does. */
  vk: number
}

/** Type 8, SpellCountGE. The body is one line (LootRules.cs 957-959). */
export interface SpellCountGERequirement {
  type: 8
  keyval: number
}

/** Type 9, SpellMatch. The body is three lines (LootRules.cs 1043-1046). */
export interface SpellMatchRequirement {
  type: 9
  /** The "does match" regex pattern as text. It is never compiled here (see PLAN.md Traps). */
  rxDoesMatch: string
  /** The "does not match" regex pattern as text. */
  rxDoesNotMatch: string
  count: number
}

/** Type 1000, CharacterSkillGE. The body is two lines (LootRules.cs 1264-1273). */
export interface CharacterSkillGERequirement {
  type: 1000
  keyval: number
  /** VTCSkillID, written base 10 as Convert.ToString((int)vk) does. */
  vk: number
}

/** Type 1001, CharacterMainPackEmptySlotsGE. The body is one line (LootRules.cs 1344-1351). */
export interface CharacterMainPackEmptySlotsGERequirement {
  type: 1001
  keyval: number
}

/** Type 1002, CharacterLevelGE. The body is one line (LootRules.cs 1635-1642). */
export interface CharacterLevelGERequirement {
  type: 1002
  keyval: number
}

/** Type 1003, CharacterLevelLE. The body is one line (LootRules.cs 1692-1699). */
export interface CharacterLevelLERequirement {
  type: 1003
  keyval: number
}

/** Type 1004, CharacterBaseSkill. The body is three lines (LootRules.cs 1763-1774). */
export interface CharacterBaseSkillRequirement {
  type: 1004
  /** VTCSkillID, written base 10 as Convert.ToString((int)vk) does. */
  vk: number
  minskill: number
  maxskill: number
}

/** Type 9999, DisabledRule. The body is one line (LootRules.cs 1839-1844). */
export interface DisabledRuleRequirement {
  type: 9999
  /** True when the rule is disabled. Only the exact text "true" reads as true. */
  b: boolean
}

/** Type 14, AnySimilarColor. The body is five lines (LootRules.cs 1934-1940). */
export interface AnySimilarColorRequirement {
  type: 14
  r: number
  g: number
  b: number
  maxDifferenceH: number
  maxDifferenceSV: number
}

/** Type 15, SimilarColorArmorType. The body is six lines (LootRules.cs 2083-2090). */
export interface SimilarColorArmorTypeRequirement {
  type: 15
  r: number
  g: number
  b: number
  maxDifferenceH: number
  maxDifferenceSV: number
  armorGroup: string
}

/** Type 16, SlotSimilarColor. The body is six lines (LootRules.cs 2239-2245). */
export interface SlotSimilarColorRequirement {
  type: 16
  r: number
  g: number
  b: number
  maxDifferenceH: number
  maxDifferenceSV: number
  slot: number
}

/** Type 17, SlotExactPalette. The body is two lines (LootRules.cs 2326-2329). */
export interface SlotExactPaletteRequirement {
  type: 17
  slot: number
  palette: number
}

/** Type 2000, BuffedMedianDamageGE. The body is one line (LootRules.cs 2404-2408). */
export interface BuffedMedianDamageGERequirement {
  type: 2000
  keyval: number
}

/** Type 2001, BuffedMissileDamageGE. The body is one line (LootRules.cs 2471-2475). */
export interface BuffedMissileDamageGERequirement {
  type: 2001
  keyval: number
}

/** Type 2003, BuffedLongValKeyGE. The body is two lines (LootRules.cs 2533-2538). */
export interface BuffedLongValKeyGERequirement {
  type: 2003
  keyval: number
  /** IntValueKey, written base 10 as Convert.ToString((int)vk) does. */
  vk: number
}

/** Type 2005, BuffedDoubleValKeyGE. The body is two lines (LootRules.cs 2607-2612). */
export interface BuffedDoubleValKeyGERequirement {
  type: 2005
  keyval: number
  /** DoubleValueKey, written base 10 as Convert.ToString((int)vk) does. */
  vk: number
}

/** Type 2006, CalcdBuffedTinkedDamageGE. The body is one line (LootRules.cs 2686-2690). */
export interface CalcdBuffedTinkedDamageGERequirement {
  type: 2006
  keyval: number
}

/** Type 2007, TotalRatingsGE. The body is one line (LootRules.cs 2753-2757). */
export interface TotalRatingsGERequirement {
  type: 2007
  keyval: number
}

/** Type 2008, CalcedBuffedTinkedTargetMeleeGE. The body is three lines (LootRules.cs 2819-2827). */
export interface CalcedBuffedTinkedTargetMeleeGERequirement {
  type: 2008
  /** TargetCalcedBuffedTinkedDoT. */
  dot: number
  /** TargetBuffedMeleeDefenseBonus. */
  meleeDefenseBonus: number
  /** TargetBuffedAttackBonus. */
  attackBonus: number
}

/**
 * One reader per type number, keyed like eLootRuleType. A reader reads only
 * the body of the requirement, after the length prefix of a version 1 file.
 * Types 0 to 13 come from T07-T10. Types 1000 to 1004 come from T11.
 * Types 14 to 17 and 9999 come from T12. Types 2000 to 2008 come from T13.
 */
export type Requirement =
  | UnsupportedRequirement
  | SpellNameMatchRequirement
  | StringValueMatchRequirement
  | LongValKeyLERequirement
  | LongValKeyGERequirement
  | LongValKeyFlagExistsRequirement
  | LongValKeyERequirement
  | LongValKeyNERequirement
  | DoubleValKeyLERequirement
  | DoubleValKeyGERequirement
  | DamagePercentGERequirement
  | MinDamageGERequirement
  | ObjectClassERequirement
  | SpellCountGERequirement
  | SpellMatchRequirement
  | CharacterSkillGERequirement
  | CharacterMainPackEmptySlotsGERequirement
  | CharacterLevelGERequirement
  | CharacterLevelLERequirement
  | CharacterBaseSkillRequirement
  | DisabledRuleRequirement
  | AnySimilarColorRequirement
  | SimilarColorArmorTypeRequirement
  | SlotSimilarColorRequirement
  | SlotExactPaletteRequirement
  | BuffedMedianDamageGERequirement
  | BuffedMissileDamageGERequirement
  | BuffedLongValKeyGERequirement
  | BuffedDoubleValKeyGERequirement
  | CalcdBuffedTinkedDamageGERequirement
  | TotalRatingsGERequirement
  | CalcedBuffedTinkedTargetMeleeGERequirement
export const requirementReaders: Record<number, (reader: LineReader, version: number) => Requirement> = {
  // LootRules.cs 312: rx = new Regex(inf.ReadLine()).
  0: (reader) => ({ type: 0, pattern: reader.readLine() ?? '' }),
  // LootRules.cs 378-380: pattern line, then the StringValueKey number.
  1: (reader) => ({ type: 1, pattern: reader.readLine() ?? '', key: toInt(reader.readLine()) }),
  // LootRules.cs 454-455: keyval line, then the IntValueKey number.
  2: (reader) => ({ type: 2, keyval: toInt(reader.readLine()), vk: toInt(reader.readLine()) }),
  // LootRules.cs 571-572: keyval line, then the IntValueKey number.
  3: (reader) => ({ type: 3, keyval: toInt(reader.readLine()), vk: toInt(reader.readLine()) }),
  // LootRules.cs 1187-1188: keyval line, then the IntValueKey number.
  11: (reader) => ({ type: 11, keyval: toInt(reader.readLine()), vk: toInt(reader.readLine()) }),
  // LootRules.cs 1412-1413: keyval line, then the IntValueKey number.
  12: (reader) => ({ type: 12, keyval: toInt(reader.readLine()), vk: toInt(reader.readLine()) }),
  // LootRules.cs 1529-1530: keyval line, then the IntValueKey number.
  13: (reader) => ({ type: 13, keyval: toInt(reader.readLine()), vk: toInt(reader.readLine()) }),
  // LootRules.cs 686-688: keyval line, then the DoubleValueKey number.
  4: (reader) => ({ type: 4, keyval: haxConvertDouble(reader.readLine()), vk: toInt(reader.readLine()) }),
  // LootRules.cs 761-763: keyval line, then the DoubleValueKey number.
  5: (reader) => ({ type: 5, keyval: haxConvertDouble(reader.readLine()), vk: toInt(reader.readLine()) }),
  // LootRules.cs 827-829: keyval line.
  6: (reader) => ({ type: 6, keyval: haxConvertDouble(reader.readLine()) }),
  // LootRules.cs 1119-1121: keyval line.
  10: (reader) => ({ type: 10, keyval: haxConvertDouble(reader.readLine()) }),
  // LootRules.cs 891: one ObjectClass line.
  7: (reader) => ({ type: 7, vk: toInt(reader.readLine()) }),
  // LootRules.cs 957: one keyval line.
  8: (reader) => ({ type: 8, keyval: toInt(reader.readLine()) }),
  // LootRules.cs 1043-1045: two regex lines, then the Count line.
  9: (reader) => ({
    type: 9,
    rxDoesMatch: reader.readLine() ?? '',
    rxDoesNotMatch: reader.readLine() ?? '',
    count: toInt(reader.readLine()),
  }),
  // LootRules.cs 1264-1267: keyval line, then the VTCSkillID number.
  1000: (reader) => ({ type: 1000, keyval: toInt(reader.readLine()), vk: toInt(reader.readLine()) }),
  // LootRules.cs 1344-1346: one keyval line.
  1001: (reader) => ({ type: 1001, keyval: toInt(reader.readLine()) }),
  // LootRules.cs 1635-1637: one keyval line.
  1002: (reader) => ({ type: 1002, keyval: toInt(reader.readLine()) }),
  // LootRules.cs 1692-1694: one keyval line.
  1003: (reader) => ({ type: 1003, keyval: toInt(reader.readLine()) }),
  // LootRules.cs 1763-1766: VTCSkillID line, minskill line, maxskill line.
  1004: (reader) => ({
    type: 1004,
    vk: toInt(reader.readLine()),
    minskill: toInt(reader.readLine()),
    maxskill: toInt(reader.readLine()),
  }),
  // LootRules.cs 1839: one line, "true" (case-sensitive) or anything else.
  9999: (reader) => ({ type: 9999, b: reader.readLine() === 'true' }),
  // LootRules.cs 1934-1939: R, G, B lines, then the two differences.
  14: (reader) => ({
    type: 14,
    r: toInt(reader.readLine()),
    g: toInt(reader.readLine()),
    b: toInt(reader.readLine()),
    maxDifferenceH: haxConvertDouble(reader.readLine()),
    maxDifferenceSV: haxConvertDouble(reader.readLine()),
  }),
  // LootRules.cs 2083-2089: the color lines, then the ArmorGroup line.
  15: (reader) => ({
    type: 15,
    r: toInt(reader.readLine()),
    g: toInt(reader.readLine()),
    b: toInt(reader.readLine()),
    maxDifferenceH: haxConvertDouble(reader.readLine()),
    maxDifferenceSV: haxConvertDouble(reader.readLine()),
    armorGroup: reader.readLine() ?? '',
  }),
  // LootRules.cs 2239-2244: the color lines, then the Slot line.
  16: (reader) => ({
    type: 16,
    r: toInt(reader.readLine()),
    g: toInt(reader.readLine()),
    b: toInt(reader.readLine()),
    maxDifferenceH: haxConvertDouble(reader.readLine()),
    maxDifferenceSV: haxConvertDouble(reader.readLine()),
    slot: toInt(reader.readLine()),
  }),
  // LootRules.cs 2326-2328: Slot line, then Palette line.
  17: (reader) => ({ type: 17, slot: toInt(reader.readLine()), palette: toInt(reader.readLine()) }),
  // LootRules.cs 2406: one keyval line.
  2000: (reader) => ({ type: 2000, keyval: haxConvertDouble(reader.readLine()) }),
  // LootRules.cs 2473: one keyval line.
  2001: (reader) => ({ type: 2001, keyval: haxConvertDouble(reader.readLine()) }),
  // LootRules.cs 2535-2536: keyval line, then the IntValueKey number.
  2003: (reader) => ({ type: 2003, keyval: haxConvertDouble(reader.readLine()), vk: toInt(reader.readLine()) }),
  // LootRules.cs 2609-2610: keyval line, then the DoubleValueKey number.
  2005: (reader) => ({ type: 2005, keyval: haxConvertDouble(reader.readLine()), vk: toInt(reader.readLine()) }),
  // LootRules.cs 2688: one keyval line.
  2006: (reader) => ({ type: 2006, keyval: haxConvertDouble(reader.readLine()) }),
  // LootRules.cs 2755: one keyval line.
  2007: (reader) => ({ type: 2007, keyval: haxConvertDouble(reader.readLine()) }),
  // LootRules.cs 2821-2823: DoT, melee defense bonus and attack bonus lines.
  2008: (reader) => ({
    type: 2008,
    dot: haxConvertDouble(reader.readLine()),
    meleeDefenseBonus: haxConvertDouble(reader.readLine()),
    attackBonus: haxConvertDouble(reader.readLine()),
  }),
}

export interface LootRule {
  name: string
  customExpression: string
  priority: number
  action: number
  lootActionData: number
  requirements: Requirement[]
}

/** A block after the rules with no handler: its body stays raw text. */
export interface RawExtraBlock {
  kind: 'raw'
  typeId: string
  data: string
}

/**
 * The parsed SalvageCombine block, as UTLBlock_SalvageCombine.cs does it
 * (Read at 272-299, Write at 302-321).
 */
export interface SalvageCombineBlock {
  kind: 'salvageCombine'
  /** The combine ranges of materials without their own line. */
  defaultCombineString: string
  /**
   * One combine string per material id, in file order. A Map keeps that
   * order: the real blocks are not sorted by material id.
   */
  materialCombineStrings: Map<number, string>
  /**
   * One "salvage for money" target value per material id. Empty when the
   * block ends before this section (UTLBlock_SalvageCombine.cs 289-290).
   */
  materialValueModeValues: Map<number, number>
}

export type ExtraBlock = SalvageCombineBlock | RawExtraBlock

export interface LootProfile {
  version: number
  rules: LootRule[]
  extraBlocks: ExtraBlock[]
}

// Convert.ToInt32 and int.Parse throw on a bad or missing line, so a damaged file fails to load.
function toInt(line: string | null | undefined): number {
  const n = parseInt32(line ?? '')
  if (n === undefined) throw new Error(`Bad number in the profile: ${JSON.stringify(line)}`)
  return n
}

function readRule(reader: LineReader, version: number): LootRule {
  // LootRules.cs 2944: name, then the custom expression of a version 1 file.
  const name = reader.readLine() ?? ''
  const customExpression = versionHasFeature(RULE_EXPRESSION, version) ? (reader.readLine() ?? '') : ''

  // The 'big line': priority, action, then one type number per requirement.
  const bigLine = reader.readLine()
  if (bigLine === null) throw new Error('The profile ends before its last rule.')
  const parts = bigLine.split(';')
  const priority = toInt(parts[0])
  const action = toInt(parts[1])
  const lootActionData = action === eLootAction.KeepUpTo ? toInt(reader.readLine()) : 0

  const requirements: Requirement[] = []
  for (let i = 2; i < parts.length; ++i) {
    const type = toInt(parts[i])
    const read = requirementReaders[type]
    if (versionHasFeature(REQUIREMENT_LENGTH_CODE, version)) {
      const lengthcode = toInt(reader.readLine())
      requirements.push(read ? read(reader, version) : { type, data: reader.readChars(lengthcode) })
    } else {
      // Version 0 has no length prefix, so an unknown type cannot be skipped.
      if (!read) throw new Error(`Cannot read requirement type ${type} in a version 0 file`)
      requirements.push(read(reader, version))
    }
  }

  return { name, customExpression, priority, action, lootActionData, requirements }
}

function readExtraBlocks(reader: LineReader): ExtraBlock[] {
  const blocks: ExtraBlock[] = []
  // The C# reads blocks to the end of the file. Only trailing blank lines are let through.
  while (!reader.restIsBlank) {
    const typeId = reader.readLine() ?? ''
    const data = reader.readChars(toInt(reader.readLine()))
    blocks.push(
      typeId === SALVAGE_COMBINE
        ? readSalvageCombine(data)
        : // Unknown blocktype, skip ahead (UTLFileExtraBlockManager.cs 111-116).
          { kind: 'raw', typeId, data },
    )
  }
  return blocks
}

export function readProfile(text: string): LootProfile {
  const reader = new LineReader(text)

  // LootRules.cs 3140: a version 0 file starts with the rule count, later
  // versions start with UTL, the file version and then the rule count.
  const firstLine = reader.readLine()
  const isV1 = firstLine === 'UTL'
  const version = isV1 ? parseInt32(reader.readLine() ?? '') : 0
  const count = parseInt32((isV1 ? reader.readLine() : firstLine) ?? '')
  // The C# shows an empty profile for a file that is not a profile. Throw instead, so that a save cannot
  // write an empty profile over the wrong file.
  if (version === undefined || count === undefined || count < 0) throw new Error('This file is not a loot profile.')
  if (version > MAX_PROFILE_VERSION) {
    throw new Error(
      `Profile file is version ${version}, only version ${MAX_PROFILE_VERSION} is supported by this version of VTClassic.`,
    )
  }

  const rules: LootRule[] = []
  for (let i = 0; i < count; ++i) {
    rules.push(readRule(reader, version))
  }

  return { version, rules, extraBlocks: readExtraBlocks(reader) }
}

// UTLBlock_SalvageCombine.cs line 269: BlockTypeID.
const SALVAGE_COMBINE = 'SalvageCombine'

// UTLBlock_SalvageCombine.cs line 42: the writer saves this version.
const SALVAGE_BLOCK_FORMAT_VERSION = 1

/**
 * Reads a SalvageCombine body, as UTLBlock_SalvageCombine.Read does
 * (272-299). The .ucr "Export Ranges" file is this body alone
 * (Form_SalvageTab.cs 268-271), so the import reads it with the same
 * function. It throws on a missing or non-numeric integer line, as the C#
 * int.Parse does (lines 281-297).
 */
export function readSalvageCombine(data: string): SalvageCombineBlock {
  const body = new LineReader(data)
  body.readLine() // The format version line is read, then ignored (line 276).
  const defaultCombineString = body.readLine() ?? ''

  const materialCombineStrings = new Map<number, string>()
  const materialCount = readBlockInt(body, 'material count')
  for (let i = 0; i < materialCount; ++i) {
    materialCombineStrings.set(readBlockInt(body, 'material id'), body.readLine() ?? '')
  }

  const materialValueModeValues = new Map<number, number>()
  // This is all there is for older blocks (lines 289-290).
  if (body.posRemaining > 0) {
    const valueModeCount = readBlockInt(body, 'value mode count')
    for (let i = 0; i < valueModeCount; ++i) {
      const material = readBlockInt(body, 'value mode material id')
      materialValueModeValues.set(material, readBlockInt(body, 'value mode value'))
    }
  }

  return { kind: 'salvageCombine', defaultCombineString, materialCombineStrings, materialValueModeValues }
}

// C# int.Parse(ReadLine()) throws on a missing or a non-numeric line
// (UTLBlock_SalvageCombine.cs 281-297), so a bad block fails instead of
// reading a wrong one.
function readBlockInt(reader: LineReader, what: string): number {
  const value = parseInt32(reader.readLine() ?? '')
  if (value === undefined) throw new Error(`SalvageCombine block: ${what} is not an integer`)
  return value
}

/** Writes the body of a requirement, as its Write method does in LootRules.cs. */
function writeRequirementBody(body: CountedWriter, requirement: Requirement): void {
  if ('data' in requirement) {
    // Unsupported type: copy the raw body (LootRules.cs 250).
    body.write(requirement.data)
    return
  }
  switch (requirement.type) {
    // SpellNameMatch (LootRules.cs 313): one line.
    case eLootRuleType.SpellNameMatch:
      body.writeLine(requirement.pattern)
      break
    // StringValueMatch (LootRules.cs 384-385): pattern line, then the key.
    case eLootRuleType.StringValueMatch:
      body.writeLine(requirement.pattern)
      body.writeLine(String(requirement.key))
      break
    // LootRules.cs 460-461: keyval line, then the IntValueKey number.
    case eLootRuleType.LongValKeyLE:
      body.writeLine(String(requirement.keyval))
      body.writeLine(String(requirement.vk))
      break
    // LootRules.cs 577-578: keyval line, then the IntValueKey number.
    case eLootRuleType.LongValKeyGE:
      body.writeLine(String(requirement.keyval))
      body.writeLine(String(requirement.vk))
      break
    // LootRules.cs 1193-1194: keyval line, then the IntValueKey number.
    case eLootRuleType.LongValKeyFlagExists:
      body.writeLine(String(requirement.keyval))
      body.writeLine(String(requirement.vk))
      break
    // LootRules.cs 1418-1419: keyval line, then the IntValueKey number.
    case eLootRuleType.LongValKeyE:
      body.writeLine(String(requirement.keyval))
      body.writeLine(String(requirement.vk))
      break
    // LootRules.cs 1535-1536: keyval line, then the IntValueKey number.
    case eLootRuleType.LongValKeyNE:
      body.writeLine(String(requirement.keyval))
      body.writeLine(String(requirement.vk))
      break
    // LootRules.cs 692-695: keyval line, then the DoubleValueKey number.
    case eLootRuleType.DoubleValKeyLE:
      body.writeLine(formatDouble(requirement.keyval))
      body.writeLine(String(requirement.vk))
      break
    // LootRules.cs 792-795: keyval line, then the DoubleValueKey number.
    case eLootRuleType.DoubleValKeyGE:
      body.writeLine(formatDouble(requirement.keyval))
      body.writeLine(String(requirement.vk))
      break
    // LootRules.cs 832-834: keyval line.
    case eLootRuleType.DamagePercentGE:
      body.writeLine(formatDouble(requirement.keyval))
      break
    // LootRules.cs 1124-1126: keyval line.
    case eLootRuleType.MinDamageGE:
      body.writeLine(formatDouble(requirement.keyval))
      break
    // LootRules.cs 893: one ObjectClass line.
    case eLootRuleType.ObjectClass:
      body.writeLine(String(requirement.vk))
      break
    // LootRules.cs 959: one keyval line.
    case eLootRuleType.SpellCountGE:
      body.writeLine(String(requirement.keyval))
      break
    // LootRules.cs 1044-1046: two regex lines, then the Count line.
    case eLootRuleType.SpellMatch:
      body.writeLine(requirement.rxDoesMatch)
      body.writeLine(requirement.rxDoesNotMatch)
      body.writeLine(String(requirement.count))
      break
    // LootRules.cs 1271-1272: keyval line, then the VTCSkillID number.
    case eLootRuleType.CharacterSkillGE:
      body.writeLine(String(requirement.keyval))
      body.writeLine(String(requirement.vk))
      break
    // LootRules.cs 1350: one keyval line.
    case eLootRuleType.CharacterMainPackEmptySlotsGE:
      body.writeLine(String(requirement.keyval))
      break
    // LootRules.cs 1641: one keyval line.
    case eLootRuleType.CharacterLevelGE:
      body.writeLine(String(requirement.keyval))
      break
    // LootRules.cs 1698: one keyval line.
    case eLootRuleType.CharacterLevelLE:
      body.writeLine(String(requirement.keyval))
      break
    // LootRules.cs 1771-1773: VTCSkillID line, minskill line, maxskill line.
    case eLootRuleType.CharacterBaseSkill:
      body.writeLine(String(requirement.vk))
      body.writeLine(String(requirement.minskill))
      body.writeLine(String(requirement.maxskill))
      break
    // LootRules.cs 1842-1843: one line, "true" or "false".
    case eLootRuleType.DisabledRule:
      body.writeLine(requirement.b ? 'true' : 'false')
      break
    // LootRules.cs 1935-1939: R, G, B lines, then the two differences.
    case eLootRuleType.AnySimilarColor:
      body.writeLine(String(requirement.r))
      body.writeLine(String(requirement.g))
      body.writeLine(String(requirement.b))
      body.writeLine(formatDouble(requirement.maxDifferenceH))
      body.writeLine(formatDouble(requirement.maxDifferenceSV))
      break
    // LootRules.cs 2084-2089: the color lines, then the ArmorGroup line.
    case eLootRuleType.SimilarColorArmorType:
      body.writeLine(String(requirement.r))
      body.writeLine(String(requirement.g))
      body.writeLine(String(requirement.b))
      body.writeLine(formatDouble(requirement.maxDifferenceH))
      body.writeLine(formatDouble(requirement.maxDifferenceSV))
      body.writeLine(requirement.armorGroup)
      break
    // LootRules.cs 2240-2244: the color lines, then the Slot line.
    case eLootRuleType.SlotSimilarColor:
      body.writeLine(String(requirement.r))
      body.writeLine(String(requirement.g))
      body.writeLine(String(requirement.b))
      body.writeLine(formatDouble(requirement.maxDifferenceH))
      body.writeLine(formatDouble(requirement.maxDifferenceSV))
      body.writeLine(String(requirement.slot))
      break
    // LootRules.cs 2327-2328: Slot line, then Palette line.
    case eLootRuleType.SlotExactPalette:
      body.writeLine(String(requirement.slot))
      body.writeLine(String(requirement.palette))
      break
    // LootRules.cs 2408: one keyval line.
    case eLootRuleType.BuffedMedianDamageGE:
      body.writeLine(formatDouble(requirement.keyval))
      break
    // LootRules.cs 2475: one keyval line.
    case eLootRuleType.BuffedMissileDamageGE:
      body.writeLine(formatDouble(requirement.keyval))
      break
    // LootRules.cs 2537-2538: keyval line, then the IntValueKey number.
    case eLootRuleType.BuffedLongValKeyGE:
      body.writeLine(formatDouble(requirement.keyval))
      body.writeLine(String(requirement.vk))
      break
    // LootRules.cs 2611-2612: keyval line, then the DoubleValueKey number.
    case eLootRuleType.BuffedDoubleValKeyGE:
      body.writeLine(formatDouble(requirement.keyval))
      body.writeLine(String(requirement.vk))
      break
    // LootRules.cs 2690: one keyval line.
    case eLootRuleType.CalcdBuffedTinkedDamageGE:
      body.writeLine(formatDouble(requirement.keyval))
      break
    // LootRules.cs 2757: one keyval line.
    case eLootRuleType.TotalRatingsGE:
      body.writeLine(formatDouble(requirement.keyval))
      break
    // LootRules.cs 2825-2827: DoT line, melee defense bonus line, attack bonus line.
    case eLootRuleType.CalcedBuffedTinkedTargetMeleeGE:
      body.writeLine(formatDouble(requirement.dot))
      body.writeLine(formatDouble(requirement.meleeDefenseBonus))
      body.writeLine(formatDouble(requirement.attackBonus))
      break
  }
}

function writeRequirement(writer: CountedWriter, requirement: Requirement): void {
  // Build the body in a temp writer so the length prefix matches its size.
  const body = new CountedWriter()
  writeRequirementBody(body, requirement)
  writer.writeLine(String(body.count))
  writer.write(body.toString())
}

function writeRule(writer: CountedWriter, rule: LootRule): void {
  writer.writeLine(rule.name)
  writer.writeLine(rule.customExpression)

  const parts = [String(rule.priority), String(rule.action)]
  for (const requirement of rule.requirements) {
    parts.push(String(requirement.type))
  }
  writer.writeLine(parts.join(';'))

  if (rule.action === eLootAction.KeepUpTo) {
    writer.writeLine(String(rule.lootActionData))
  }

  for (const requirement of rule.requirements) {
    writeRequirement(writer, requirement)
  }
}

/**
 * Writes a SalvageCombine body, as UTLBlock_SalvageCombine.Write does
 * (302-321). The .ucr "Export Ranges" file is this body alone
 * (Form_SalvageTab.cs 268-271).
 */
export function writeSalvageCombine(block: SalvageCombineBlock, body: CountedWriter): void {
  // The writer saves the current version, whatever the block had.
  body.writeLine(String(SALVAGE_BLOCK_FORMAT_VERSION))
  body.writeLine(block.defaultCombineString)

  body.writeLine(String(block.materialCombineStrings.size))
  for (const [material, combine] of block.materialCombineStrings) {
    body.writeLine(String(material))
    body.writeLine(combine)
  }

  body.writeLine(String(block.materialValueModeValues.size))
  for (const [material, value] of block.materialValueModeValues) {
    body.writeLine(String(material))
    body.writeLine(String(value))
  }
}

/**
 * Writes one rule as text, as `cLootItemRule.Write` does
 * (ref/shared/LootRules.cs 3003-3042). The copy command puts this text on the
 * clipboard (ref/editor/Form1.cs 1078-1098).
 */
export function writeRuleText(rule: LootRule): string {
  const writer = new CountedWriter()
  writeRule(writer, rule)
  return writer.toString()
}

/**
 * Reads one rule from text, as `cLootItemRule.Read` does
 * (ref/shared/LootRules.cs 2944-3001). `version` is the value the C# paste
 * passes, the version of the loaded file (`LootRules.UTLFileVersion`).
 * Throws when the rule header is missing or has no numbers. The C# read
 * throws there too, so the paste then does nothing (Form1.cs 1154).
 */
export function readRuleText(text: string, version: number): LootRule {
  const rule = readRule(new LineReader(text), version)
  if (!Number.isFinite(rule.priority) || !Number.isFinite(rule.action)) {
    throw new Error('Invalid rule text: the rule header is not "priority;action;..."')
  }
  return rule
}

export function writeProfile(profile: LootProfile): string {
  const writer = new CountedWriter()
  writer.writeLine('UTL')
  // The C# writer always saves the newest version, whatever the input had.
  writer.writeLine(String(MAX_PROFILE_VERSION))
  writer.writeLine(String(profile.rules.length))
  for (const rule of profile.rules) {
    writeRule(writer, rule)
  }

  for (const block of profile.extraBlocks) {
    // Each block is a type id line, a length line, then the raw body
    // (UTLFileExtraBlockManager.cs 122-137).
    const body = new CountedWriter()
    let typeId: string
    if (block.kind === 'salvageCombine') {
      typeId = SALVAGE_COMBINE
      writeSalvageCombine(block, body)
    } else {
      typeId = block.typeId
      body.write(block.data)
    }
    writer.writeLine(typeId)
    writer.writeLine(String(body.count))
    writer.write(body.toString())
  }

  return writer.toString()
}
