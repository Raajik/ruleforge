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
