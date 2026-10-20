/**
 * The main window layout (PLAN.md T27). The control names and the three
 * columns copy ref/editor/Form1.Designer.cs. The menu items and toolbar
 * buttons are not connected to the ops yet (that is T29).
 *
 * T28 adds the requirement field editor: click a requirement in the list to
 * edit its fields, as `SetCurrentReq` does (ref/editor/Form1.cs 187-291).
 *
 * The C# action combo lists only the five friendly names (Constants.cs
 * 350-364). Any other action gets no combo entry (Form1.cs 127-141).
 */
import { useState } from 'react'
import { eLootAction, friendlyActionName, ruleTypeName } from '../core/format/enums'
import type { LootProfile, Requirement } from '../core/format/profile'
import { ReqEditor } from './ReqEditor'

const MENUS = ['File', 'Edit', 'Rule', 'Combine'] as const

// The C# combo lists eLootActionTool.FriendlyNames() in enum order
// (ref/shared/Constants.cs 350-364): the five actions with a name.
const ACTION_COMBO = Object.values(eLootAction)
  .map((value) => [value, friendlyActionName(value)] as const)
  .filter(([, name]) => name !== '')

export function App({
  initialProfile,
  armorGroups,
}: {
  initialProfile: LootProfile
  /** The color slot names of the ColorSlots XML file (type 15 only). */
  armorGroups?: readonly string[]
}) {
  const [profile, setProfile] = useState(initialProfile)
  const [tab, setTab] = useState<'rules' | 'salvage'>('rules')
  const [selectedRule, setSelectedRule] = useState(-1)
  const [selectedReq, setSelectedReq] = useState(-1)

  const rule = selectedRule >= 0 ? profile.rules[selectedRule] : undefined
  const req = rule && selectedReq >= 0 ? rule.requirements[selectedReq] : undefined

  function changeReq(updated: Requirement) {
    setProfile((p) => ({
      ...p,
      rules: p.rules.map((r, i) =>
        i === selectedRule
          ? { ...r, requirements: r.requirements.map((q, j) => (j === selectedReq ? updated : q)) }
          : r,
      ),
    }))
  }

  return (
    <div>
      <nav aria-label="Main menu">
        {MENUS.map((m) => (
          <button key={m} type="button">
            {m}
          </button>
        ))}
      </nav>
      <div role="toolbar" aria-label="Toolbar">
        <button type="button">Copy rule</button>
        <button type="button">Paste rule</button>
        <input aria-label="Search for rule by name" placeholder="Search for rule by name" />
        <button type="button">Go to next match</button>
      </div>
      <div role="tablist" aria-label="Editor tabs">
        <button type="button" role="tab" aria-selected={tab === 'rules'} onClick={() => setTab('rules')}>
          Loot Rules
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'salvage'}
          onClick={() => setTab('salvage')}
        >
          Salvage Combination
        </button>
      </div>

      {tab === 'rules' ? (
        <div role="tabpanel" aria-label="Loot Rules">
          <ul aria-label="Rules" style={{ height: 400, overflow: 'auto' }}>
            {profile.rules.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  aria-pressed={i === selectedRule}
                  onClick={() => {
                    setSelectedRule(i)
                    setSelectedReq(-1)
                  }}
                >
                  {r.name}
                </button>
              </li>
            ))}
          </ul>

          {rule ? (
            <>
              <fieldset>
                <legend>Rule</legend>
                <label>
                  Rule Name
                  <input aria-label="Rule Name" value={rule.name} readOnly />
                </label>
                <label>
                  Action
                  <select aria-label="Action" value={rule.action} disabled>
                    {!ACTION_COMBO.some(([value]) => value === rule.action) && (
                      <option value={rule.action}>{rule.action}</option>
                    )}
                    {ACTION_COMBO.map(([value, name]) => (
                      <option key={value} value={value}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                {rule.action === eLootAction.KeepUpTo && (
                  <label>
                    Keep Count
                    <input aria-label="Keep Count" value={rule.lootActionData} readOnly />
                  </label>
                )}
                <ul aria-label="Requirements">
                  {rule.requirements.map((r, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        aria-pressed={i === selectedReq}
                        onClick={() => setSelectedReq(i)}
                      >
                        {ruleTypeName(r.type)}
                      </button>
                    </li>
                  ))}
                </ul>
              </fieldset>
              {req ? (
                <ReqEditor req={req} armorGroups={armorGroups} onChange={changeReq} />
              ) : (
                <p>Select a requirement.</p>
              )}
            </>
          ) : (
            <p>Select a rule.</p>
          )}
        </div>
      ) : (
        <div role="tabpanel" aria-label="Salvage Combination">
          <p>Salvage Combination comes in T30.</p>
        </div>
      )}
    </div>
  )
}
