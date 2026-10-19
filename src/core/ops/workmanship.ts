/**
 * "Update Workmanship Requirements" (T24). The C# is ref/editor/Form1.cs 806-822,
 * ref/editor/Macros.cs 119-143 and ref/editor/UpdateWorkReqsForm.cs.
 *
 * The dialog gives an action and a signed change `by` (the track bar runs from
 * -5 to 5). For every rule whose action equals the chosen one, each
 * DoubleValKeyGE takes `Math.Min(10, keyval + by)` and each DoubleValKeyLE takes
 * `Math.Max(1, keyval - by)`. The C# negates `by` first when the action is Keep.
 * The key (`vk`) is not checked, so every DoubleValueKey changes, not only
 * workmanship.
 *
 * The caps are one-sided. A GE value above 10 stays at 10, but a GE value below
 * 0 stays as it is. An LE value below 1 stays at 1, but an LE value above 1
 * stays as it is.
 */

import { eLootAction, eLootRuleType } from '../format/enums'
import type { LootProfile, Requirement } from '../format/profile'

/** Macros.cs 128-139: change each DoubleValKey of the rules of one action. */
function updateRequirement(req: Requirement, by: number): Requirement {
  if (!('keyval' in req)) return req
  if (req.type === eLootRuleType.DoubleValKeyGE) return { ...req, keyval: Math.min(10, req.keyval + by) }
  if (req.type === eLootRuleType.DoubleValKeyLE) return { ...req, keyval: Math.max(1, req.keyval - by) }
  return req
}

export function updateWorkmanshipRequirements(profile: LootProfile, action: number, by: number): LootProfile {
  // Macros.cs 121: the Keep action inverts the change.
  const delta = action === eLootAction.Keep ? -by : by
  return {
    ...profile,
    rules: profile.rules.map((rule) =>
      rule.action === action
        ? { ...rule, requirements: rule.requirements.map((req) => updateRequirement(req, delta)) }
        : rule,
    ),
  }
}
