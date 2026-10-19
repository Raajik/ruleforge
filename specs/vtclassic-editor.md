# VTClassic loot editor rebuild

The user's request (2026-10-19): rebuild the VirindiTank Classic loot editor ("uTank2 Settings Editor", VTClassic
1.0.1.6) from zero. Make it better and cross-platform. A local model does most of the work from `PLAN.md`.

## What the legacy app is
- A Windows Forms .NET app that edits `.utl` loot profiles for the VTClassic looter (a Decal plugin for Asheron's Call).
- The C# source is in `ref/` (links into `../ac-loot-editor`). The shipped binaries are in `ref/shipped/`. The source
  and the binaries are both version 1.0.1.6.
- `ref/` is read-only reference. Do not copy code from `../ac-loot-editor/ac-loot-editor-ui` (the earlier rebuild).

## Behavior
1. **File format.** Read and write `.utl` files exactly as VTClassic 1.0.1.6 does:
   - profile versions 0 and 1
   - all 31 requirement types in `eLootRuleType` (0–17, 1000–1004, 2000–2008, 9999)
   - unknown requirement types, kept as opaque data
   - extra blocks, with `SalvageCombine` parsed and unknown blocks kept as opaque data
2. **Lossless save.** For a file that the legacy editor wrote, open then save gives the same bytes.
3. **Editor parity.** Each legacy editor feature exists, with the same result on the file:
   - rules: new, clone, delete, move up and down (Ctrl moves 3), rename, action, "keep up to" count
   - requirements: new, clone, delete, change type, a field editor for each type
   - toggle a rule on or off (`DisabledRule`)
   - search rules by name, with "go to next match"
   - copy and paste a rule, with the same clipboard text as the legacy editor, so users can paste between the two
   - Edit menu: auto-sort rules, add packslot requirements, add or update salvage rules, update workmanship
     requirements
   - salvage combine tab: default range, a range for each material, "combine for value up to", import and export
     of ranges
   - new, open, save, save as, a prompt for unsaved changes, and the default VT profile folder
4. **Cross-platform.** It runs on Linux, Windows and macOS. Phase 1 is a web app (any modern browser). Phase 2 wraps
   it with Tauri 2 as a desktop app.

## Constraints
- TypeScript (strict). The core (`src/core/`) has no DOM and no Node APIs, so the web app and Tauri both use it.
- The tests use Vitest. Each format function and each editor operation has a test.
- Game data tables (property keys, object classes, skills, materials) come from the C# source through a generator
  script, never typed by hand.
- Facts go in `docs/`, one file for each area, each fact tagged Verified, Observed or Unknown.
- "Better" features (see the end of `PLAN.md`) come after parity, and only when the user picks them.

## Out of scope
- The looter engine (`ref/plugin/LootCore.cs`: how VTClassic tests an item against the rules).
- Item scoring, templates and wizards from the earlier rebuild.

## Done when
- `npm test` passes, and the round-trip test gives the same bytes for each legacy-written file in `fixtures/`.
- Each feature in "Editor parity" has an operation in `src/core/ops/` with a test, and a control in the UI.
- `npm run build` passes, and the web app opens, edits and saves `fixtures/LootSnobV4.utl`.
- VirindiTank loads a profile that the new editor saved (the user checks this in game).
