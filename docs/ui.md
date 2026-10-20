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
- **Verified** (`src/core/format/profile.test.ts`, "readProfile on a file that is not a profile"): the rebuild
  `readProfile` throws when the version or the rule count is not a whole number, or the count is below 0.
  The C# editor shows an empty profile there. The rebuild keeps the current profile and shows an error, so
  a save cannot write an empty profile over the wrong file.
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

## Desktop build (T32)

- **Observed** (`ref/editor/Form1.cs` 407-427): the `FileChanged` setter takes a backup when the file is
  named and `(DateTimeOffset.Now - LastBackup).TotalMinutes > 5d`, and writes `<FileName>.<yyyy-MM-dd-HH-mm>.bak`
  (`ref/editor/Form1.cs` 420). `LastBackup` starts at `DateTimeOffset.MinValue`, which is year 1, so the C#
  guard is a ~2026-year wait, not a 5-minute wait. This build takes the first backup after each load or
  save-as (`src/ui/App.tsx`). `LoadFile` and Save As reset the clock (`ref/editor/Form1.cs` 368, 461).
- **Observed** (`ref/editor/Form1.cs` 441-450): the save `SaveFileDialog` writes the C# `FileName`, so the
  backup of a save-as starts with the name of the dialog, beside the chosen path
  (`src/ui/desktopio.ts`, `backupPath`).
- **Verified** (`src/ui/desktopio.test.ts`): `openDesktopProfile` reads the `.utl` file of the native open
  dialog and gives the name, the text and the path. A closed dialog, a failing dialog and an unreadable file
  give `null`. `saveDesktopProfile` writes to the open path on Save. It asks on Save As and on a Save with no
  path, and gives `null` on a closed dialog or a failed write. With a `backup` decision it writes
  `<path>.<stamp>.bak` before the profile, with the same text. `shouldBackup` matches the C# `> 5d`.
  `backupPath` gives the C# `FileName + "." + stamp + ".bak"`, in the folder of the profile.
- **Verified** (`src/ui/desktopio.test.ts`): `hasDesktopAccess` follows the Tauri runtime flag.
- **Verified** (`src/ui/App.desktop.test.tsx`): after a good Open, a Save writes to the file of that Open.
  A file that is not a profile at Open keeps the first file open and the editor shows `Could not read
  <name>.`; the later Save still writes to the first file, never to the failed one.
- **Verified** (`vite.config.ts`, the Tauri build): the Tauri build sets `TAURI_ENV_PLATFORM`, so Vite uses
  `src/ui/main.desktop.tsx` in place of `index.html`, and `App` gets the `desktop` prop. The desktop bundle
  holds the Tauri runtime check and the `uTank settings files` dialog filter. Checked with
  `TAURI_ENV_PLATFORM=linux npm run build` and `npx tauri build --no-bundle`.
- **Verified** (`src-tauri/`, `nice -n 19 npx tauri build --no-bundle`): the Tauri 2 app is named Ruleforge
  and builds. The window has the dialog and fs plugins. `Capabilities/default.json` allows
  `fs:allow-read-text-file` and `fs:allow-write-text-file`. The dialog plugin adds each picked path to the
  live fs scope (`tauri-plugin-dialog 2.8.3`, `src/commands.rs` 188-215, 248-258. `tauri-plugin-fs` 2.7.1,
  `src/lib.rs` 534-565), so no folder scope is needed.

## The Forge look (H1)

- **Observed** (`design/A-rule-editor.html` 19-38, 43-131): the Forge look uses the background `#121419`,
  the panels `#16181D` and `#181B21`, and the hairlines `#2A2E37`. The text color is `#E7E9EE` and the
  accent is `#F0A23B`. The rule editor has three columns. The rule list sits on the left. The rule with
  its requirements sits in the middle. The requirement fields sit on the right.
- **Verified** (`npm run build`, `dist/assets/index-*.css`): `src/ui/theme.css` holds these colors as
  custom properties. It lays the Loot Rules tab out as the three-column grid of the mockup. The Google
  Fonts `@import` stays at the top of the built CSS. So the web entry and the desktop entry both load
  Inter and JetBrains Mono.
- **Verified** (`src/ui/App.test.tsx` badge test, `src/core/ops/rules.test.ts` `isRuleDisabled`): each
  rule row shows an action badge. The badge reads `Off` when a `DisabledRule` has `b` true. Else it reads
  `friendlyActionName(action)`. The badge text is part of the button text, so the accessible name is
  `Off ***** Trophies *****`. The `ruleNames()` helpers of the App tests read the `.rule-name` span.

## The Customize page (H2)

- **Observed** (`design/A3-customize.html` 42-79): the page is a category nav on the left and the rules of one
  category beside it. Each rule row has an on/off box, a one-line summary and at most one number box. The loot
  preview panel (81-107) is not part of H2, and the header carries a "Search rules, items, spells" box and an
  "Export .utl" button.
- **Verified** (`src/ui/CustomizePage.test.tsx`, `npm test` 445 pass): `App` gains a "Customize" tab beside "Loot
  Rules" and "Salvage Combination". The tab shows the categories of `categorizeRules` with the rule count of each,
  and the rules of the selected category with the summary of `ruleSummary`. The on/off box runs `setRuleEnabled`
  and the number box runs `setTextValue` on the `mainValueField` of the rule. "Edit rules in detail" opens the Loot
  Rules tab. Only one panel renders at a time, so the "Rules" list of the App tests is absent on this tab.
- **Verified** (`src/ui/CustomizePage.test.tsx`, "shows the top sections ..."): on `IAC_Level_NoCash.utl` the
  sections hold 10, 16 and 27 rules, because each section is the run of rules after its marker rule.

## The loot preview (H3c)

- **Observed** (`design/A3-customize.html` 81-107): the mockup has a loot preview panel on the right of the
  Customize page. It lists the sample items, each with a badge of the action. Below the list, the "Why" panel
  names the rule that matched. It lists the requirements of that rule. It says that the rules below it do not run.
- **Verified** (`src/ui/LootPreview.test.tsx`): the panel shows the 20 sample items with the action that the
  profile gives them. A click on an item shows the rule that matched and the result of each requirement that
  the panel checked.
- **Verified** (`src/ui/LootPreview.test.tsx`, "shows an error on a rule with an invalid regex pattern, not a
  crash"): a rule with an invalid regex pattern shows the error on that rule. The panel does not crash.
- **Verified** (`src/ui/App.test.tsx`, "the Loot preview tab shows the sample items with the action of the
  profile"): `App` has a "Loot preview" tab beside "Customize" and "Salvage Combination". The tab shows the
  items on the left and the why panel on the right. The Customize page shows the same panel on the right.
