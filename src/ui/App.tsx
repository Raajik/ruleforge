/**
 * The main window (PLAN.md T27, T28, T29). The control names and the three
 * columns copy ref/editor/Form1.Designer.cs.
 *
 * T29 connects the menu bar, the toolbar and the buttons to the phase E ops.
 * It binds the keys Ctrl+C, Ctrl+V, Ctrl+S, Ctrl+O and Delete. A click on a
 * top-level menu item opens its dropdown, as a WinForms menu does. T31 adds
 * browser file access and the unsaved-changes prompt of `CheckSave`
 * (Form1.cs 388-404) and `beforeunload`. The C# has no Delete key
 * binding (Form1.cs 900-908 tracks only the Ctrl state). The rebuild deletes
 * the selected rule with it.
 *
 * The C# action combo lists only the five friendly names (Constants.cs
 * 350-364). Any other action gets no combo entry (Form1.cs 127-141).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { eLootAction, friendlyActionName, ruleTypeName } from '../core/format/enums'
import { readProfile, writeProfile, type LootProfile, type Requirement } from '../core/format/profile'
import { parseInt32 } from '../core/format/reader'
import { copyRuleText, pasteRuleText } from '../core/ops/clipboard'
import { BACKUP_INTERVAL_MINUTES, newFile, unsavedChangesPrompt } from '../core/ops/file'
import {
  cloneRequirement,
  cloneRule,
  deleteRequirement,
  deleteRule,
  isRuleDisabled,
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
import { diffProfiles } from '../core/ops/review'
import { updateWorkmanshipRequirements } from '../core/ops/workmanship'
import { ACTION_COMBO, PackslotsDialog, SalvageRulesDialog, WorkmanshipDialog } from './dialogs'
import {
  downloadText,
  hasFileSystemAccess,
  newProfileFile,
  pickProfileFile,
  writeProfileHandle,
} from './fileio'
import {
  openDesktopProfile,
  saveDesktopProfile,
} from './desktopio'
import { MenuBar, type MenuName } from './MenuBar'
import { CustomizePage } from './CustomizePage'
import { OverviewPage } from './OverviewPage'
import { LootPreview } from './LootPreview'
import { ReqEditor } from './ReqEditor'
import { ReviewChanges } from './ReviewChanges'
import { SalvageCombineTab } from './SalvageCombineTab'
import './theme.css'

type DialogKind = 'salvage' | 'workmanship' | 'packslots'

/** The File-menu actions that `CheckSave` can hold back (Form1.cs 388-404). */
type FileAction = 'new' | 'open' | 'exit'

/**
 * The name the browser gives an untitled profile. The C# title says
 * "New File" (Form1.cs 52, 298).
 */
const DEFAULT_FILE_NAME = 'New File.utl'

/** True when a keystroke belongs to the focused text field, not the editor. */
function isTextEntry(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element || typeof element.tagName !== 'string') return false
  return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT'
}

export function App({ initialProfile, armorGroups, desktop = false }: {
  initialProfile: LootProfile
  /** The color slot names of the ColorSlots XML file (type 15 only). */
  armorGroups?: readonly string[]
  /** The Tauri build sets this: File > Open and Save use the native dialogs. */
  desktop?: boolean
}) {
  const [profile, setProfileState] = useState(initialProfile)
  /**
   * The base profile of the Review changes page (PLAN.md H4): the file as it
   * was opened. A load and New set a new base. A save keeps it, so the user
   * can review every change of the session.
   */
  const [baseProfile, setBaseProfile] = useState(initialProfile)
  const [tab, setTab] = useState<'overview' | 'rules' | 'customize' | 'preview' | 'salvage' | 'review'>('rules')
  const [selectedRule, setSelectedRule] = useState(-1)
  const [selectedReq, setSelectedReq] = useState(-1)
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogKind | null>(null)
  const importInput = useRef<HTMLInputElement>(null)

  // --- The editor file state (Form1.cs 41-56: FileName, FileChanged) ---

  const [fileName, setFileName] = useState('')
  const [changed, setChanged] = useState(false)
  const [pendingAction, setPendingAction] = useState<FileAction | null>(null)
  const [fileError, setFileError] = useState('')
  /** The open file of the File System Access API, to save back to. */
  const handleRef = useRef<FileSystemFileHandle | null>(null)
  /**
   * The desktop path and the C# `LastBackup` clock (Form1.cs 70). A ref: the
   * save runs from event handlers, which read it at the time of the save.
   */
  const pathRef = useRef<string | null>(null)
  const lastBackupRef = useRef(0)

  /**
   * Every profile edit marks the file changed, so the unsaved-changes box
   * shows (Form1.cs 407-415, the `FileChanged` setter). A load and New clear
   * the flag through `setProfileState`.
   */
  function setProfile(next: LootProfile | ((p: LootProfile) => LootProfile)) {
    setProfileState(next)
    setChanged(true)
  }

  const rule = selectedRule >= 0 ? profile.rules[selectedRule] : undefined
  const req = rule && selectedReq >= 0 ? rule.requirements[selectedReq] : undefined

  // The changes of the Review changes page (PLAN.md H4).
  const changes = useMemo(() => diffProfiles(baseProfile, profile), [baseProfile, profile])

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

  // --- Open and save in the browser (T31; the C# is Form1.cs 292-464) ---

  function loadProfile(loaded: LootProfile, name: string, handle: FileSystemFileHandle | null) {
    setProfileState(loaded)
    // The file as it was opened is the base of the Review changes page.
    setBaseProfile(loaded)
    setFileName(name)
    handleRef.current = handle
    // Form1.cs 365-368: a load clears the change flag and the backup clock.
    lastBackupRef.current = 0
    setChanged(false)
    setFileError('')
    selectRule(-1)
  }

  /** Form1.cs 319-331, 360-387. A bad file keeps the current profile. */
  async function openFile() {
    if (desktop) {
      const picked = await openDesktopProfile()
      if (!picked) return
      try {
        const loaded = readProfile(picked.text)
        pathRef.current = picked.path
        loadProfile(loaded, picked.name, null)
      } catch {
        // The path follows a good file only, so a bad file leaves the open
        // path alone and a later Save cannot write over it.
        setFileError(`Could not read ${picked.name}.`)
      }
      return
    }
    const picked = await pickProfileFile()
    if (!picked) return
    try {
      loadProfile(readProfile(picked.text), picked.name, picked.handle)
    } catch {
      setFileError(`Could not read ${picked.name}.`)
    }
  }

  /**
   * Form1.cs 429-464. `pickNew` is Save As: it always asks for a new file.
   * Save writes back to the open file. A browser without the File System
   * Access API downloads the text. It gives false when the save did not
   * happen, as `saveasres` does.
   */
  async function saveFile(pickNew: boolean): Promise<boolean> {
    const text = writeProfile(profile)
    const name = fileName === '' ? DEFAULT_FILE_NAME : fileName
    if (desktop) {
      // Form1.cs 407-427: the `FileChanged` setter writes an older file as the
      // `.bak` before the save, once in 5 minutes, and Save As resets the
      // clock (461). A load resets it too (`loadProfile`).
      const at = Date.now()
      const picks = pickNew || pathRef.current === null
      const backup = !picks && (at - lastBackupRef.current) / (60 * 1000) > BACKUP_INTERVAL_MINUTES
      const path = await saveDesktopProfile(pickNew, name, text, pathRef.current, backup ? at : undefined)
      if (!path) return false
      pathRef.current = path
      // Save As resets the clock (461), so the next save takes the first backup.
      lastBackupRef.current = backup ? at : 0
      setFileName(name)
      setFileError('')
      setChanged(false)
      return true
    }
    let handle = pickNew ? null : handleRef.current
    if (!handle && hasFileSystemAccess()) {
      handle = await newProfileFile(name)
      if (!handle) return false
    }
    if (handle) {
      try {
        await writeProfileHandle(handle, text)
      } catch {
        // The edit stays in the editor and the file keeps its old content.
        setFileError(`Could not write ${name}.`)
        return false
      }
      handleRef.current = handle
      setFileName(handle.name)
    } else {
      downloadText(name, text)
    }
    setFileError('')
    setChanged(false)
    return true
  }

  /** Form1.cs 388-404 `CheckSave`. */
  function checkSave(action: FileAction) {
    if (unsavedChangesPrompt(changed) === 'ask') setPendingAction(action)
    else runFileAction(action)
  }

  function runFileAction(action: FileAction) {
    if (action === 'new') {
      pathRef.current = null
      loadProfile(newFile().profile, '', null)
    } else if (action === 'open') void openFile()
    else window.close()
  }

  /** Form1.cs 395-397: "Yes" saves first and continues only when it worked. */
  async function promptSave() {
    const action = pendingAction
    setPendingAction(null)
    if (action && (await saveFile(false))) runFileAction(action)
  }

  /** Form1.cs 398-399: "No" continues without saving. */
  function promptDiscard() {
    const action = pendingAction
    setPendingAction(null)
    if (action) runFileAction(action)
  }

  // --- Menu items (Form1.Designer.cs 176-330) ---

  function menuPick(menu: MenuName, item: string) {
    if (menu === 'File') {
      if (item === 'New') checkSave('new')
      else if (item === 'Open') checkSave('open')
      else if (item === 'Save') void saveFile(false)
      else if (item === 'Save As') void saveFile(true)
      else checkSave('exit')
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
    downloadText('ranges.ucr', text)
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
        void saveFile(false)
      } else if (event.ctrlKey && key === 'o') {
        event.preventDefault()
        checkSave('open')
      } else if (key === 'delete' && !typing) {
        deleteRuleClick()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  // The browser asks before the page closes a changed file (PLAN.md T31).
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (unsavedChangesPrompt(changed) !== 'ask') return
      event.preventDefault()
      // The DOM lib types returnValue as a boolean; the HTML spec takes a
      // string, and old Firefox wants one to ask at all.
      Object.assign(event, { returnValue: 'File not saved. Save now?' })
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [changed])

  return (
    <div className="app">
      <header className="topbar">
        {/* The brand of design/A-rule-editor.html: the anvil mark and the name. */}
        <div className="brand">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 18h18" />
            <path d="M6 18v-4h12v4" />
            <path d="M8 14V9h8v5" />
            <path d="M12 9V4" />
          </svg>
          <span>Ruleforge</span>
        </div>
        <div role="tablist" aria-label="Editor tabs" className="tabs">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'overview'}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
          <button type="button" role="tab" aria-selected={tab === 'rules'} onClick={() => setTab('rules')}>
            Loot Rules
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'customize'}
            onClick={() => setTab('customize')}
          >
            Customize
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'preview'}
            onClick={() => setTab('preview')}
          >
            Loot preview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'salvage'}
            onClick={() => setTab('salvage')}
          >
            Salvage Combination
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'review'}
            onClick={() => setTab('review')}
          >
            Review changes
            {changes.length > 0 && <span className="tab-badge">{changes.length}</span>}
          </button>
        </div>
        <MenuBar onPick={menuPick} />
        <div className="file-status">
          {fileName !== '' && <span className="file-name">{fileName}</span>}
          {changed && (
            <span className="unsaved">
              <span className="dot" aria-hidden="true" />
              Unsaved changes
            </span>
          )}
        </div>
        <div role="toolbar" aria-label="Toolbar" className="toolbar">
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
      </header>
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

      {fileError !== '' && <p role="alert">{fileError}</p>}

      {tab === 'overview' ? (
        <OverviewPage
          profile={profile}
          fileName={fileName}
          onChange={setProfile}
          onLoadBase={(loaded, name) => loadProfile(loaded, name, null)}
          onOpenPreview={() => setTab('preview')}
        />
      ) : tab === 'customize' ? (
        <CustomizePage profile={profile} onChange={setProfile} onEditInDetail={() => setTab('rules')} />
      ) : tab === 'preview' ? (
        <div role="tabpanel" aria-label="Loot preview" className="preview-tab">
          <LootPreview profile={profile} />
        </div>
      ) : tab === 'salvage' ? (
        <SalvageCombineTab profile={profile} onChange={setProfile} />
      ) : tab === 'review' ? (
        <ReviewChanges changes={changes} profile={profile} onChange={setProfile} />
      ) : (
        <div role="tabpanel" aria-label="Loot Rules" className="editor">          <div className="rule-moves">
            <button type="button" onClick={(e) => moveRuleClick(-1, e.ctrlKey)}>
              Move Up
            </button>
            <button type="button" onClick={(e) => moveRuleClick(1, e.ctrlKey)}>
              Move Down
            </button>
          </div>
          <ul aria-label="Rules" className="rule-list">
            {profile.rules.map((r, i) => {
              // The badge is part of the button text, so a screen reader hears
              // "Off" (or the action) before the rule name.
              const off = isRuleDisabled(r)
              const badge = off ? 'Off' : friendlyActionName(r.action)
              return (
                <li key={i}>
                  <button
                    type="button"
                    aria-pressed={i === selectedRule}
                    onClick={() => selectRule(i)}
                  >
                    {/* The space keeps badge and name apart in the accessible
                        name: "Off ***** Trophies *****". */}
                    {badge !== '' && <span className={off ? 'rule-badge off' : 'rule-badge'}>{badge}</span>}
                    {' '}
                    <span className="rule-name">{r.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {/* The same three texts sit on the requirement list below, so the
              row carries its own name for tests and screen readers. */}
          <div role="group" aria-label="Rule actions" className="rule-actions">
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
              <fieldset className="rule-fields">
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
                <p className="req-fields">Select a requirement.</p>
              )}
            </>
          ) : (
            <p className="rule-fields">Select a rule.</p>
          )}
        </div>
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

      {/* The C# box of CheckSave (Form1.cs 392): Yes, No and Cancel. */}
      {pendingAction && (
        <fieldset role="dialog" aria-label="Save">
          <legend>Save</legend>
          <p>File not saved. Save now?</p>
          <button type="button" onClick={() => void promptSave()}>
            Yes
          </button>
          <button type="button" onClick={promptDiscard}>
            No
          </button>
          <button type="button" onClick={() => setPendingAction(null)}>
            Cancel
          </button>
        </fieldset>
      )}
    </div>
  )
}
