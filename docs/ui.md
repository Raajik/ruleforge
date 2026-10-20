# UI facts (T27+)

- **Observed** (`ref/editor/Form1.Designer.cs` 163-167, 942-947): the main window has a menu bar. Its
  top-level items are File, Edit, Rule and Combine. The toolbar has Copy rule, Paste rule, a search box
  ("Search for rule by name") and Go to next match.
- **Observed** (`ref/editor/Form1.Designer.cs` 354-358, 802-806): the two tabs are "Loot Rules" and
  "Salvage Combination". The Loot Rules tab has the rule list on the left. It has the rule fields and the
  requirement list in the middle, and the requirement fields on the right.
- **Verified** (`src/core/format/enums.test.ts`, `friendlyActionName`): the action combo lists only five names
  in this order: Keep, Salvage, Sell, Read, Keep #. NoLoot and User1-5 have no friendly name and get no combo
  entry (`ref/shared/Constants.cs` 329-364, `ref/editor/Form1.cs` 127-141).
- **Verified** (`src/ui/App.test.tsx`, "a KeepUpTo rule shows its keep count"): the keep-count box is visible
  only when the action is KeepUpTo (`ref/editor/Form1.cs` 127-141).
- **Verified** (`src/ui/App.test.tsx`): `fixtures/LootSnobV4.utl` has 1627 rules, and the rule list shows the
  rule names, one per line (`ref/editor/Form1.cs` 376-379).

## Requirement fields (T28)

- **Observed** (`ref/editor/Form1.cs` 187-291): `SetCurrentReq` shows, per requirement type, an acts-on combo,
  up to four labelled text values and a color sample. No type uses the separate key combo:
  `UI_KeyCombo_Uses` stays false for all of them (`ref/shared/LootRules.cs` 74-79). The editor shows the
  acts-on combo only.
- **Observed** (`ref/shared/LootRules.cs` 337-2862): the text labels come from the `UI_TextValue*_Label`
  overrides. Examples: "Long Value" for types 2, 3, 11, 12 and 13, and "Double Value" for types 4 and 5.
  The fourth field of type 16 shows "Palette Entry #" as its label, but it sets `Slot` (lines 2284-2287).
- **Observed** (`ref/editor/Form1.cs` 171-185): the color sample is a label that shows the requirement color
  in both its fore- and background color. Only the types 14, 15 and 16 show it.
- **Verified** (`src/ui/ReqEditor.test.tsx`): `ReqEditor` shows the acts-on combo, the text values and the
  color sample of a requirement, and every change fires `onChange` with the changed requirement. The acts-on
  combo of type 15 lists the color slot names of `fixtures/ColorSlots.Default.xml` (64 names).
- **Verified** (`src/ui/App.test.tsx`, "clicking a requirement shows its fields"): clicking a requirement in
  the list shows its fields, and typing in a field updates the requirement. The App keeps the edited profile
  in state. The ops of phase E connect in T29.

## Menu bar, toolbar and keys (T29)

- **Observed** (`ref/editor/Form1.Designer.cs` 176-330): the four menus hold these items. File: New, Open,
  Save, Save As, Exit. Edit: Copy Rule, Paste Rule, Paste Rule Unchecked (Dangerous) (line 1008). Rule:
  Add/Update Salvage Rules, Update Workmanship Requirements, Auto-Sort Rules, Add Packslot Requirements.
  Combine: Export Ranges, Import Ranges.
- **Observed** (`ref/editor/Form1.Designer.cs` 193, 203, 218, 255, 263): the shortcut keys are Ctrl+N on
  New, Ctrl+O on Open, Ctrl+S on Save, Ctrl+C on Copy Rule and Ctrl+V on Paste Rule.
- **Observed** (`ref/editor/Form1.cs` 900-908): the C# has no Delete key binding. `tabControl1_KeyDown` only
  tracks the Ctrl state, and neither `Form1.cs` nor `Form1.Designer.cs` binds `Keys.Delete`. The rebuild
  deletes the selected rule on Delete as an addition (PLAN.md T29).
- **Observed** (`ref/editor/Form1.cs` 828-829): the auto-sort handler clears the requirement and the rule
  selection before it sorts.
- **Observed** (`ref/editor/AddSalvageRulesForm.Designer.cs` 145,155,165,
  `ref/editor/UpdateWorkReqsForm.Designer.cs` 123,133, `ref/editor/SelectMinPackSlotsForm.Designer.cs` 71,81,118):
  the dialog buttons are "Add rules" / "Add/Update rules" / "Cancel", "Update" / "Cancel" and
  "Add missing" / "Add and Update" / "Cancel".
- **Verified** (`src/ui/App.connect.test.tsx`, "a click on \"Auto-Sort Rules\" changes the rule order"):
  clicking Auto-Sort Rules re-renders the list in `autoSortRules` order and clears the selection.
- **Verified** (`src/ui/App.connect.test.tsx`, "File > New resets the profile to an empty one"): File > New
  gives an empty profile.
- **Verified** (`src/ui/App.connect.test.tsx`, "File > Open, Save and Save As use the browser file access,
  Exit closes the window"): the four File items run the T31 file access and `window.close()`.
- **Verified** (`src/ui/App.connect.test.tsx`, the Edit menu and toolbar tests): Copy Rule writes the
  clipboard text of the selected rule. Paste Rule appends the pasted rule. It checks the hash.
  "Paste Rule Unchecked (Dangerous)" skips the hash check.
- **Verified** (`src/ui/App.connect.test.tsx`, the three dialog tests and the Cancel test): the Rule menu
  opens three dialogs with the C# defaults. Apply runs the phase E op. The group starts at `Armor Imbues`,
  the first sorted key. The boxes start at the C# values: workmanship 10, change 0, slots 1, action Keep.
  The ranges match the C# controls too. Keep negates the change, so 3 on a value of 2 gives -1.
- **Verified** (`src/ui/App.connect.test.tsx`, "the rule buttons add, clone and delete rules" and "the
  requirement buttons add, clone and delete requirements"): the buttons run the T18 ops. A Ctrl click
  inserts after the selected rule. The selection follows the new rule.
- **Verified** (`src/ui/App.connect.test.tsx`, "Move Up and Move Down move the selected rule, three places
  with Ctrl"): the buttons run `moveRule`. Ctrl moves the rule three places. The selection follows the
  moved rule.
- **Verified** (`src/ui/App.connect.test.tsx`, "\"Toggle this rule\" adds a DisabledRule requirement"):
  the button runs `toggleDisabled`.
- **Verified** (`src/ui/App.connect.test.tsx`, "typing in the search box selects the match"): typing
  selects the first match from the selected rule. "Go to next match" starts after it.
- **Verified** (`src/ui/App.connect.test.tsx`, "Combine > Export Ranges downloads the .ucr text"): export
  downloads the `exportRanges` text as `ranges.ucr`.
- **Verified** (`src/ui/App.connect.test.tsx`, "Combine > Import Ranges reads a .ucr file"): import reads
  a file into `importRanges` through the hidden file input. A bad file keeps the rules.
- **Verified** (`src/ui/App.connect.test.tsx`, the keyboard tests): Ctrl+C copies the selected rule.
  Ctrl+V replaces it in place. Ctrl+S and Ctrl+O run the T31 save and open. Delete removes the selected
  rule. Ctrl+C in a text box leaves the text box alone.
- [Verified] The rule name, action and keep count boxes edit the rule. Bad keep count text stores 0, as `int.TryParse` does (`Form1.cs` 577-629). Test: `src/ui/App.connect.test.tsx`, "edits the rule name, the action and the keep count".
- [Verified] The Salvage Combination tab edits the selected range, adds and deletes entries, and keeps the selection on an entry after its material changes. Test: `src/ui/SalvageCombineTab.test.tsx`.

## Open and save (T31)

- **Observed** (`ref/editor/Form1.cs` 388-404): the unsaved-changes box is
  `MessageBox.Show("File not saved. Save now?", "Save", MessageBoxButtons.YesNoCancel)`. "Yes" runs Save As
  and the action continues only when that save worked, "No" continues, "Cancel" stops. `CheckSave` runs
  before New (294), Open (321), Exit (467) and in the closing event (1050).
- **Observed** (`ref/editor/Form1.cs` 396): the C# "Yes" always runs Save As, even for a named file. The
  rebuild saves to the current file instead. It opens the picker only when there is no file yet. The result
  on the file is the same.
- **Observed** (`ref/shared/LootRules.cs` 3130-3171): `cLootRules.Read` catches every exception and returns
  false, and `LoadFile` (`ref/editor/Form1.cs` 360-387) ignores the result, so the legacy editor shows an
  empty rule list for a bad file.
- **Observed** (`src/core/format/profile.ts` 460-461, 517-527): the rebuild `readProfile` throws only when
  the header version is above the maximum. A first line that is not `UTL` and not a number reads as version
  0 with an empty rule list. Most garbage text then loads as an empty profile, as it does in the C#
  editor. The rebuild keeps the current profile and shows an error for the inputs that do throw.
- **Verified** (`src/ui/fileio.test.ts`, "is false without the pickers and true with them"):
  `hasFileSystemAccess` finds the File System Access API only when both `showOpenFilePicker` and
  `showSaveFilePicker` exist.
- **Verified** (`src/ui/fileio.test.ts`, the two `pickProfileFile` describes): open gives the file name, the
  text and the handle of the picked file. Without the File System Access API the handle is `null`. A closed
  picker or an unreadable file gives nothing. The fallback input accepts `.utl` and leaves the DOM in both
  cases.
- **Verified** (`src/ui/fileio.test.ts`, the `newProfileFile`, `writeProfileHandle` and `downloadText`
  describes): the save half of the file access. `newProfileFile` gives the picked handle, or `null` when the
  user closes the picker. `writeProfileHandle` writes the text and closes the stream. `downloadText`
  downloads the text under the given name. It is the same download that Combine > Export Ranges used before
  T31.
- **Verified** (`src/ui/App.file.test.tsx`, "an edit then File > New asks first, and No starts the new
  file"): every profile edit sets the changed flag, so File > New asks before it resets the profile. Cancel
  keeps the profile and asks again, Yes saves first, and New without changes does not ask.
- **Verified** (`src/ui/App.file.test.tsx`, "an edit in the Salvage Combination tab asks before File >
  New"): the combine tab edits set the flag too, because the App passes its flag-setting `setProfile` as the
  tab's `onChange`.
- **Verified** (`src/ui/App.file.test.tsx`, "beforeunload asks only when the file changed"): the page-close
  prompt appears only for a changed file.
- **Verified** (`src/ui/App.file.test.tsx`, the `App open and save` describe): Save writes back to the open
  handle. Save As picks a new file. A browser without the File System Access API downloads the text under
  the file name or `New File.utl`. A write that fails keeps the edits and the change flag. It also shows a
  `role="alert"` line.
- **Verified** (`src/ui/App.file.test.tsx`, the same describe): File > Open asks first when the file
  changed. It then loads through the picker and clears the change flag. A read error keeps the current
  profile and shows an error line.
- **Observed** (`src/core/ops/file.ts` 83-95): the C# 5-minute `.bak` backup of the `FileChanged` setter
  (`ref/editor/Form1.cs` 407-427) is not wired in the web app. `markChanged` stays for the desktop build
  (T32).
