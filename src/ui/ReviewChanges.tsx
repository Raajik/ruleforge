/**
 * The Review changes page (PLAN.md H4). It shows each change of the current
 * profile against the base profile, the file that the user opened. Every
 * change has one Undo.
 */
import type { LootProfile } from '../core/format/profile'
import { ruleSummary } from '../core/ops/categories'
import { requirementText, undoChange, type RequirementChange, type RuleChange } from '../core/ops/review'

/** The line under the heading. It counts the changes. */
function countText(count: number): string {
  if (count === 0) return 'No changes against the base profile.'
  if (count === 1) return '1 change against the base profile.'
  return `${count} changes against the base profile.`
}

/** The line of one changed requirement. */
function requirementLine(change: RequirementChange): string {
  if (change.kind === 'added') return `Requirement added: ${requirementText(change.after)}`
  if (change.kind === 'removed') return `Requirement removed: ${requirementText(change.before)}`
  return `Requirement changed: ${requirementText(change.before)} -> ${requirementText(change.after)}`
}

export function ReviewChanges({ changes, profile, onChange }: {
  /** The changes of the current profile against the base profile. */
  changes: RuleChange[]
  profile: LootProfile
  onChange: (profile: LootProfile) => void
}) {
  return (
    <div role="tabpanel" aria-label="Review changes" className="review">
      <main className="review-main">
        <div className="review-head">
          <h1>Review changes</h1>
          <p>{countText(changes.length)}</p>
        </div>
        <ul aria-label="Changes" className="change-list">
          {changes.map((change, i) => (
            <li key={i} className={`change ${change.kind}`}>
              <div className="change-head">
                <span className={`change-badge ${change.kind}`}>{change.kind}</span>
                <span className="rule-name">{change.name}</span>
              </div>
              {change.kind === 'changed' ? (
                <ul className="change-details">
                  {change.fields.map((field) => (
                    <li key={field.label}>
                      {field.label}: {field.before} -&gt; {field.after}
                    </li>
                  ))}
                  {change.requirements.map((requirement, j) => (
                    <li key={j}>{requirementLine(requirement)}</li>
                  ))}
                </ul>
              ) : (
                <p className="change-summary">{ruleSummary(change.rule)}</p>
              )}
              <button
                type="button"
                aria-label={`Undo the change of ${change.name}`}
                onClick={() => onChange(undoChange(profile, change))}
              >
                Undo
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
