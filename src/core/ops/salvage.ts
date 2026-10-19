/**
 * "Add or Update Salvage Rules" (T23). The C# is ref/editor/Form1.cs 790-805,
 * ref/editor/Macros.cs 66-118 and ref/editor/AddSalvageRulesForm.cs.
 *
 * The dialog gives a material group and a workmanship value (slider 1-10,
 * default 10). "Add rules" (OK) and "Add/Update rules" (Yes) both run the
 * change. Each material of the group gets a Salvage rule named
 * "S: <material name>". A rule with that name and the Salvage action keeps its
 * requirements on OK. On Yes
 * (`updateExisting`) its requirements become exactly the three of a fresh
 * rule, because the C# replaces the whole requirement list.
 */

import { eLootAction, eLootRuleType } from '../format/enums'
import type { LootProfile, Requirement } from '../format/profile'
import { doubleValueKey, intValueKey, materialGroups, materialNames } from '../gamedata/generated'

const materialNameById = new Map(materialNames)

/** Macros.cs 110-117: Material LE, Material GE, SalvageWorkmanship GE. */
function materialRequirements(matId: number, work: number): Requirement[] {
  return [
    { type: eLootRuleType.LongValKeyLE, keyval: matId, vk: intValueKey.Material },
    { type: eLootRuleType.LongValKeyGE, keyval: matId, vk: intValueKey.Material },
    { type: eLootRuleType.DoubleValKeyGE, keyval: work, vk: doubleValueKey.SalvageWorkmanship },
  ]
}

export function addSalvageRules(
  profile: LootProfile,
  group: string,
  work: number,
  updateExisting: boolean,
): LootProfile {
  // The C# throws on an unknown group and the catch leaves the file alone.
  const ids = materialGroups.find(([name]) => name === group)?.[1]
  if (!ids) return profile

  let rules = profile.rules
  for (const matId of ids) {
    const name = `S: ${materialNameById.get(matId) ?? ''}`
    const index = rules.findIndex((r) => r.action === eLootAction.Salvage && r.name === name)
    if (index >= 0) {
      if (!updateExisting) continue
      const requirements = materialRequirements(matId, work)
      rules = rules.map((r, i) => (i === index ? { ...r, requirements } : r))
      continue
    }
    rules = [
      ...rules,
      { name, customExpression: '', priority: 0, action: eLootAction.Salvage, lootActionData: 0, requirements: materialRequirements(matId, work) },
    ]
  }
  return { ...profile, rules }
}
