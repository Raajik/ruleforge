# Editor operation facts for the VTClassic editor.

## Rules

- [Observed] A new rule is a fresh `cLootItemRule` named `New Rule`. Its action is `Keep`, its priority is 0, and it
  has no custom expression and no requirements. `ref/editor/Form1.cs:497-506`.
- [Observed] A rule clone keeps three fields: the name, the action and the requirements. It loses the priority, the
  custom expression and the keep count. The code builds a fresh `cLootItemRule` and copies only those three fields.
  `ref/editor/Form1.cs:481-496`.
- [Observed] A new or cloned rule goes after the selected rule on a Ctrl click. Otherwise it goes at the end of the
  list. `ref/editor/Form1.cs:1003-1019`.
- [Observed] Delete removes the rule at its index. `ref/editor/Form1.cs:1021-1049`.
- [Observed] Move up swaps a rule with the one above it. Move down swaps it with the one below. A Ctrl click runs the
  move three times. A move past an end stops there. `ref/editor/Macros.cs:36-65`, `ref/editor/Form1.cs:770-789`.
- [Observed] Rename sets the rule name. `ref/editor/Form1.cs:577-588`.
- [Observed] The action combo shows 5 of the 11 `eLootAction` members. These are `Keep`, `Salvage`, `Sell`, `Read` and
  `Keep #`. The other members have an empty friendly name, so the combo hides them. `ref/shared/Constants.cs:330-369`.
- [Observed] A new action sets that field only. The keep count keeps its value. `ref/editor/Form1.cs:589-615`.
- [Observed] The keep count comes from a text box through `int.TryParse`. An empty or invalid text gives 0.
  `ref/editor/Form1.cs:616-629`.
- [Observed] The disabled toggle removes every `DisabledRule` requirement of the rule. It then adds a `DisabledRule`
  with `b = true` at the end. It adds nothing if one of the removed ones was true. `ref/editor/Form1.cs:910-938`.

## Requirements

- [Observed] A new requirement is always a `SpellNameMatch`. `ref/editor/Form1.cs:522-545`.
- [Observed] A requirement clone is a shallow copy. `iLootRule.Clone` calls `MemberwiseClone`. Every field is a value
  or a string, so the copy is independent. `ref/shared/LootRules.cs:66-68`.
- [Observed] Delete removes the requirement at its index. `ref/editor/Form1.cs:568-576`.
- [Observed] A change of requirement type replaces the requirement with a fresh default of the new type. The same type
  keeps the current requirement. A type with no creator also keeps it. `ref/editor/Form1.cs:630-655`,
  `ref/shared/LootRules.cs:172-218`.
- [Observed] The default of each type is the C# field initializer. `SpellNameMatch` has an empty pattern.
  `StringValueMatch` keeps `FullDescription` (16). The five `LongValKey*` types (2, 3, 11, 12, 13) keep
  `ActivationReqSkillId` (176). `DoubleValKeyLE` and `DoubleValKeyGE` keep `AcidProt` (167772163). `ObjectClassE`
  keeps `Armor` (2). `ref/shared/LootRules.cs:273-919`, `ref/shared/Constants.cs:51,112,198,216`.
- [Observed] `SpellMatch` has an empty pattern pair and count 1. `CharacterSkillGE` and `CharacterBaseSkill` keep
  `Alchemy` (38). `BuffedLongValKeyGE` keeps `MaxDamage` (218103842). `BuffedDoubleValKeyGE` keeps `AttackBonus`
  (167772172). The color types keep `Color.White` (255, 255, 255), `MaxDifferenceH` 10 and `MaxDifferenceSV` 0.1.
  `DisabledRule` keeps `b = true`, and every other numeric field is 0. `ref/shared/LootRules.cs:987-2870`,
  `ref/shared/Constants.cs:174,207,295`.

## Implementation (`src/core/ops/rules.ts`, T18)

- [Verified] Every operation returns a new profile and never changes its input. Test: `src/core/ops/rules.test.ts`,
  "does not change the input".
- [Verified] `defaultRequirement` gives the C# field defaults of all 31 types. It returns null for the unsupported
  type and for an unknown type number. Test: `src/core/ops/rules.test.ts`, "defaultRequirement".
- [Verified] A rule clone copies the name, the action and the requirements only. It gives the copy its own
  requirement objects. Test: `src/core/ops/rules.test.ts`, "cloneRule".
- [Verified] A move of 3 places, up or down, lands the rule 3 positions away. It stops at an end. Test:
  `src/core/ops/rules.test.ts`, "moveRule".
- [Verified] The disabled toggle adds a `DisabledRule` with `b = true`. It removes every `DisabledRule` when one of
  them is true. It puts a false one back as a true one at the end. Test: `src/core/ops/rules.test.ts`, "toggleDisabled".
- [Verified] A new rule and a new requirement of type 14 round-trip through `writeProfile` and `readProfile`. Test:
  `src/core/ops/rules.test.ts`, "a new rule and requirement in a file".
- [Verified] An operation with an out-of-range index returns the profile unchanged. Test: `src/core/ops/rules.test.ts`,
  "does nothing for a bad index".

## Search (T19)

- [Observed] The rule list shows the rule name. A list item is the `rule.name` string, and the owner-draw prints
  `Items[i].ToString()`. `ref/editor/Form1.cs:378,584`, `ref/editor/Form1.Designer.cs:1177`.
- [Observed] The search box runs a search on every key press from `CurrentRuleNum`. The "next match" button runs it
  from `CurrentRuleNum + 1`. `ref/editor/Form1.cs:954-957,993-996`.
- [Observed] `FindNextMatchingRule` lowercases the search text and each rule name, then takes the first match at or
  after `start`. With no match after `start` it wraps and gives the first match before `start`. With no match at all
  it gives -1. `ref/editor/Form1.cs:972-991`.
- [Observed] `GoToNextMatchingRule` does nothing when the search text is null or empty, and nothing when there is no
  match. `ref/editor/Form1.cs:959-970`.
- [Unknown] The C# `ToLower()` uses the culture of the PC, `toLowerCase()` does not. A name with a special I in a
  Turkish culture could match differently. Every rule name in the fixtures is ASCII.

- [Verified] `findNextMatchingRule` is case-insensitive, takes the first match at or after `start`, wraps to the
  first match when `start` is past the end, and gives -1 for no match and for no rules. Test:
  `src/core/ops/search.test.ts`, "findNextMatchingRule".
- [Verified] `goToNextMatchingRule` gives -1 for an empty search and for no match, so the selection does not move.
  Test: `src/core/ops/search.test.ts`, "goToNextMatchingRule".
- [Verified] The search finds the real rule names of `IAC_Level_NoCash.utl` and wraps to the first one from past
  the end of the list. Test: `src/core/ops/search.test.ts`, "finds the real rule names in a fixture".

## Copy and paste (T20)

- [Observed] Copy writes the current rule with `cLootItemRule.Write` and reads the stream as ASCII. It sets the
  clipboard to `base64(sha256(utf8(ruleText))) + "#" + ruleText`. Empty rule text sets nothing.
  `ref/editor/Form1.cs:1078-1099`.
- [Observed] Paste splits the clipboard text on every `#`. Part 0 is the hash and the rest joins back with `#` as
  the rule text. Empty clipboard text, fewer than two parts and a checked hash mismatch all show "Invalid rule
  format in clipboard.". `ref/editor/Form1.cs:1104-1127`.
- [Observed] The paste reads the rule with `cLootItemRule.Read` at `LootRules.UTLFileVersion`.
  `LootRules.UTLFileVersion` holds the version of the loaded file (`ref/shared/LootRules.cs:3051`, set at load
  `3144-3153`). Copy always writes the custom expression line (`LootRules.cs:3009`). A version 0 read skips that
  line (`2950-2953`), so the expression becomes the rule header. `Convert.ToInt32("")` throws, and the empty catch
  makes the paste do nothing. Copy and paste do not work on a version 0 file in the legacy editor.
  `ref/editor/Form1.cs:1154`.
- [Observed] Without Ctrl the pasted rule goes to the end of the list. With Ctrl and a selected rule, the paste
  inserts the new rule after the selected one and deletes the old rule. The paste replaces the selected rule in
  place. `ref/editor/Form1.cs:1131-1147`, `ref/editor/Form1.cs:1013-1016`.
- [Observed] "Paste unchecked" calls the same code with the hash check off. Every rule read error passes an empty
  catch, so a bad paste shows no message. `ref/editor/Form1.cs:1162-1165`, `ref/editor/Form1.cs:1154`.

- [Verified] `copyRuleText` gives `base64(sha256(utf8(text))) + "#" + text`. The text starts with the rule name
  line in CRLF. Test: `src/core/ops/clipboard.test.ts`, "copyRuleText".
- [Verified] Copy then paste appends a rule equal to the copied one. It keeps the keep count of a `KeepUpTo` rule.
  The input profile does not change. Test: `src/core/ops/clipboard.test.ts`, "copy then paste gives the same rule".
- [Verified] A paste keeps a raw requirement as text and a `#` in the rule name. Test:
  `src/core/ops/clipboard.test.ts`, "pastes a rule with an unsupported requirement" and "keeps a \"#\" in the rule
  name".
- [Verified] Changed rule text fails the hash check and gives null. `checkHash: false` takes the changed text.
  Empty text, text without `#` and a wrong hash also give null. Test: `src/core/ops/clipboard.test.ts`, "changed
  text fails the hash check", "rejects invalid clipboard text".
- [Verified] A paste with `replaceIndex` replaces the rule in place and keeps the length. Test:
  `src/core/ops/clipboard.test.ts`, "Ctrl+paste replaces the selected rule in place".
- [Verified] An out-of-range `replaceIndex` returns the profile unchanged. Test:
  `src/core/ops/clipboard.test.ts`, "returns the profile unchanged for an out-of-range replaceIndex".
- [Verified] A paste into a version 0 profile gives null, because the C# read throws there. Test:
  `src/core/ops/clipboard.test.ts`, "does nothing on a version 0 profile, where the C# read throws".

## Auto-sort (T21)

- [Observed] "Auto-Sort Rules" runs a stable bubble sort on the rule list. Each swap is a "move rule down" of index
  `j`, so equal rules keep their order. `ref/editor/Form1.cs:823-855`.
- [Observed] The compare is: the action number first, with `KeepUpTo` counted as `Keep`. At an equal action number
  a rule with an ID requirement comes after a rule without one. Then the names compare with `name.CompareTo`.
  `ref/editor/Form1.cs:838-843`.
- [Observed] `AnyReqRequiresID` is true when any requirement of the rule has `MayRequireID` true.
  `ref/shared/LootRules.cs:2891-2898`.
- [Observed] `MayRequireID` is true for types 0, 8, 9, 10 and 2000-2008. It is `GameInfo.IsIDProperty(vk)` for type 1
  (a StringValueKey), types 2, 3, 11, 12 and 13 (an IntValueKey) and types 4 and 5 (a DoubleValueKey). It is false
  for types 6, 7, 1000-1004, 14-17 and 9999, and for `cUnsupportedRequirement`.
  `ref/shared/LootRules.cs:263,331-2843`, `ref/shared/Constants.cs:425-496`.
- [Unknown] The C# `string.CompareTo` is culture-aware. The rebuild uses `localeCompare` with the locale of the
  environment, so a name with special letters could sort differently. Every rule name in the fixtures is ASCII.

- [Verified] `requirementMayRequireID` gives the C# result for all 31 types and for a raw requirement. Test:
  `src/core/ops/sort.test.ts`, "anyReqRequiresID".
- [Verified] `autoSortRules` orders by the action number with `KeepUpTo` as `Keep`, then by the ID requirement, then
  by the name. It is stable, it never changes its input and it copies the rule objects. Test:
  `src/core/ops/sort.test.ts`, "autoSortRules".
- [Verified] On `IAC_Level_NoCash.utl` (56 rules) the sort is a permutation of the input, it puts the 14 Salvage
  rules after the 42 Keep and KeepUpTo rules, a second sort changes nothing, and the sorted profile round-trips
  through `writeProfile` and `readProfile`. Test: `src/core/ops/sort.test.ts`, "sorts a real fixture into order and
  round-trips it" and "is idempotent on a real fixture".

## Packslot requirements (T22)

- [Observed] The form defaults are slots 1 and action `Keep`. The slots box allows 1 to 102.
  `ref/editor/SelectMinPackSlotsForm.cs:13-14`, `ref/editor/SelectMinPackSlotsForm.Designer.cs:44-61`.
- [Observed] "OK" and "Yes" both run the change. It walks every rule and keeps the rules whose `Action()` equals the
  chosen action exactly, so a `KeepUpTo` rule does not match `Keep`. A rule without a
  `CharacterMainPackEmptySlotsGE` gets one with the chosen value at the end of its requirement list. A rule with one
  keeps its value on "OK". On "Yes" the first one takes the new value. The loop breaks after the first match, so a
  second one keeps its value. `ref/editor/Form1.cs:856-899`, `ref/shared/LootRules.cs:1312-1313`.
- [Observed] Both `Keep` and `Salvage` rules in the fixtures have a `CharacterMainPackEmptySlotsGE`, so the action
  match matters: `IAC_Level_NoCash.utl` has 2 Keep rules with value 12 and 14 Salvage rules with values 7 to 48.

- [Verified] `addPackslotRequirements` matches the action exactly, appends the requirement at the end, changes an
  existing value only when `updateExisting` is true and only for the first one, never changes its input and copies
  the rule objects. Test: `src/core/ops/packslots.test.ts`, all tests.
- [Verified] On `IAC_Level_NoCash.utl` the 39 Keep rules gain the requirement, the 2 that already have one keep or
  update it, and the changed profile round-trips through `writeProfile` and `readProfile`. Test:
  `src/core/ops/packslots.test.ts`, "adds the requirement to a real fixture and round-trips it".

## Salvage rules (T23)

- [Observed] The form defaults are workmanship 10 and the workmanship slider sets `Minimum = 1` and `Value = 10`
  and sets no `Maximum`. The group combo lists the keys of `GameInfo.getMaterialGroups()` in `SortedDictionary`
  order (sorted by name) and starts at index 0.
  `ref/editor/AddSalvageRulesForm.cs:13-25`, `ref/editor/AddSalvageRulesForm.Designer.cs:94,98`.
- [Unknown] The Designer sets no slider `Maximum`, so the WinForms default (10) would apply. This was not run.
- [Observed] "Add rules" (OK) and "Add/Update rules" (Yes) both run the change. The material ids come from
  `GameInfo.getMaterialGroups()[group]`. An unknown group throws and the catch shows a message, so the file does
  not change. `ref/editor/Form1.cs:790-805`.
- [Observed] Each material becomes one rule named `S: <material name>`, with the name of an unknown material id
  taken as the empty string. The macro walks the materials in group order and appends a new rule at the end of the
  list. `ref/editor/Macros.cs:66-108`, `ref/shared/Constants.cs:672-680`.
- [Observed] A rule matches only when its action is exactly `Salvage` and its name equals the `S: ...` name, and
  only the first match counts. The fixture calls its rules `(S) Aquamarine` and friends, so they never match and
  the macro adds its own rules beside them. `ref/editor/Macros.cs:79-90`, `fixtures/IAC_Level_NoCash.utl:340`.
- [Observed] A fresh rule has priority 0, action `Salvage`, keep count 0 and no custom expression (the
  `cLootItemRule` field initializers). It sets the requirement list to exactly three requirements:
  `LongValKeyLE(mat, Material)`, `LongValKeyGE(mat, Material)` and
  `DoubleValKeyGE(work, SalvageWorkmanship)`. On update the C# drops the whole old list, so the rule loses its
  other requirements. `ref/editor/Macros.cs:100-117`, `ref/shared/LootRules.cs:2875-2881`.

- [Verified] `addSalvageRules` adds one `S: <name>` Salvage rule per material of the group at the end, in group
  order, with the three C# requirements. Test: `src/core/ops/salvage.test.ts`, "adds one rule per material at the
  end, in group order".
- [Verified] On `updateExisting: false` an existing matching rule keeps its requirements. On `true` its whole
  requirement list becomes the three new ones. A rule with another action or name does not match, so a second rule
  joins the list. Test: `src/core/ops/salvage.test.ts`, "keeps the requirements of an existing ...",
  "replaces every requirement of an existing rule ..." and "matches the name and the action exactly".
- [Verified] An unknown group gives the same profile back, the input never changes, every material id of every
  group has a name, and the changed profile round-trips through `writeProfile` and `readProfile`. Test:
  `src/core/ops/salvage.test.ts`, the last five tests.

## Update workmanship requirements (T24)

- [Observed] The menu item opens `UpdateWorkReqsForm`. On "Update" (OK) it calls `alterWorkmanshipReqs(f.act,
  f.wrk)` and redraws the current rule. A thrown exception shows a message. `ref/editor/Form1.cs:806-822`.
- [Observed] The form fields start at `wrk = 0` and `act = eLootAction.Keep`. The workmanship track bar runs from
  -5 to 5, and the value label starts at "0" and only changes on a scroll. The action combo lists
  `eLootActionTool.FriendlyNames()` (Keep, Salvage, Sell, Read, Keep #) and starts at index 0.
  `ref/editor/UpdateWorkReqsForm.cs:13-14,21-22,26-28`, `ref/editor/UpdateWorkReqsForm.Designer.cs:72-73,95`.
- [Observed] `alterWorkmanshipReqs(e, by)` negates `by` first when `e` is `Keep`. Then, for every rule whose
  action equals `e`, each `DoubleValKeyGE` takes `Math.Min(10, keyval + by)` and each `DoubleValKeyLE` takes
  `Math.Max(1, keyval - by)`. The key (`vk`) is not checked, so every DoubleValueKey changes, not only
  workmanship. `ref/editor/Macros.cs:119-142`.
- [Observed] The caps are one-sided. A GE value above 10 stays at 10, and a GE value below 0 stays as it is. An
  LE value below 1 stays at 1, and an LE value above 1 stays as it is. A `by` of 0 still clamps.
  `ref/editor/Macros.cs:128-139`.
- [Observed] The action match is exact, so a `Keep` run does not touch a `KeepUpTo` rule. `ref/editor/Macros.cs:124`.
- [Observed] The real fixture `LootSnobV4.utl` has 36 `DoubleValKeyGE` (vk 150) and 1 `DoubleValKeyLE`
  (vk 167772171) on `Keep` rules, so the macro changes requirements that are not workmanship.
  `fixtures/LootSnobV4.utl`. The single `KeepUpTo` rule of `vtclassic_editor_rich.utl` has
  `DoubleValKeyGE` 7 with vk `SalvageWorkmanship` (167772169).

- [Verified] `updateWorkmanshipRequirements` adds `by` to `DoubleValKeyGE` and subtracts it from `DoubleValKeyLE`,
  then caps at 10 and floors at 1. It negates `by` for `Keep`. A `by` of 0 still clamps. It changes only the
  rules of the exact action, leaves other types alone, never changes its input, and round-trips. Test:
  `src/core/ops/workmanship.test.ts`, all tests.
- [Verified] On `LootSnobV4.utl` the 36 `DoubleValKeyGE` of the `Keep` rules move from 1.03 and 1.04 to 4.03 and
  4.04, the one `DoubleValKeyLE` floors at 1, and the result round-trips. Test:
  `src/core/ops/workmanship.test.ts`, "changes the unrelated DoubleValueKeys of LootSnobV4 too".

## Salvage combine edits (T25)

- [Observed] The tab works on the first `SalvageCombine` block of the file. The default range text box writes
  `DefaultCombineString` and returns early when the text is already stored. `ref/editor/Form_SalvageTab.cs:9,198-205`.
- [Observed] "New" walks the material combo list (`GameInfo.getMaterialInfo()`, a `SortedDictionary` sorted by name),
  takes the first material without an entry, stores the default range for it and appends it at the end of the list.
  When every material has an entry it does nothing.
  `ref/editor/Form_SalvageTab.cs:14-25,207-233`, `ref/shared/Constants.cs:665-669`.
- [Observed] "Delete" removes only the `MaterialCombineStrings` entry of the selected index. A value mode of that
  material stays in the block. The list then selects the previous entry (the UI part of T30).
  `ref/editor/Form_SalvageTab.cs:235-256`.
- [Observed] The range text box writes `MaterialCombineStrings[material]` and returns early for the same text.
  `ref/editor/Form_SalvageTab.cs:124-140`.
- [Observed] The value mode checkbox stores `DEFAULT_VALUECOMBINE_VALUE` (390000, line 11) when it turns on: the
  handler sets the text box to that value first (line 152). Turning it off removes the material from
  `MaterialValueModeValues` (166-167). The value text box only writes while the checkbox is on (187), and a failed
  `int.TryParse` falls back to 390000 (183-184). `ref/editor/Form_SalvageTab.cs:142-196`.
- [Observed] "Export Ranges" opens a `*.ucr` dialog and writes `SalvageBlock.Write`, so the file is the
  `SalvageCombine` body alone (version line, default, material count, pairs, value mode count, pairs) with CRLF
  lines: no UTL header and no block header. "Import Ranges" reads the file with `StreamReader` and
  `SalvageBlock.Read(pf, 0)`, which replaces the content of the first block in place.
  `ref/editor/Form_SalvageTab.cs:258-293`, `ref/shared/UTLBlock_SalvageCombine.cs:272-321`.
- [Observed] The C# always has the block: the `cLootRules` constructor and every read end with
  `CreateDefaultBlocks`, so the tab, the import and the export never see a profile without one.
  `ref/shared/LootRules.cs:3053-3056`, `ref/shared/UTLFileExtraBlockManager.cs:76-83,118-125`. `readProfile` does
  not create the block (`src/core/format/profile.ts:508-535`), and all 8 fixtures have one.

- [Verified] `setDefaultRange` and `setRange` store the text and give the same profile back for unchanged text or
  an index outside the list. Test: `src/core/ops/salvagecombine.test.ts`, "setDefaultRange" and "setRange".
- [Verified] `addMaterialEntry` takes the first material of `materialIds` that has no entry, stores the default
  range and appends it. The combo order is the culture sort of the material names (checked against
  `Intl.Collator('en')`). A profile where every material has an entry comes back unchanged. On
  `vtclassic_editor_minimal.utl` it adds Alabaster (66) and the file round-trips. Test:
  `src/core/ops/salvagecombine.test.ts`, "addMaterialEntry".
- [Verified] `deleteMaterialEntry` removes only the combine entry, so the value mode of the material stays. A bad
  index gives the same profile back. Test: `src/core/ops/salvagecombine.test.ts`, "deleteMaterialEntry".
- [Verified] `setValueMode` stores 390000 on and drops the value off. `setValueModeValue` parses like C#
  `int.TryParse` (whitespace, sign, Int32 range) with the 390000 fallback, and writes only while the material has a
  value mode. Test: `src/core/ops/salvagecombine.test.ts`, "setValueMode" and "setValueModeValue", and
  `src/core/format/reader.test.ts`, "parseInt32".
- [Verified] `exportRanges` writes the block body with CRLF lines. `importRanges` replaces the first block in place
  and appends the block when the profile has none. It reads LF-only text. Text that is not a .ucr file throws, and
  the profile keeps its stored ranges. An export then an import round-trips. Test:
  `src/core/ops/salvagecombine.test.ts`, "exportRanges" and "importRanges".
- [Verified] Every edit leaves the input profile unchanged, and six edits of one run on `vtclassic_editor_minimal.utl`
  round-trip through `writeProfile` and `readProfile`. Test: `src/core/ops/salvagecombine.test.ts`, "the tab edits
  together on a real fixture" and the input checks of each test.
- [Unknown] A delete followed by "New" may order the file lines differently than the legacy editor. A run on
  .NET 10 shows that `Dictionary` reuses the freed slot, so the new material lands at the deleted position.
  This editor appends at the end instead. The legacy .NET Framework app was not run.
