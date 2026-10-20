// The loot preview (PLAN.md H3c). It gives the decision of a profile for one
// item. It gives the result of each requirement of the rule that decided it.
// The rule order is the first match of `cLootRules.Classify` (LootRules.cs
// 3059-3073), as the port in match.ts does.

import { eLootAction, ruleTypeName } from '../format/enums'
import type { LootProfile, Requirement } from '../format/profile'
// The field labels of each requirement type live with the editor operations.
import { requirementFields } from '../ops/reqfields'
import type { Character } from './character'
import type { LootItem } from './item'
import { decideRule, type MatchResult, type SlotDefinitions } from './match'

/** The result of one requirement: "yes", "no", "unknown" or "error". */
export type RequirementOutcome = 'yes' | 'no' | 'unknown' | 'error'

/** One requirement of the deciding rule, with its result. */
export interface RequirementResult {
  /** The type number of the requirement. */
  type: number
  outcome: RequirementOutcome
  /** The one line that shows the requirement. */
  text: string
  /** The error message of a rule with a bad regex pattern. */
  error?: string
}

/** The decision of a profile for one item. */
export interface ItemDecision {
  /** The action of the deciding rule, NoLoot (0) when no rule decided. */
  action: number
  /** The name of the deciding rule, empty when no rule decided. */
  ruleName: string
  /** The LootActionData of the deciding rule, 0 when no rule decided. */
  lootActionData: number
  /**
   * False when a rule with an unknown or broken requirement stopped the
   * search. The other fields then describe that rule.
   */
  known: boolean
  /** The index of the deciding rule, or -1 when no rule decided. */
  ruleIndex: number
  /**
   * The requirements of the deciding rule, with their results. The list stops
   * at the first requirement that is not true, as the C# Match does.
   */
  requirements: RequirementResult[]
  /** The number of rules above the deciding rule. */
  rulesAbove: number
  /** The error message of the deciding rule, when it has one. */
  error?: string
}

/** The result of a requirement as the preview shows it. */
function outcomeName(result: MatchResult): RequirementOutcome {
  if (result === true) return 'yes'
  if (result === false) return 'no'
  return result
}

/**
 * The decision of the profile for the item, with the result of each
 * requirement of the deciding rule. The list stops at the first requirement
 * that is not true. A rule with an invalid regex pattern gives an error on
 * that rule, not a crash.
 */
export function previewItem(
  profile: LootProfile,
  item: LootItem,
  slots?: SlotDefinitions,
  character?: Character,
): ItemDecision {
  const decision = decideRule(profile, item, slots, character)
  if (!decision) {
    return {
      action: eLootAction.NoLoot,
      ruleName: '',
      lootActionData: 0,
      known: true,
      ruleIndex: -1,
      requirements: [],
      rulesAbove: profile.rules.length,
    }
  }
  const requirements = decision.outcomes.map(toResult)
  const broken = requirements.find((r) => r.outcome === 'error')
  return {
    action: decision.result === true ? decision.rule.action : eLootAction.NoLoot,
    ruleName: decision.rule.name,
    lootActionData: decision.result === true ? decision.rule.lootActionData : 0,
    known: decision.result === true,
    ruleIndex: decision.index,
    requirements,
    rulesAbove: decision.index,
    ...(broken ? { error: broken.error } : {}),
  }
}

function toResult(outcome: { req: Requirement; result: MatchResult }): RequirementResult {
  const name = outcomeName(outcome.result)
  return {
    type: outcome.req.type,
    outcome: name,
    text: requirementText(outcome.req),
    ...(name === 'error' ? { error: 'The pattern of this rule is not a valid regular expression.' } : {}),
  }
}

/**
 * One line for a requirement: the type name, the name of the key it acts on
 * and its values. The Customize page shows the same parts in its rule
 * summary.
 */
function requirementText(req: Requirement): string {
  const parts: string[] = []
  for (const field of requirementFields(req)) {
    if (field.kind === 'select') {
      const name = field.value >= 0 ? field.options[field.value] : undefined
      if (name !== undefined) parts.push(name)
    } else if (field.kind === 'text' && field.value !== '') {
      parts.push(field.value)
    }
  }
  return [ruleTypeName(req.type), ...parts].join(' ')
}
