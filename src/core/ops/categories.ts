/**
 * The Customize categories (PLAN.md H2, specs/ruleforge-ui.md).
 *
 * `categorizeRules` splits the rule list into the sections of the file
 * itself. A rule whose name, after a trim, starts and ends with two or more
 * `*` is a section marker. It is a sub-section when the untrimmed name starts
 * with a space, or when the trimmed name starts with exactly two `*`. Rules
 * before the first marker go in "Uncategorized". A marker stays in the rule
 * list. Its section holds the rules that follow it, up to the next marker.
 *
 * `setRuleEnabled` is the on/off box of the page. `ruleSummary` is the one
 * line per rule. Every function is pure.
 */

import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { ruleTypeName, eLootRuleType } from '../format/enums'
import { requirementFields, type ReqTextId } from './reqfields'

/** A section of the rule list. `index` is the marker rule, or -1 for the first section. */
export interface Category {
  name: string
  /** True for a sub-section. */
  sub: boolean
  /** The marker rule index, or -1 for "Uncategorized". */
  index: number
  /** The rule indexes of the section, in file order. The marker itself is not one. */
  rules: number[]
}

const UNCATEGORIZED = 'Uncategorized'

/** True for a section marker name: two or more `*`, text, two or more `*` after a trim. */
function isMarker(name: string): boolean {
  return /^\*{2,}.*\*{2,}$/.test(name.trim())
}

/** True for a sub-section: the untrimmed name starts with a space, or exactly two `*` at the start. */
function isSub(name: string): boolean {
  return /^ /.test(name) || /^\*{2}(?!\*)/.test(name.trim())
}

/** Splits the rules into the sections of the file (PLAN.md H2). */
export function categorizeRules(profile: LootProfile): Category[] {
  const cats: Category[] = []
  // The section that receives the next rule. It starts as "Uncategorized".
  let current: Category = { name: UNCATEGORIZED, sub: false, index: -1, rules: [] }
  cats.push(current)

  profile.rules.forEach((rule, i) => {
    if (isMarker(rule.name)) {
      current = { name: rule.name.trim(), sub: isSub(rule.name), index: i, rules: [] }
      cats.push(current)
    } else {
      current.rules.push(i)
    }
  })

  // Drop "Uncategorized" when the file starts with a marker, as LootSnobV4 does.
  return cats[0]!.rules.length === 0 && cats.length > 1 ? cats.slice(1) : cats
}

/**
 * One line for a requirement: the type name, its acts-on name and its value,
 * joined with spaces. A `DisabledRule` has no part, so it gives an empty text.
 */
export function requirementSummary(req: Requirement): string {
  if (req.type === eLootRuleType.DisabledRule) return ''
  const fields = requirementFields(req)
  const act = fields.find((f) => f.kind === 'select')
  const value = fields.find((f) => f.kind === 'text')
  const actName =
    act && act.kind === 'select' ? (act.value >= 0 ? act.options[act.value] : undefined) : undefined
  return [ruleTypeName(req.type), actName, value && value.value].filter(Boolean).join(' ')
}

/**
 * One line for a rule, for the Customize page. The parts are the requirement
 * type, its acts-on name and the value, joined with ", ". A `DisabledRule`
 * has no part. A rule with no other requirement gives an empty text.
 */
export function ruleSummary(rule: LootRule): string {
  return rule.requirements
    .map((req) => requirementSummary(req))
    .filter((part) => part !== '')
    .join(', ')
}

/**
 * The value field of the first requirement that has one, for the number box of
 * the Customize page. Undefined when the rule has none. `value` is the text
 * the field editor shows, built by the same `requirementFields` call.
 */
export function mainValueField(
  rule: LootRule,
): { req: Requirement; id: ReqTextId; value: string } | undefined {
  for (const req of rule.requirements) {
    const field = requirementFields(req).find((f) => f.kind === 'text')
    if (field && field.kind === 'text') return { req, id: field.id, value: field.value }
  }
  return undefined
}

/**
 * Turns the rule on or off, as the on/off box of the Customize page does.
 * It removes every `DisabledRule` of the rule, then adds one with `b` true
 * when the rule turns off. Never changes the input.
 */
export function setRuleEnabled(profile: LootProfile, index: number, on: boolean): LootProfile {
  const rule = profile.rules[index]
  if (!rule) return profile

  const rest = rule.requirements.filter((r) => r.type !== eLootRuleType.DisabledRule)
  const requirements = on ? rest : [...rest, { type: eLootRuleType.DisabledRule, b: true } as const]
  return { ...profile, rules: profile.rules.map((r, i) => (i === index ? { ...r, requirements } : r)) }
}
