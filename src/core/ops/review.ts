/**
 * The Review changes page (PLAN.md H4, specs/ruleforge-ui.md).
 *
 * `diffProfiles` compares the current profile with the base profile. The base
 * profile is the file that the user opened. The name of a rule is its key. A
 * rule with the same name in both profiles is the same rule, even when it
 * moved. A rule whose name changed is one changed rule, because its other
 * fields and its requirements must be the same.
 *
 * `undoChange` takes back one change. It never changes its input.
 */

import { eLootRuleType, friendlyActionName, ruleTypeName } from '../format/enums'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { requirementSummary } from './categories'

/** One field of a rule that differs from the base profile. */
export interface FieldChange {
  /** The label of the field: "Name", "Action", "Keep count", "Priority" or "Custom expression". */
  label: string
  before: string
  after: string
}

/** One requirement of a rule that differs from the base profile. */
export type RequirementChange =
  | { kind: 'added'; after: Requirement }
  | { kind: 'removed'; before: Requirement }
  | { kind: 'changed'; before: Requirement; after: Requirement }

/** One changed rule against the base profile. */
export type RuleChange =
  | {
      kind: 'added'
      /** The name of the rule in the current profile. */
      name: string
      /** The index of the rule in the current profile. */
      index: number
      /** The rule of the current profile. */
      rule: LootRule
    }
  | {
      kind: 'removed'
      /** The name of the rule in the base profile. */
      name: string
      /** The place of the rule in the current profile. An undo puts the rule there. */
      index: number
      /** The rule of the base profile. */
      rule: LootRule
    }
  | {
      kind: 'changed'
      /** The name of the rule in the current profile. */
      name: string
      /** The index of the rule in the current profile. */
      index: number
      /** The rule of the base profile. An undo gives it back. */
      before: LootRule
      /** The rule of the current profile. */
      after: LootRule
      /** The fields that differ. */
      fields: FieldChange[]
      /** The requirements that differ. */
      requirements: RequirementChange[]
    }

/** True when two requirements have the same type and the same values. */
function sameRequirement(a: Requirement, b: Requirement): boolean {
  const values = a as unknown as Record<string, unknown>
  const other = b as unknown as Record<string, unknown>
  const keys = Object.keys(values)
  if (keys.length !== Object.keys(other).length) return false
  return keys.every((key) => values[key] === other[key])
}

/**
 * The fields of a rule that differ from the base profile. The name is the key
 * of a rule, so it differs only for a renamed rule.
 */
export function diffRuleFields(before: LootRule, after: LootRule): FieldChange[] {
  const changes: FieldChange[] = []
  if (before.name !== after.name) {
    changes.push({ label: 'Name', before: before.name, after: after.name })
  }
  if (before.action !== after.action) {
    const name = (action: number) => friendlyActionName(action) || String(action)
    changes.push({ label: 'Action', before: name(before.action), after: name(after.action) })
  }
  if (before.lootActionData !== after.lootActionData) {
    changes.push({
      label: 'Keep count',
      before: String(before.lootActionData),
      after: String(after.lootActionData),
    })
  }
  if (before.priority !== after.priority) {
    changes.push({ label: 'Priority', before: String(before.priority), after: String(after.priority) })
  }
  if (before.customExpression !== after.customExpression) {
    changes.push({
      label: 'Custom expression',
      before: before.customExpression,
      after: after.customExpression,
    })
  }
  return changes
}

/**
 * The requirements that differ. A requirement that is equal in both lists is
 * unchanged. The equal ones match first, so an added requirement does not
 * change the ones after it. The diff pairs the rest in order. A pair is a
 * changed requirement. A leftover is an added or a removed one.
 */
export function diffRequirements(before: Requirement[], after: Requirement[]): RequirementChange[] {
  const equal = new Set<number>()
  const freeBefore: number[] = []
  before.forEach((req, i) => {
    const j = after.findIndex((other, k) => !equal.has(k) && sameRequirement(req, other))
    if (j === -1) freeBefore.push(i)
    else equal.add(j)
  })
  const freeAfter = after.map((_, k) => k).filter((k) => !equal.has(k))
  const pairs = new Map<number, number>()
  const removed: RequirementChange[] = []
  freeBefore.forEach((baseIndex, n) => {
    const index = freeAfter[n]
    if (index === undefined) removed.push({ kind: 'removed', before: before[baseIndex]! })
    else pairs.set(index, baseIndex)
  })
  const changes: RequirementChange[] = []
  after.forEach((req, index) => {
    if (equal.has(index)) return
    const baseIndex = pairs.get(index)
    if (baseIndex === undefined) changes.push({ kind: 'added', after: req })
    else changes.push({ kind: 'changed', before: before[baseIndex]!, after: req })
  })
  return [...changes, ...removed]
}

/** One line for a requirement in the change list. */
export function requirementText(req: Requirement): string {
  if (req.type === eLootRuleType.DisabledRule && 'b' in req) return req.b ? 'Disabled' : 'Enabled'
  return requirementSummary(req) || ruleTypeName(req.type)
}

/**
 * Pairs the rules of two profiles. The name of a rule is its key. A rule of
 * the base profile whose name is gone matches a current rule with the same
 * content. This needs one rule free on each side. So a renamed rule is one
 * change and not two.
 */
function matchRules(
  base: LootRule[],
  current: LootRule[],
): { matched: Map<number, number>; removed: { baseIndex: number; index: number }[] } {
  const byName = new Map<string, number[]>()
  current.forEach((rule, i) => {
    const list = byName.get(rule.name)
    if (list) list.push(i)
    else byName.set(rule.name, [i])
  })
  // The matched map holds the base index of each current rule.
  const matched = new Map<number, number>()
  const used = new Set<number>()
  const freeBase: number[] = []
  const removed: number[] = []
  base.forEach((baseRule, baseIndex) => {
    const list = byName.get(baseRule.name)
    const index = list?.find((i) => !used.has(i))
    if (index === undefined) {
      freeBase.push(baseIndex)
      removed.push(baseIndex)
    } else {
      used.add(index)
      matched.set(index, baseIndex)
    }
  })
  // A rule whose name changed keeps its place. Its other fields and its
  // requirements must be the same. The pair needs one free rule on each side,
  // so the diff never guesses which rule is which.
  const freeCurrent = current.map((_, i) => i).filter((i) => !used.has(i))
  if (freeBase.length === 1 && freeCurrent.length === 1) {
    const baseRule = base[freeBase[0]!]!
    const rule = current[freeCurrent[0]!]!
    const same =
      rule.action === baseRule.action &&
      rule.lootActionData === baseRule.lootActionData &&
      rule.priority === baseRule.priority &&
      rule.customExpression === baseRule.customExpression &&
      rule.requirements.length === baseRule.requirements.length &&
      rule.requirements.every((req, k) => sameRequirement(req, baseRule.requirements[k]!))
    if (same) {
      matched.set(freeCurrent[0]!, freeBase[0]!)
      removed.splice(removed.indexOf(freeBase[0]!), 1)
    }
  }
  // The place of a removed rule in the current profile. An undo puts the rule
  // back after the base rule before it, or before the base rule after it.
  const keptAt = new Map<number, number>()
  for (const [currentIndex, baseIndex] of matched) keptAt.set(baseIndex, currentIndex)
  const place = (baseIndex: number): number => {
    for (let i = baseIndex - 1; i >= 0; i--) {
      const at = keptAt.get(i)
      if (at !== undefined) return at + 1
    }
    for (let i = baseIndex + 1; i < base.length; i++) {
      const at = keptAt.get(i)
      if (at !== undefined) return at
    }
    return 0
  }
  return { matched, removed: removed.map((baseIndex) => ({ baseIndex, index: place(baseIndex) })) }
}

/**
 * The changes of the current profile against the base profile. The changed and
 * the added rules follow the order of the current profile. The removed rules
 * come last, in the order of the base profile.
 */
export function diffProfiles(base: LootProfile, current: LootProfile): RuleChange[] {
  const { matched, removed } = matchRules(base.rules, current.rules)
  const changes: RuleChange[] = []
  current.rules.forEach((rule, index) => {
    const baseIndex = matched.get(index)
    if (baseIndex === undefined) {
      changes.push({ kind: 'added', name: rule.name, index, rule })
      return
    }
    const before = base.rules[baseIndex]!
    const fields = diffRuleFields(before, rule)
    const requirements = diffRequirements(before.requirements, rule.requirements)
    if (fields.length === 0 && requirements.length === 0) return
    changes.push({
      kind: 'changed',
      name: rule.name,
      index,
      before,
      after: rule,
      fields,
      requirements,
    })
  })
  for (const { baseIndex, index } of removed) {
    const rule = base.rules[baseIndex]!
    changes.push({ kind: 'removed', name: rule.name, index, rule })
  }
  return changes
}

/**
 * Takes back one change. The undo removes an added rule. It puts a removed
 * rule back at its place in the base profile. It gives the base rule back for
 * a changed rule. It never changes its input.
 */
export function undoChange(profile: LootProfile, change: RuleChange): LootProfile {
  if (change.kind === 'added') {
    return { ...profile, rules: profile.rules.filter((_, i) => i !== change.index) }
  }
  if (change.kind === 'removed') {
    const rules = profile.rules.slice()
    rules.splice(Math.min(change.index, rules.length), 0, change.rule)
    return { ...profile, rules }
  }
  return {
    ...profile,
    rules: profile.rules.map((rule, i) => (i === change.index ? change.before : rule)),
  }
}
