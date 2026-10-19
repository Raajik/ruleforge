/**
 * Rule search, as the legacy editor does it (Form1.cs 959-992).
 * The rule list items are the rule names (Form1.cs 378, rename 584), so both
 * functions match on `rule.name`. The search box calls with `CurrentRuleNum`
 * (954-957), the "next match" button with `CurrentRuleNum + 1` (993-996).
 */

import type { LootProfile } from '../format/profile'

/**
 * The index of the first rule at or after `start` whose name contains
 * `search`, ignoring case. When no such rule exists it wraps around and gives
 * the first match before `start`. -1 when nothing matches
 * (`FindNextMatchingRule`, Form1.cs 972-991).
 */
export function findNextMatchingRule(profile: LootProfile, search: string, start: number): number {
  const needle = search.toLowerCase()
  let first = -1
  for (let i = 0; i < profile.rules.length; i++) {
    const rule = profile.rules[i]
    if (rule && rule.name.toLowerCase().includes(needle)) {
      if (i >= start) return i
      if (first === -1) first = i
    }
  }
  return first
}

/**
 * The index the search box selects next, else -1 for no change. An empty
 * search does nothing (`GoToNextMatchingRule`, Form1.cs 959-970), and so does
 * a search with no match.
 */
export function goToNextMatchingRule(profile: LootProfile, search: string, start: number): number {
  if (!search) return -1
  return findNextMatchingRule(profile, search, start)
}
