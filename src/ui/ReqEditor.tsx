/**
 * The requirement field editor (PLAN.md T28). It shows the fields that
 * `SetCurrentReq` fills (ref/editor/Form1.cs 187-291): the acts-on combo, the
 * text values with their labels, and a color sample. Every change goes
 * through the core functions, which copy the handlers at Form1.cs 656-769.
 */
import type { Requirement } from '../core/format/profile'
import { requirementFields, setActsOn, setTextValue } from '../core/ops/reqfields'

export function ReqEditor({
  req,
  armorGroups,
  onChange,
}: {
  req: Requirement
  /** The color slot names of the ColorSlots XML file (type 15 only). */
  armorGroups?: readonly string[]
  onChange: (req: Requirement) => void
}) {
  return (
    <fieldset className="req-fields">
      <legend>Requirement</legend>
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
    </fieldset>
  )
}
