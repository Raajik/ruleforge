/**
 * Reads and writes the rule section of a .utl profile, as cLootRules,
 * cLootItemRule and cUnsupportedRequirement do in ref/shared/LootRules.cs.
 *
 * Requirement types 0, 1, 2, 3, 11, 12 and 13 have their own reader and
 * writer (T07, T08). Every other type stays raw text until T09-T13 add its
 * reader. Each requirement keeps its own type number and its serialized body.
 */

import { eLootAction, eLootRuleType } from './enums'
import { formatDouble } from './doubles'
import { LineReader } from './reader'
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

/**
 * One reader per type number, keyed like eLootRuleType. A reader reads only
 * the body of the requirement, after the length prefix of a version 1 file.
 * Types 0, 1, 2, 3, 11, 12 and 13 come from T07 and T08. T09-T13 add the rest.
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
  4: (reader) => ({ type: 4, keyval: parseFloat(reader.readLine() ?? ''), vk: toInt(reader.readLine()) }),
  // LootRules.cs 761-763: keyval line, then the DoubleValueKey number.
  5: (reader) => ({ type: 5, keyval: parseFloat(reader.readLine() ?? ''), vk: toInt(reader.readLine()) }),
  // LootRules.cs 827-829: keyval line.
  6: (reader) => ({ type: 6, keyval: parseFloat(reader.readLine() ?? '') }),
  // LootRules.cs 1119-1121: keyval line.
  10: (reader) => ({ type: 10, keyval: parseFloat(reader.readLine() ?? '') }),
}

export interface LootRule {
  name: string
  customExpression: string
  priority: number
  action: number
  lootActionData: number
  requirements: Requirement[]
}

/** An unread block after the rules, with its own type id and length. */
export interface ExtraBlock {
  typeId: string
  data: string
}

export interface LootProfile {
  version: number
  rules: LootRule[]
  extraBlocks: ExtraBlock[]
}

function toInt(line: string | null | undefined): number {
  return Number.parseInt(line ?? '', 10)
}

function readRule(reader: LineReader, version: number): LootRule {
  // LootRules.cs 2944: name, then the custom expression of a version 1 file.
  const name = reader.readLine() ?? ''
  const customExpression = versionHasFeature(RULE_EXPRESSION, version) ? (reader.readLine() ?? '') : ''

  // The 'big line': priority, action, then one type number per requirement.
  const parts = (reader.readLine() ?? '').split(';')
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
  while (reader.posRemaining > 0) {
    const typeId = reader.readLine()
    if (typeId === null || typeId === '') break
    blocks.push({ typeId, data: reader.readChars(toInt(reader.readLine())) })
  }
  return blocks
}

export function readProfile(text: string): LootProfile {
  const reader = new LineReader(text)

  // LootRules.cs 3140: a version 0 file starts with the rule count, later
  // versions start with UTL, the file version and then the rule count.
  const firstLine = reader.readLine()
  let version: number
  let count: number
  if (firstLine === 'UTL') {
    version = toInt(reader.readLine())
    if (version > MAX_PROFILE_VERSION) {
      throw new Error(
        `Profile file is version ${version}, only version ${MAX_PROFILE_VERSION} is supported by this version of VTClassic.`,
      )
    }
    count = toInt(reader.readLine())
  } else {
    version = 0
    count = toInt(firstLine)
  }

  const rules: LootRule[] = []
  for (let i = 0; i < count; ++i) {
    rules.push(readRule(reader, version))
  }

  return { version, rules, extraBlocks: readExtraBlocks(reader) }
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
    writer.writeLine(block.typeId)
    writer.writeLine(String(block.data.length))
    writer.write(block.data)
  }

  return writer.toString()
}
