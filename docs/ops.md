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
