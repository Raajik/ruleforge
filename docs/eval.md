# Item evaluator facts for the VTClassic editor.

## The item input

- [Observed] The C# Match methods read an item through `GameItemInfo`: `ObjectClass`, `GetValueInt`,
  `GetValueDouble`, `GetValueString`, `Spells` and `Palettes`. `ref/shared/LootRules.cs:283-292,357-360,872-875,930-933`.
- [Observed] A value the item does not have gives the default of the C# call. Every Match method passes 0, 0.0 or
  "". `ref/shared/LootRules.cs:359,434,551,668,743,930,1099-1100,1167,1392,1509`.
- [Verified] A key that is not in the generated enums falls back to the default. Every value of the three key enums
  is unique, so the number to name map is unambiguous. `src/core/eval/item.test.ts`.
- [Verified] `colorToHSV` gives hue 0 for red, 60 for yellow and 120 for green. It gives hue 0 for a gray.
  `src/core/eval/item.test.ts`.

## Classify

- [Observed] The first rule whose every requirement matches gives the action, the rule name and the
  `LootActionData`. No match gives `NoLoot`, an empty name and data 0. `ref/shared/LootRules.cs:3059-3073`.
- [Observed] A rule matches when every requirement matches, in order. It stops at the first miss.
  `ref/shared/LootRules.cs:2901-2908`.
- [Verified] `classify` gives the first matching rule, keeps its `LootActionData` and skips a disabled rule.
  `src/core/eval/match.test.ts`.
- [Verified] A rule whose unknown requirement comes after a miss still decides. An unknown requirement that is
  reached first stops the search with `known` false. `src/core/eval/match.test.ts`.

## Requirement types

- [Observed] Type 0 matches when any spell name matches the pattern. Type 9 counts the spells that match
  `rxDoesMatch` and, when `rxDoesNotMatch` is not empty after a trim, do not match it.
  `ref/shared/LootRules.cs:283-292,999-1013`.
- [Observed] Type 1 matches the string value of the key. `ref/shared/LootRules.cs:357-360`.
- [Observed] Types 2 and 3 compare the int value with `<=` and `>=`. Types 12 and 13 use `==` and `!=`. Type 11
  tests the bits of the int value with `> 0`. `ref/shared/LootRules.cs:432-435,549-552,1165-1168,1390-1393,1507-1510`.
- [Observed] Types 4 and 5 cast both the item value and the key value to `float` before the compare.
  `ref/shared/LootRules.cs:666-669,741-744`.
- [Verified] Each type 0 to 17 and 9999 matches and misses like the C# Match method.
  `src/core/eval/match.test.ts`.
- [Observed] Type 6 `DamagePercentGE.Match` returns false for every item. `ref/shared/LootRules.cs:815-818`.
- [Observed] Type 7 compares the object class. Type 8 counts the item spells. `ref/shared/LootRules.cs:872-875,930-933`.
- [Observed] Type 10 uses `maxdamage - variance * maxdamage`, in double math.
  `ref/shared/LootRules.cs:1097-1102`.
- [Observed] The similar-color types 14, 15 and 16 need the hue distance within `MaxDifferenceH` and the
  Euclidean distance of saturation and value within `MaxDifferenceSV`. The hue does not wrap at 0 and 360.
  `ref/shared/LootRules.cs:1898-1937,1911-1918`.
- [Observed] Type 15 reads its palette slots from `ColorXML.SlotDefinitions`. An unknown armor group has an empty
  slot list, so it never matches. `ref/shared/LootRules.cs:2033-2041,2053-2100`.
- [Observed] Type 17 compares the two palettes masked to 24 bits. `ref/shared/LootRules.cs:2306-2315`.
- [Observed] Type 9999 matches only when `b` is false. A disabled rule never matches.
  `ref/shared/LootRules.cs:1823-1826`.
- [Verified] A palette slot past the end of the palettes, or a negative one, gives false. The C# reads
  `id.Palettes[Slot]` and throws on a negative slot. `src/core/eval/match.test.ts`,
  `ref/shared/LootRules.cs:2201-2202`.
- [Verified] Types 1000-1004 and 2000-2008 answer "unknown", as do unsupported raw requirements.
  `src/core/eval/match.test.ts`.
- [Observed] The editor labels the hue difference "Max diff (Hue 0-255)", but `Color.GetHue` gives 0 to 360.
  `ref/shared/LootRules.cs:1988,1887-1895`.
- [Unknown] The JS RegExp engine and .NET Regex agree on the patterns of the shipped profiles. This repo only ran
  the JS engine.
