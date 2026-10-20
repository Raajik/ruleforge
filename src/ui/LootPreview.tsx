/**
 * The loot preview panel (PLAN.md H3c, design/A3-customize.html). It shows
 * the sample items with the action that the profile gives them. A click on an
 * item shows the rule that matched and the result of each requirement.
 */
import { useMemo, useState } from 'react'
import { eLootAction, friendlyActionName } from '../core/format/enums'
import type { LootProfile } from '../core/format/profile'
import { previewItem, type ItemDecision } from '../core/eval/preview'
import type { Character } from '../core/eval/character'
import type { SampleItem } from '../core/eval/item'
import samples from '../core/eval/samples.json'

// The JSON import gives a union of the item shapes, so the items need one
// cast to become SampleItem values.
const ITEMS = samples.items as unknown as SampleItem[]
const CHARACTER = samples.character as Character

/** The name of the action on the badge. The C# has no name for NoLoot. */
export function actionName(action: number): string {
  if (action === eLootAction.NoLoot) return 'Ignore'
  return friendlyActionName(action) || String(action)
}

/** The word of the "Why" heading. The C# has no name for NoLoot and User1-5. */
function actionVerb(action: number): string {
  switch (action) {
    case eLootAction.Keep:
    case eLootAction.KeepUpTo:
      return 'keeps'
    case eLootAction.Salvage:
      return 'salvages'
    case eLootAction.Sell:
      return 'sells'
    case eLootAction.Read:
      return 'reads'
    case eLootAction.NoLoot:
      return 'ignores'
    default:
      return 'handles'
  }
}

export function LootPreview({ profile }: { profile: LootProfile }) {
  const [selected, setSelected] = useState(0)
  const decisions = useMemo(
    () => ITEMS.map((item) => previewItem(profile, item, undefined, CHARACTER)),
    [profile],
  )
  const item = ITEMS[selected]!
  const decision = decisions[selected]!

  return (
    <div className="loot-preview">
      <ul aria-label="Loot preview items" className="loot-items">
        {ITEMS.map((it, i) => (
          <li key={it.name}>
            <button type="button" aria-pressed={i === selected} onClick={() => setSelected(i)}>
              <span className={`loot-badge ${actionClass(decisions[i]!.action)}`}>
                {actionName(decisions[i]!.action)}
              </span>
              <span className="loot-item-name">{it.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <section aria-label="Why" className="loot-why">
        <h3>{`Why Ruleforge ${actionVerb(decision.action)} this ${item.name}`}</h3>
        <p role={decision.error ? 'alert' : undefined}>{reasonText(decision)}</p>
        <ul className="loot-requirements">
          {decision.requirements.map((req, i) => (
            <li key={i} className={`loot-requirement ${req.outcome}`}>
              <span className="loot-outcome">{req.outcome}</span>
              <span>{req.text}</span>
              {req.error && <span className="loot-error-text">{req.error}</span>}
            </li>
          ))}
        </ul>
        <p className="loot-why-note">{noteText(decision)}</p>
      </section>
    </div>
  )
}

/** The line that says why the profile gives the item its action. */
function reasonText(decision: ItemDecision): string {
  if (decision.error) return `This rule has an error: ${decision.error}`
  if (!decision.known) return `The rule ${decision.ruleName} cannot be decided, so no rule below it runs.`
  if (decision.ruleIndex === -1) return 'No rule of the profile matches this item.'
  return `Rule ${decision.ruleName} matches. All ${decision.requirements.length} requirements are true:`
}

/** The line below the requirements of the deciding rule. */
function noteText(decision: ItemDecision): string {
  if (decision.ruleIndex === -1) {
    return decision.rulesAbove === 0
      ? 'The profile has no rules.'
      : `The ${decision.rulesAbove} rules of the profile did not match.`
  }
  const above =
    decision.rulesAbove === 0 ? 'No rule above it. ' : `${decision.rulesAbove} rules above it did not match. `
  return `${above}Rules below it do not run.`
}

/** The color class of the badge, as the mockup gives each action a color. */
export function actionClass(action: number): string {
  switch (action) {
    case eLootAction.Keep:
    case eLootAction.KeepUpTo:
      return 'keep'
    case eLootAction.Salvage:
      return 'salvage'
    case eLootAction.Sell:
      return 'sell'
    default:
      return 'ignore'
  }
}
