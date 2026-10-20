/**
 * The three dialogs that the Rule menu opens (PLAN.md T29): the C# forms
 * AddSalvageRulesForm, UpdateWorkReqsForm and SelectMinPackSlotsForm under
 * ref/editor/. The labels, the defaults and the button texts copy the C#
 * designers (see docs/ops.md, the T22-T24 sections).
 */
import { useState } from 'react'
import { eLootAction, friendlyActionName } from '../core/format/enums'
import { materialGroups } from '../core/gamedata/generated'

// The C# combo lists eLootActionTool.FriendlyNames() in enum order
// (ref/shared/Constants.cs 350-364): the five actions with a name.
export const ACTION_COMBO = Object.values(eLootAction)
  .map((value) => [value, friendlyActionName(value)] as const)
  .filter(([, name]) => name !== '')

/** A number box like the C# NumericUpDown/track bar: clamp into the range. */
function rangedNumber(text: string, fallback: number, min: number, max: number): number {
  const value = Number(text)
  if (!Number.isFinite(value)) return fallback
  return Math.min(Math.max(value, min), max)
}

/**
 * AddSalvageRulesForm: material group (first SortedDictionary key), workmanship
 * 1-10 default 10, and the buttons "Add rules" (OK) and "Add/Update rules"
 * (Yes). Both run the change (Form1.cs 790-805).
 */
export function SalvageRulesDialog({
  onApply,
  onCancel,
}: {
  onApply: (group: string, work: number, updateExisting: boolean) => void
  onCancel: () => void
}) {
  const groups = materialGroups.map(([name]) => name).sort((a, b) => a.localeCompare(b))
  const [group, setGroup] = useState(groups[0]!)
  const [work, setWork] = useState(10)
  return (
    <fieldset role="dialog" aria-label="AddSalvageRulesForm">
      <legend>Add/Update Salvage Rules</legend>
      <label>
        Material Group
        <select aria-label="Material Group" value={group} onChange={(e) => setGroup(e.target.value)}>
          {groups.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Workmanship
        <input
          aria-label="Workmanship"
          type="number"
          min={1}
          max={10}
          value={work}
          onChange={(e) => setWork(rangedNumber(e.target.value, 10, 1, 10))}
        />
      </label>
      <button type="button" onClick={() => onApply(group, work, false)}>
        Add rules
      </button>
      <button type="button" onClick={() => onApply(group, work, true)}>
        Add/Update rules
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </fieldset>
  )
}

/**
 * UpdateWorkReqsForm: an action (default Keep) and a signed change from -5 to
 * 5 default 0 (UpdateWorkReqsForm.Designer.cs 72-73,95). "Update" (OK) runs it.
 */
export function WorkmanshipDialog({
  onApply,
  onCancel,
}: {
  onApply: (action: number, by: number) => void
  onCancel: () => void
}) {
  const [action, setAction] = useState<number>(eLootAction.Keep)
  const [by, setBy] = useState(0)
  return (
    <fieldset role="dialog" aria-label="UpdateWorkReqsForm">
      <legend>Update Workmanship Requirements</legend>
      <label>
        for all rules with LootAction
        <select
          aria-label="LootAction"
          value={action}
          onChange={(e) => setAction(Number(e.target.value))}
        >
          {ACTION_COMBO.map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Change Workmanship Requirements by
        <input
          aria-label="Change by"
          type="number"
          min={-5}
          max={5}
          value={by}
          onChange={(e) => setBy(rangedNumber(e.target.value, 0, -5, 5))}
        />
      </label>
      <button type="button" onClick={() => onApply(action, by)}>
        Update
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </fieldset>
  )
}

/**
 * SelectMinPackSlotsForm ("Minimum Packspace"): slots 1-102 default 1 and an
 * action (default Keep). "Add missing" (OK) and "Add and Update" (Yes) both
 * run the change (Form1.cs 856-899).
 */
export function PackslotsDialog({
  onApply,
  onCancel,
}: {
  onApply: (action: number, slots: number, updateExisting: boolean) => void
  onCancel: () => void
}) {
  const [action, setAction] = useState<number>(eLootAction.Keep)
  const [slots, setSlots] = useState(1)
  return (
    <fieldset role="dialog" aria-label="Minimum Packspace">
      <legend>Minimum Packspace</legend>
      <label>
        Minimum Packslots
        <input
          aria-label="Minimum Packslots"
          type="number"
          min={1}
          max={102}
          value={slots}
          onChange={(e) => setSlots(rangedNumber(e.target.value, 1, 1, 102))}
        />
      </label>
      <label>
        for all rules with LootAction
        <select
          aria-label="LootAction"
          value={action}
          onChange={(e) => setAction(Number(e.target.value))}
        >
          {ACTION_COMBO.map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => onApply(action, slots, false)}>
        Add missing
      </button>
      <button type="button" onClick={() => onApply(action, slots, true)}>
        Add and Update
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </fieldset>
  )
}
