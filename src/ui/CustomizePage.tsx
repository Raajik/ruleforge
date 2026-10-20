/**
 * The Customize page (PLAN.md H2, design/A3-customize.html). The categories of
 * the profile on the left, the rules of one category in the middle. Each row
 * has an on/off box, a one-line summary and one number box. The loot preview
 * panel of the mockup is on the right (H3c).
 *
 * "Edit rules in detail" opens the Loot Rules tab, which the C# calls
 * `Main.dc.html` in the mockup.
 */
import { useState } from 'react'
import type { LootProfile } from '../core/format/profile'
import { categorizeRules, mainValueField, ruleSummary, setRuleEnabled } from '../core/ops/categories'
import { isRuleDisabled } from '../core/ops/rules'
import { setTextValue } from '../core/ops/reqfields'
import { LootPreview } from './LootPreview'

export function CustomizePage({
  profile,
  onChange,
  onEditInDetail,
}: {
  profile: LootProfile
  onChange: (profile: LootProfile) => void
  /** Opens the full editor (the Loot Rules tab). */
  onEditInDetail: () => void
}) {
  const categories = categorizeRules(profile)
  const [selected, setSelected] = useState(0)
  const current = categories[selected] ?? categories[0]

  function setEnabled(index: number, on: boolean) {
    onChange(setRuleEnabled(profile, index, on))
  }

  function setMainValue(index: number, text: string) {
    const field = mainValueField(profile.rules[index]!)
    if (!field) return
    const updated = setTextValue(field.req, field.id, text)
    onChange({
      ...profile,
      rules: profile.rules.map((r, i) =>
        i === index ? { ...r, requirements: r.requirements.map((q) => (q === field.req ? updated : q)) } : r,
      ),
    })
  }

  return (
    <div role="tabpanel" aria-label="Customize" className="customize">
      <nav aria-label="Categories" className="category-list">
        {categories.map((cat, i) => (
          <button
            type="button"
            key={`${cat.index}:${cat.name}`}
            aria-pressed={i === selected}
            onClick={() => setSelected(i)}
          >
            <span className="category-name">{cat.name}</span>
            <span className="category-count">{cat.rules.length}</span>
          </button>
        ))}
      </nav>

      <main className="category-rules" aria-label={current ? current.name : 'Rules'}>
        <div className="category-head">
          <h1>{current ? current.name : ''}</h1>
          <button type="button" onClick={onEditInDetail}>
            Edit rules in detail
          </button>
        </div>
        <ul aria-label="Category rules">
          {(current?.rules ?? []).map((index) => {
            const rule = profile.rules[index]!
            const field = mainValueField(rule)
            return (
              <li key={index} className={isRuleDisabled(rule) ? 'customize-rule off' : 'customize-rule'}>
                <label>
                  <input
                    type="checkbox"
                    aria-label={`Enable ${rule.name}`}
                    checked={!isRuleDisabled(rule)}
                    onChange={(e) => setEnabled(index, e.target.checked)}
                  />
                  <span className="rule-name">{rule.name}</span>
                </label>
                <span className="rule-summary">{ruleSummary(rule)}</span>
                {field && (
                  <input
                    aria-label={`Value of ${rule.name}`}
                    value={field.value}
                    onChange={(e) => setMainValue(index, e.target.value)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      </main>
      <aside aria-label="Loot preview" className="loot-panel">
        <h2>Loot preview</h2>
        <LootPreview profile={profile} />
      </aside>
    </div>
  )
}
