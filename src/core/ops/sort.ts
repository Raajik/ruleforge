/**
 * Auto-sort of the rule list (T21). The C# is ref/editor/Form1.cs 823-855 and
 * cLootItemRule.AnyReqRequiresID (ref/shared/LootRules.cs 2889-2898).
 *
 * Order: the action number first, with KeepUpTo counted as Keep. Then rules
 * with no ID requirement before rules that need one. Then the name. The C#
 * sorts with a stable bubble sort built on ruleMoveDown, so equal rules keep
 * their order.
 *
 * The C# name compare is `string.CompareTo`, which is culture-aware and so is
 * `localeCompare` here. Tests do not cover the exact .NET culture weights
 * (docs/ops.md).
 */

import { eLootAction, eLootRuleType } from '../format/enums'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { isIdProperty } from '../gamedata/combokeys'

/**
 * `MayRequireID` of each requirement type. The C# lines are in
 * ref/shared/LootRules.cs. Types 0, 8, 9, 10 and 2000-2008 return true.
 * Types 1, 2-5 and 11-13 ask `GameInfo.IsIDProperty` (Constants.cs 425-496).
 * Every other type returns false. cUnsupportedRequirement (263) also
 * returns false.
 */
export function requirementMayRequireID(req: Requirement): boolean {
  switch (req.type) {
    case eLootRuleType.SpellNameMatch:
    case eLootRuleType.SpellCountGE:
    case eLootRuleType.SpellMatch:
    case eLootRuleType.MinDamageGE:
    case eLootRuleType.BuffedMedianDamageGE:
    case eLootRuleType.BuffedMissileDamageGE:
    case eLootRuleType.BuffedLongValKeyGE:
    case eLootRuleType.BuffedDoubleValKeyGE:
    case eLootRuleType.CalcdBuffedTinkedDamageGE:
    case eLootRuleType.TotalRatingsGE:
    case eLootRuleType.CalcedBuffedTinkedTargetMeleeGE:
      return true
    case eLootRuleType.StringValueMatch:
      return 'key' in req && isIdProperty('svk', req.key)
    case eLootRuleType.LongValKeyLE:
    case eLootRuleType.LongValKeyGE:
    case eLootRuleType.LongValKeyFlagExists:
    case eLootRuleType.LongValKeyE:
    case eLootRuleType.LongValKeyNE:
      return 'vk' in req && isIdProperty('lvk', req.vk)
    case eLootRuleType.DoubleValKeyLE:
    case eLootRuleType.DoubleValKeyGE:
      return 'vk' in req && isIdProperty('dvk', req.vk)
    default:
      return false
  }
}

/** `cLootItemRule.AnyReqRequiresID` (LootRules.cs 2891-2898). */
export function anyReqRequiresID(rule: LootRule): boolean {
  return rule.requirements.some(requirementMayRequireID)
}

/** True when the sort keeps the pair in this order (the C# swap is its negation). */
function inOrder(a: LootRule, b: LootRule): boolean {
  const aAct = a.action === eLootAction.KeepUpTo ? eLootAction.Keep : a.action
  const bAct = b.action === eLootAction.KeepUpTo ? eLootAction.Keep : b.action
  if (aAct !== bAct) return aAct < bAct
  const aId = anyReqRequiresID(a)
  const bId = anyReqRequiresID(b)
  if (aId !== bId) return !aId
  return a.name.localeCompare(b.name, 'en') <= 0
}

/** Sorts the rules as the legacy "Auto-Sort Rules" menu item does (Form1.cs 823-855). */
export function autoSortRules(profile: LootProfile): LootProfile {
  const rules = [...profile.rules]
  // The same stable bubble sort as the C# double loop over ruleMoveDown.
  for (let i = rules.length - 1; i > 0; i--) {
    for (let j = 0; j < i; j++) {
      const a = rules[j]
      const b = rules[j + 1]
      if (a && b && !inOrder(a, b)) {
        rules[j] = b
        rules[j + 1] = a
      }
    }
  }
  return { ...profile, rules }
}
