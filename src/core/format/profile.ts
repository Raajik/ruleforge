/**
 * Reads and writes the rule section of a .utl profile, as cLootRules,
 * cLootItemRule and cUnsupportedRequirement do in ref/shared/LootRules.cs.
 *
 * Every requirement type stays raw text until T07-T13 add its reader, so a
 * requirement keeps its own type number and its serialized body.
 */

import { eLootAction } from './enums'
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

/**
 * One reader per type number, keyed like eLootRuleType. A reader reads only
 * the body of the requirement, after the length prefix of a version 1 file.
 * Empty until T07-T13.
 */
export type Requirement = UnsupportedRequirement
export const requirementReaders: Record<number, (reader: LineReader, version: number) => Requirement> = {}

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

function writeRequirement(writer: CountedWriter, requirement: Requirement): void {
  // Build the body in a temp writer so the length prefix matches its size.
  const body = new CountedWriter()
  body.write(requirement.data)
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
