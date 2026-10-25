/**
 * The requirement field editor (PLAN.md T28). It shows the fields that
 * `SetCurrentReq` fills (ref/editor/Form1.cs 187-291): the acts-on combo, the
 * text values with their labels, and a color sample. Every change goes
 * through the core functions, which copy the handlers at Form1.cs 656-769.
 * The type combo comes first (Form1.cs 204-223, 630-655). Types 14-16 add
 * the armor preview (specs/armor-preview.md).
 */
import { useMemo } from 'react'
import type { Requirement } from '../core/format/profile'
import { armorView } from '../core/gamedata/armorpreview'
import { requirementFields, setActsOn, setTextValue } from '../core/ops/reqfields'
import { requirementTypeCombo } from '../core/ops/rules'
import { ArmorPreview } from './ArmorPreview'

export function ReqEditor({
  req,
  armorGroups,
  onChange,
  onTypeChange,
}: {
  req: Requirement
  /** The color slot names of the ColorSlots XML file (type 15 only). */
  armorGroups?: readonly string[]
  onChange: (req: Requirement) => void
  /** A pick in the type combo. The caller replaces the requirement (`setRequirementType`). */
  onTypeChange: (type: number) => void
}) {
  const view = useMemo(() => armorView(req), [req])
  const types = useMemo(() => requirementTypeCombo(), [])
  const typeIndex = types.findIndex((t) => t.type === req.type)
  return (
    <fieldset className="req-fields">
      <legend>Requirement</legend>
      <label>
        Requirement type
        <select
          aria-label="Requirement type"
          value={typeIndex}
          onChange={(e) => {
            const picked = types[Number(e.target.value)]
            if (picked) onTypeChange(picked.type)
          }}
        >
          {/* A raw requirement of a type the editor cannot make shows an empty combo (GetRequirementComboIndexForRuleType gives -1). */}
          {typeIndex === -1 && <option value={-1} />}
          {types.map((t, i) => (
            <option key={t.type} value={i}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {requirementFields(req, armorGroups).map((field) => {
        if (field.kind === 'select') {
          return (
            <label key={field.id}>
              {field.label}
              <select
                aria-label={field.label}
                value={field.value}
                onChange={(e) => onChange(setActsOn(req, Number(e.target.value), armorGroups))}
              >
                {/* An empty combo entry for a value that is not in the list. */}
                {field.value === -1 && <option value={-1} />}
                {field.options.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )
        }
        if (field.kind === 'color') {
          return (
            <div
              key={field.id}
              role="img"
              aria-label={field.label}
              style={{ backgroundColor: field.value, width: 40, height: 20 }}
            />
          )
        }
        return (
          <label key={field.id}>
            {field.label}
            <input
              aria-label={field.label}
              value={field.value}
              onChange={(e) => onChange(setTextValue(req, field.id, e.target.value))}
            />
          </label>
        )
      })}
      {view && <ArmorPreview view={view} />}
    </fieldset>
  )
}
