/**
 * The main window (PLAN.md T27, T28, T29). The control names and the three
 * columns copy ref/editor/Form1.Designer.cs.
 *
 * T29 connects the menu bar, the toolbar and the buttons to the phase E ops.
 * It binds the keys Ctrl+C, Ctrl+V, Ctrl+S, Ctrl+O and Delete. A click on a
 * top-level menu item opens its dropdown, as a WinForms menu does. Open, Save,
 * Save As and Exit need the file system of T31, so they call the optional
 * `onOpen`, `onSave`, `onSaveAs` and `onExit` props. The C# has no Delete key
 * binding (Form1.cs 900-908 tracks only the Ctrl state). The rebuild deletes
 * the selected rule with it.
 *
 * The C# action combo lists only the five friendly names (Constants.cs
 * 350-364). Any other action gets no combo entry (Form1.cs 127-141).
 */
import { useEffect, useRef, useState } from 'react'
import { eLootAction, ruleTypeName } from '../core/format/enums'
import type { LootProfile, Requirement } from '../core/format/profile'
import { parseInt32 } from '../core/format/reader'
import { copyRuleText, pasteRuleText } from '../core/ops/clipboard'
import { newFile } from '../core/ops/file'
import {
  cloneRequirement,
  cloneRule,
  deleteRequirement,
  deleteRule,
  moveRule,
  newRequirement,
  newRule,
  setKeepCount,
  setRuleAction,
  setRuleName,
  toggleDisabled,
} from '../core/ops/rules'
import { addPackslotRequirements } from '../core/ops/packslots'
import { goToNextMatchingRule } from '../core/ops/search'
import { addSalvageRules } from '../core/ops/salvage'
import { exportRanges, importRanges } from '../core/ops/salvagecombine'
import { autoSortRules } from '../core/ops/sort'
import { updateWorkmanshipRequirements } from '../core/ops/workmanship'
import { ACTION_COMBO, PackslotsDialog, SalvageRulesDialog, WorkmanshipDialog } from './dialogs'
import { MenuBar, type MenuName } from './MenuBar'
import { ReqEditor } from './ReqEditor'
import { SalvageCombineTab } from './SalvageCombineTab'

type DialogKind = 'salvage' | 'workmanship' | 'packslots'

/** True when a keystroke belongs to the focused text field, not the editor. */
function isTextEntry(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element || typeof element.tagName !== 'string') return false
  return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT'
}

export function App({
  initialProfile,
  armorGroups,
  onOpen,
  onSave,
  onSaveAs,
  onExit,
}: {
  initialProfile: LootProfile
  /** The color slot names of the ColorSlots XML file (type 15 only). */
  armorGroups?: readonly string[]
  /** File access comes in T31; these are the seams for it. */
  onOpen?: () => void
  onSave?: () => void
  onSaveAs?: () => void
  onExit?: () => void
}) {
  const [profile, setProfile] = useState(initialProfile)
  const [tab, setTab] = useState<'rules' | 'salvage'>('rules')
  const [selectedRule, setSelectedRule] = useState(-1)
  const [selectedReq, setSelectedReq] = useState(-1)
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogKind | null>(null)
  const importInput = useRef<HTMLInputElement>(null)

  const rule = selectedRule >= 0 ? profile.rules[selectedRule] : undefined
  const req = rule && selectedReq >= 0 ? rule.requirements[selectedReq] : undefined

  function selectRule(index: number) {
    setSelectedRule(index)
    setSelectedReq(-1)
  }

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

  // --- Clipboard (Form1.cs 1054-1169) ---

  async function copyCurrent() {
    const current = profile.rules[selectedRule]
    if (!current) return
    await navigator.clipboard?.writeText(await copyRuleText(current))
  }

  async function pasteCurrent(checkHash: boolean, replace: boolean) {
    let text: string
    try {
      text = await navigator.clipboard.readText()
    } catch {
      return
    }
    const replaceIndex = replace && selectedRule >= 0 ? selectedRule : undefined
    const next = await pasteRuleText(profile, text, { checkHash, replaceIndex })
    if (!next) return
    setProfile(next)
    selectRule(replaceIndex ?? next.rules.length - 1)
  }

  // --- Rule and requirement buttons (Form1.cs 481-576, 770-789, 910-938) ---

  function insertIndex(next: LootProfile, after: number): number {
    return after >= 0 ? after + 1 : next.rules.length - 1
  }

  function newRuleClick(ctrl: boolean) {
    const after = ctrl && selectedRule >= 0 ? selectedRule : -1
    const next = newRule(profile, after)
    setProfile(next)
    selectRule(insertIndex(next, after))
  }

  function cloneRuleClick(ctrl: boolean) {
    if (selectedRule < 0) return
    const after = ctrl ? selectedRule : -1
    const next = cloneRule(profile, selectedRule, after)
    setProfile(next)
    selectRule(insertIndex(next, after))
  }

  function deleteRuleClick() {
    if (selectedRule < 0) return
    setProfile(deleteRule(profile, selectedRule))
    selectRule(-1)
  }

  function moveRuleClick(offset: number, ctrl: boolean) {
    if (selectedRule < 0) return
    const step = ctrl ? offset * 3 : offset
    const next = moveRule(profile, selectedRule, step)
    const target = Math.min(Math.max(selectedRule + step, 0), next.rules.length - 1)
    setProfile(next)
    selectRule(target)
  }

  function toggleDisabledClick() {
    if (selectedRule < 0) return
    setProfile(toggleDisabled(profile, selectedRule))
  }

  function newReqClick(ctrl: boolean) {
    if (selectedRule < 0) return
    const after = ctrl && selectedReq >= 0 ? selectedReq : -1
    setProfile(newRequirement(profile, selectedRule, after))
    setSelectedReq(after >= 0 ? after + 1 : profile.rules[selectedRule]!.requirements.length)
  }

  function cloneReqClick(ctrl: boolean) {
    if (selectedRule < 0 || selectedReq < 0) return
    const after = ctrl ? selectedReq : -1
    setProfile(cloneRequirement(profile, selectedRule, selectedReq, after))
    setSelectedReq(after >= 0 ? after + 1 : profile.rules[selectedRule]!.requirements.length)
  }

  function deleteReqClick() {
    if (selectedRule < 0 || selectedReq < 0) return
    setProfile(deleteRequirement(profile, selectedRule, selectedReq))
    setSelectedReq(-1)
  }

  // --- Search (Form1.cs 954-996) ---

  function searchChanged(text: string) {
    setSearch(text)
    const found = goToNextMatchingRule(profile, text, selectedRule)
    if (found !== -1) selectRule(found)
  }

  function goNextMatch() {
    const found = goToNextMatchingRule(profile, search, selectedRule + 1)
    if (found !== -1) selectRule(found)
  }

  // --- Menu items (Form1.Designer.cs 176-330) ---

  function menuPick(menu: MenuName, item: string) {
    if (menu === 'File') {
      if (item === 'New') {
        setProfile(newFile().profile)
        selectRule(-1)
      } else if (item === 'Open') onOpen?.()
      else if (item === 'Save') onSave?.()
      else if (item === 'Save As') onSaveAs?.()
      else onExit?.()
      return
    }
    if (menu === 'Edit') {
      if (item === 'Copy Rule') void copyCurrent()
      else void pasteCurrent(item === 'Paste Rule', false)
      return
    }
    if (menu === 'Rule') {
      if (item === 'Add/Update Salvage Rules') setDialog('salvage')
      else if (item === 'Update Workmanship Requirements') setDialog('workmanship')
      else if (item === 'Add Packslot Requirements') setDialog('packslots')
      else {
        // Auto-Sort Rules: the C# clears the selection before it sorts
        // (Form1.cs 828-830).
        setProfile(autoSortRules(profile))
        selectRule(-1)
      }
      return
    }
    if (item === 'Export Ranges') exportRangesNow()
    else importInput.current?.click()
  }

  // --- Combine > Export / Import Ranges (Form_SalvageTab.cs 258-293) ---

  function exportRangesNow() {
    const text = exportRanges(profile)
    if (text === undefined) return
    const url = URL.createObjectURL(new Blob([text]))
    const link = document.createElement('a')
    link.href = url
    link.download = 'ranges.ucr'
    // In the DOM, so every browser starts the download (the C# writes a file).
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  // --- Keyboard (Form1.Designer.cs 193, 203, 216, 256, 264) ---

  // No dependency array: every render rebinds the keys with the fresh state.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      const typing = isTextEntry(event.target)
      if (event.ctrlKey && key === 'c') {
        if (!typing) {
          event.preventDefault()
          void copyCurrent()
        }
      } else if (event.ctrlKey && key === 'v') {
        if (!typing) {
          event.preventDefault()
          void pasteCurrent(true, true)
        }
      } else if (event.ctrlKey && key === 's') {
        event.preventDefault()
        onSave?.()
      } else if (event.ctrlKey && key === 'o') {
        event.preventDefault()
        onOpen?.()
      } else if (key === 'delete' && !typing) {
        deleteRuleClick()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div>
      <MenuBar onPick={menuPick} />
      <div role="toolbar" aria-label="Toolbar">
        <button type="button" onClick={() => void copyCurrent()}>
          Copy rule
        </button>
        <button
          type="button"
          onClick={(e) => void pasteCurrent(true, e.ctrlKey)}
        >
          Paste rule
        </button>
        <input
          aria-label="Search for rule by name"
          placeholder="Search for rule by name"
          value={search}
          onChange={(e) => searchChanged(e.target.value)}
        />
        <button type="button" onClick={goNextMatch}>
          Go to next match
        </button>
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
      <input
        ref={importInput}
        type="file"
        accept=".ucr"
        aria-label="Import ranges file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => {
            try {
              setProfile(importRanges(profile, String(reader.result)))
            } catch {
              // A bad file keeps the profile, as the C# read leaves it alone.
            }
          }
          reader.readAsText(file)
          e.target.value = ''
        }}
      />

      {tab === 'rules' ? (
        <div role="tabpanel" aria-label="Loot Rules">
          <div>
            <button type="button" onClick={(e) => moveRuleClick(-1, e.ctrlKey)}>
              Move Up
            </button>
            <button type="button" onClick={(e) => moveRuleClick(1, e.ctrlKey)}>
              Move Down
            </button>
          </div>
          <ul aria-label="Rules" style={{ height: 400, overflow: 'auto' }}>
            {profile.rules.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  aria-pressed={i === selectedRule}
                  onClick={() => selectRule(i)}
                >
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
          {/* The same three texts sit on the requirement list below, so the
              row carries its own name for tests and screen readers. */}
          <div role="group" aria-label="Rule actions">
            <button type="button" onClick={(e) => newRuleClick(e.ctrlKey)}>
              New
            </button>
            <button type="button" onClick={(e) => cloneRuleClick(e.ctrlKey)}>
              Clone
            </button>
            <button type="button" onClick={deleteRuleClick}>
              Delete
            </button>
          </div>

          {rule ? (
            <>
              <fieldset>
                <legend>Rule</legend>
                <label>
                  Rule Name
                  <input
                    aria-label="Rule Name"
                    value={rule.name}
                    onChange={(e) => setProfile(setRuleName(profile, selectedRule, e.target.value))}
                  />
                </label>
                <label>
                  Action
                  <select
                    aria-label="Action"
                    value={rule.action}
                    onChange={(e) => setProfile(setRuleAction(profile, selectedRule, Number(e.target.value)))}
                  >
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
                    <input
                      aria-label="Keep Count"
                      value={rule.lootActionData}
                      // Form1.cs 619-629: int.TryParse, so bad text stores 0.
                      onChange={(e) =>
                        setProfile(setKeepCount(profile, selectedRule, parseInt32(e.target.value) ?? 0))
                      }
                    />
                  </label>
                )}
                <button type="button" onClick={toggleDisabledClick}>
                  Toggle this rule
                </button>
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
                <div>
                  <button type="button" onClick={(e) => newReqClick(e.ctrlKey)}>
                    New
                  </button>
                  <button type="button" onClick={(e) => cloneReqClick(e.ctrlKey)}>
                    Clone
                  </button>
                  <button type="button" onClick={deleteReqClick}>
                    Delete
                  </button>
                </div>
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
        <SalvageCombineTab profile={profile} onChange={setProfile} />
      )}

      {dialog === 'salvage' && (
        <SalvageRulesDialog
          onApply={(group, work, updateExisting) => {
            setProfile(addSalvageRules(profile, group, work, updateExisting))
            setDialog(null)
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'workmanship' && (
        <WorkmanshipDialog
          onApply={(action, by) => {
            setProfile(updateWorkmanshipRequirements(profile, action, by))
            setDialog(null)
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'packslots' && (
        <PackslotsDialog
          onApply={(action, slots, updateExisting) => {
            setProfile(addPackslotRequirements(profile, action, slots, updateExisting))
            setDialog(null)
          }}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  )
}
