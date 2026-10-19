# PLAN: rebuild the VTClassic loot editor

Spec: `specs/vtclassic-editor.md`. Read it once at the start of each session.

## How to work (each session)
1. Read `AGENTS.md`, the spec and this file. Find the first task with `- [ ]`. Do that task only.
2. Read only the C# lines that the task names. Never read a whole big file. `ref/shared/LootRules.cs` has 3200
   lines. Use `rg -n` to find things, and `sed -n 'A,Bp'` to read a range.
3. Write the test first, then the code. Run `npm test` and `npm run typecheck`. Both must pass.
4. Put each new fact in `docs/` (see `docs/README.md`). Tag it **Verified** (name the test), **Observed** (name the
   C# file:line) or **Unknown**.
5. Commit only your own files: `git add <paths>`, never `git add -A`. Subject: `Area: one fact as a sentence`.
   Example: `Format: CountedStreamWriter counts UTF-16 code units`.
6. Change `- [ ]` to `- [x]` for the task, and commit this file with the task.
7. If you cannot finish the task after 3 tries, change `- [ ]` to `- [!]`. Add one line under the task:
   `BLOCKED: <what failed, the error, what you tried>`. Commit and stop. The loop script stops on `[!]`.

## Rules
- `ref/` is read-only reference. Do not change files in it or in `../ac-loot-editor/`.
- Do not copy code from `../ac-loot-editor/ac-loot-editor-ui/`. You can read
  `../ac-loot-editor/docs/UTL_VTCLASSIC_SPEC.md`, but the C# source is the authority.
- `src/core/` has no DOM and no Node APIs. Tests can use `node:fs` to read fixtures.
- Keep each output small: `| head -60`. Your context is 64k tokens.
- Use the leanrea skill only for the shipped binaries (task T03). For the rest of the work, read the C#.

## Traps (read before phase C)
- `CountedStreamWriter` (`ref/shared/CountedStreamWriter.cs`) counts `string.Length`, which is UTF-16 code units, not
  bytes. JS `string.length` also counts UTF-16 code units. Use it.
- `WriteLine` writes CRLF. The reader must accept LF and CRLF. The writer always writes CRLF.
- Numbers: C# writes with `Convert.ToString(x, InvariantCulture)`. For doubles, .NET Framework gives 15 significant
  digits (`0.1`, `1E-05`, `1.5E+20`). JS `String(x)` differs (`0.00001`, `1e-5`). Write a `formatDouble` function
  that copies .NET, and test it on the doubles in the fixtures.
- Doubles are read with `GameInfo.HaxConvertDouble` (`ref/shared/Constants.cs` 416), not `double.Parse`. Copy
  its logic in the reader.
- Booleans: C# writes `True` / `False`. Check how each `Read` parses them (case, `bool.Parse`).
- Regex fields (`rx.ToString()`) are text. Keep them as text. Do not compile them in the core.
- The fixture files are ASCII today. Read files as UTF-8 and keep the text, so that non-ASCII names survive.

## Phase A: setup (done by Claude Code, 2026-10-19)
- [x] T01 Scaffold: Vite, React, TypeScript, Vitest. `npm test` passes.
- [x] T02 Fixtures: 8 `.utl` files and `ColorSlots.Default.xml` copied into `fixtures/` (`.gitattributes` keeps
  their bytes). The origin of each file is in `fixtures/README.md`.

## Phase B: check the reference
- [ ] T03 Compare the shipped binaries with the svn source.
  - Install ilspycmd: `dotnet tool install -g ilspycmd`.
  - Decompile `ref/shipped/VTClassic.dll` and `ref/shipped/uTank2 Settings Editor.exe` into `/tmp/re/vtclassic/`.
  - Diff the classes in `LootRules.cs`, `Constants.cs`, `FileVersioning.cs` and `Form1.cs` against the decompiled
    code. Ignore name and format differences. Find logic differences only.
  - Write `docs/reference.md`: which source is the authority, and each logic difference.

## Phase C: the file format (`src/core/format/`)
Each requirement type has a `Read` and a `Write` method in `ref/shared/LootRules.cs`. For each type, make a TS type,
a `read` function and a `write` function. Test each type: write a literal requirement, read it back, compare. Also
find one real example in a fixture (`rg -n -m3 '^<type number>$' fixtures/`) and round-trip it.

- [ ] T04 Enums: `eLootAction` (`ref/shared/Constants.cs`, `rg -n 'enum eLootAction'`) and `eLootRuleType`
  (`rg -n 'enum eLootRuleType' ref/shared/`). Write `src/core/format/enums.ts`. Test the numbers.
- [ ] T05 Line reader and counted writer: `ref/shared/CountedStreamWriter.cs` (217 lines). Reader: one line at a
  time, strips CR. Writer: collects lines with CRLF, has `count` and `resetCount()` like the C# class. Also write
  `formatDouble` (see Traps).
- [ ] T06 File and rule records.
  - Read: `ref/shared/FileVersioning.cs` (65 lines), and in `LootRules.cs`: `cLootItemRule` (2873–3046),
    `cLootRules` (3047–3200), `iLootRule` (43–220), `cUnsupportedRequirement` (221–272).
  - Read version 0 and version 1 files. Dispatch requirements by type number.
  - Until T07–T13 are done, keep each type as unsupported raw data.
  - Test: `fixtures/vtclassic_editor_minimal.utl` round-trips.
- [ ] T07 Types 0, 1: `SpellNameMatch` (273–345), `StringValueMatch` (346–420).
- [ ] T08 Types 2, 3, 11, 12, 13: `LongValKeyLE` (421–537), `LongValKeyGE` (538–654), `LongValKeyFlagExists`
  (1154–1228), `LongValKeyE` (1379–1495), `LongValKeyNE` (1496–1612).
- [ ] T09 Types 4, 5, 6, 10: `DoubleValKeyLE` (655–729), `DoubleValKeyGE` (730–804), `DamagePercentGE` (805–861),
  `MinDamageGE` (1087–1153).
- [ ] T10 Types 7, 8, 9: `ObjectClassE` (862–919), `SpellCountGE` (920–986), `SpellMatch` (987–1086).
- [ ] T11 Types 1000–1004: `CharacterSkillGE` (1229–1306), `CharacterMainPackEmptySlotsGE` (1307–1378),
  `CharacterLevelGE` (1613–1669), `CharacterLevelLE` (1670–1726), `CharacterBaseSkill` (1727–1812).
- [ ] T12 Types 9999, 14–17: `DisabledRule` (1813–1876), `AnySimilarColor` (1877–2003), `SimilarColorArmorType`
  (2004–2175), `SlotSimilarColor` (2176–2295), `SlotExactPalette` (2296–2367).
- [ ] T13 Types 2000–2008: `BuffedMedianDamageGE` (2368–2438), `BuffedMissileDamageGE` (2439–2505),
  `BuffedLongValKeyGE` (2506–2579), `BuffedDoubleValKeyGE` (2580–2653), `CalcdBuffedTinkedDamageGE` (2654–2720),
  `TotalRatingsGE` (2721–2787), `CalcedBuffedTinkedTargetMeleeGE` (2788–2872).
- [ ] T14 Extra blocks: `ref/shared/UTLFileExtraBlockManager.cs` (140 lines) and
  `ref/shared/UTLBlock_SalvageCombine.cs` (323 lines). Parse `SalvageCombine`. Keep unknown blocks as raw data.
  Test: `fixtures/BuffedLongBuffedDouble.utl` round-trips.
- [ ] T15 Round-trip gate.
  - Replace `src/core/fixtures.test.ts` with a test: for each fixture, read then write gives the same bytes.
  - Also check that no requirement in a fixture stays unsupported.
  - If a file does not match, find the first different line, and fix the type that wrote it.
  - Some fixtures maybe came from another writer (see `fixtures/README.md`). For those, a difference can be
    correct. Record it in `docs/format.md` as a fact.

## Phase D: game data (`src/core/gamedata/`)
- [ ] T16 Game data generator.
  - Write `scripts/gen-gamedata.ts` (run with `npx tsx`). It writes `src/core/gamedata/generated.ts`.
  - Enums from `ref/decompiled/VTClassic/*.cs`: `IntValueKey`, `DoubleValueKey`, `StringValueKey`, `ObjectClass`,
    `VTCSkillID`.
  - Tables from `GameInfo` in `ref/shared/Constants.cs` (414–724): material names, material groups and the other
    tables there.
  - Add `npm run gen`. Test: the counts, and 3 known values for each table.
- [ ] T17 Combo keys and colors.
  - `ref/shared/ComboKeys.cs` (200 lines): which keys each requirement type offers in its "acts on" list.
  - `ref/shared/ColorXML.cs` (121 lines) with `fixtures/ColorSlots.Default.xml`: the color slot data.
  - Put both in `src/core/gamedata/`, with tests.

## Phase E: editor operations (`src/core/ops/`)
Each operation is a pure function: `(profile, args) => newProfile`. It never changes its input. Make one test file
for each task. The C# is in `ref/editor/`.
- [ ] T18 Rule and requirement edits. All line numbers are in `Form1.cs`, except where the line names a file.
  - New rule (497–506), clone (481–496), delete (507–511).
  - Move up and down: `Macros.cs` 36–65. Ctrl moves 3: 770–789.
  - New, clone and delete requirement (522–576).
  - Rename (577–588). Action and keep count (589–629).
  - Change requirement type (630–655). Find which default values the new type gets.
  - Toggle disabled (910–938).
- [ ] T19 Search: `GoToNextMatchingRule` and `FindNextMatchingRule` (`Form1.cs` 959–992). Case-insensitive, wraps
  around to the start. Match on the same text that the rule list shows (find how `lstRules` items get their text).
- [ ] T20 Copy and paste rule: `Form1.cs` 1054–1169.
  - The clipboard text is `base64(sha256(utf8(ruleText))) + "#" + ruleText`.
  - Paste checks the hash, except "paste unchecked". Ctrl+paste replaces the selected rule.
  - Use `crypto.subtle` (it works in browsers and Node), so the function is async.
  - Test: copy then paste gives the same rule, and a changed text fails the hash check.
- [ ] T21 Auto-sort: `Form1.cs` 823–855 and `AnyReqRequiresID` (LootRules.cs 2889).
  - Order: action number first (KeepUpTo counts as Keep). Then rules without ID before rules that need ID. Then
    name.
  - The name compare is `string.CompareTo`, which is culture-aware. Record what you choose in `docs/ops.md`.
  - It is a stable bubble sort. Keep that.
- [ ] T22 Add packslot requirements: `Form1.cs` 856–899 and `SelectMinPackSlotsForm.cs`. "OK" adds a
  `CharacterMainPackEmptySlotsGE` to rules with the chosen action that do not have one. "Yes" also updates the
  value in rules that have one.
- [ ] T23 Add or update salvage rules: `Form1.cs` 790–805, `Macros.cs` 66–118, `AddSalvageRulesForm.cs`, and
  `GameInfo.getMaterialGroups` (`Constants.cs` 695).
- [ ] T24 Update workmanship requirements: `Form1.cs` 806–822, `Macros.cs` 119–143, `UpdateWorkReqsForm.cs`.
- [ ] T25 Salvage combine edits: `Form_SalvageTab.cs` (295 lines).
  - Default range. Add and delete a material entry. Range. Value mode.
  - Import and export of ranges (258–295). Find the file format they use.
- [ ] T26 File operations, all in `Form1.cs`.
  - New (292–307). The default VT profile folder (308–318). Load (360–387).
  - Unsaved-changes check (388–428). Save (429–464).
  - Keep the logic in `src/core/ops/file.ts`. The real file access comes in T31.

## Phase F: the UI (`src/ui/`)
Read `ref/editor/Form1.Designer.cs` with `rg -n 'Text = |Name = '` to get the controls. Do not read the whole file.
Copy the layout of the legacy editor first. Improvements come later.
- [ ] T27 Main layout. Add `@testing-library/react` and `jsdom` first.
  - Menu bar. Toolbar: copy, paste, search box, "next match".
  - Tabs: "Loot Rules" and "Salvage Combination".
  - Loot Rules tab: the rule list on the left. The rule fields (name, action, keep count) and the requirement list
    in the middle. The requirement fields on the right.
  - Test: it renders `fixtures/LootSnobV4.utl` and shows 1627 rules.
- [ ] T28 Requirement field editor.
  - `SetCurrentReq` (`Form1.cs` 187–291) shows the fields of each type: acts on, key, value 1–4, color sample.
    It also shows their labels.
  - The field handlers are at 656–769. Test 3 types.
- [ ] T29 Connect the menus, toolbar and buttons to the ops from phase E.
  - Keyboard: Ctrl+C, Ctrl+V, Ctrl+S, Ctrl+O, Delete.
  - Test: a click on "Auto-Sort Rules" changes the rule order.
- [ ] T30 Salvage Combination tab, connected to the T25 ops.
- [ ] T31 Open and save in the browser.
  - Use the File System Access API when the browser has it (Chromium). Else use `<input type="file">` and a
    download.
  - Ask before the page closes with unsaved changes (`beforeunload`).

## Phase G: desktop (needs the user)
- [ ] T32 USER: install Rust (`mise use -g rust`) and the Tauri packages:
  `sudo dnf install webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel librsvg2-devel libxdo-devel`.
  Then a session adds Tauri 2 around the web app, with native open and save dialogs.

## Later: "better" (only when the user picks)
Ideas, not tasks. Do not start these.
- Undo and redo. Multi-select. Drag to reorder rules.
- Plain-language rule summaries ("Keep: armor with Epic Strength").
- A check that warns about rules that never match, because a rule above them matches first.
- Diff two profiles. Merge rules from another profile.
