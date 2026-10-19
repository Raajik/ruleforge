/**
 * "Add Packslot Requirements" (T22). The C# is ref/editor/Form1.cs 856-899
 * and ref/editor/SelectMinPackSlotsForm.cs.
 *
 * The dialog gives a slot count (1-102) and an action (default Keep). OK and
 * Yes both run: every rule whose action equals the chosen action gets a
 * `CharacterMainPackEmptySlotsGE` with the slot count when it has none. On Yes
 * (`updateExisting`) the first existing one also takes the new value; the C#
 * breaks after the first match, so later duplicates keep their value.
 */

import { eLootRuleType } from '../format/enums'
import type { LootProfile } from '../format/profile'

export function addPackslotRequirements(
  profile: LootProfile,
  action: number,
  slots: number,
  updateExisting: boolean,
): LootProfile {
  const rules = profile.rules.map((rule) => {
    if (rule.action !== action) return rule
    const index = rule.requirements.findIndex((r) => r.type === eLootRuleType.CharacterMainPackEmptySlotsGE)
    if (index === -1) {
      const created = { type: eLootRuleType.CharacterMainPackEmptySlotsGE, keyval: slots }
      return { ...rule, requirements: [...rule.requirements, created] }
    }
    if (!updateExisting) return rule
    return {
      ...rule,
      requirements: rule.requirements.map((r, i) =>
        i === index && r.type === eLootRuleType.CharacterMainPackEmptySlotsGE ? { ...r, keyval: slots } : r,
      ),
    }
  })
  return { ...profile, rules }
}
