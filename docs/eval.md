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
- [Verified] Unsupported raw requirements answer "unknown". Types 1000-1004 answer "unknown" without a
  `Character`, or when the character has no value for the skill. `src/core/eval/match.test.ts`.
- [Observed] Types 1000 and 1004 read the skill from Decal's CharacterFilter, and type 1001 counts the free main
  pack slots in the game. The editor takes these values from a `Character` input. `ref/shared/LootRules.cs:1240-1255,
  1332-1335,1739-1754`.
- [Observed] A buffed value adds only the Bonus of an item spell, and only when the Bonus is not 0. Blood Drinker
  VI has Change 20 and Bonus 0, so it adds nothing. The "Thirst" and "Impenetrability" cantrips add their Bonus.
  For doubles, a spell whose `(int)Change` is 1 (the Hermetic Link spells) multiplies by its Bonus.
  `ref/plugin/ComputedItemInfo.cs:259-308`.
- [Observed] A buffed value of a key that the item does not have is the default (0), and no spell adds to it.
  `ref/plugin/ComputedItemInfo.cs:266,289`.
- [Verified] The tinked damage of a 50 max damage, 0.2 variance, unimbued item is 84.4344 after 9 tinks (2 granite,
  7 iron). A separate Python copy of the formulas gives the same value. `src/core/eval/computed.test.ts`.
- [Verified] The other computed formulas give the hand-computed numbers: `CalculateDamageOverTime(50, 0.25)` is
  49.375, `BuffedAverageDamage` of a 50 max damage, 0.25 variance item is 43.75, `BuffedMissileDamage` of a 50 max
  damage bow with 1.15 damage bonus is 55, `TotalRatings` of the 8 rating keys 1 to 8 is 36.
  `src/core/eval/computed.test.ts`.
- [Verified] `CanReachTargetValues` spends the tinks on melee defense first, then on attack, then on damage: an item
  with no bonuses reaches melee 0.05 and attack 0.04 in 9 tinks and its damage stays 74.74, so 0.06 melee or 0.05
  attack is out of reach. `src/core/eval/computed.test.ts`, `src/core/eval/match.test.ts`.
- [Observed] The editor labels the hue difference "Max diff (Hue 0-255)", but `Color.GetHue` gives 0 to 360.
  `ref/shared/LootRules.cs:1988,1887-1895`.
- [Unknown] The JS RegExp engine and .NET Regex agree on the patterns of the shipped profiles. This repo only ran
  the JS engine.
