# Game data (T16–T17)

The game data never comes from the keyboard. `npm run gen` runs `scripts/gen-gamedata.ts`, which reads the C#
source in `ref/` and writes `src/core/gamedata/generated.ts`. The script fails with an error when a table
pattern changes, so a stale parse stops the build.

- The generator copies five enums: `intValueKey` (114 members), `doubleValueKey` (24), `stringValueKey` (16),
  `objectClass` (43), `vtcSkillID` (49).
  **Observed** `ref/decompiled/VTClassic/IntValueKey.cs:3`, `DoubleValueKey.cs:3`, `StringValueKey.cs:3`,
  `ObjectClass.cs:3`, `VTCSkillID.cs:3`. **Verified** `generated.test.ts` "has the entry count of IntValueKey"
  and its four neighbours.
- `ObjectClass` gives no value for a member. The generator numbers the members from 0 in declaration order:
  `Unknown` is 0 and `Scroll` is 42. **Observed** `ref/decompiled/VTClassic/ObjectClass.cs:3-48`.
  **Verified** `generated.test.ts` "numbers ObjectClass from 0 in declaration order".
- `VTCSkillID` has gaps. Skill 8, 17 and 53 have no member. The values go from `Axe` 1 to `Summoning` 54, and the
  enum has 49 members. **Observed** `ref/decompiled/VTClassic/VTCSkillID.cs:3-54`. **Verified**
  `generated.test.ts` "checks VTCSkillID Axe, MeleeDefense and Summoning".
- `GameInfo.getSetInfo` uses a counter that starts at 32 and drops by one for each entry, so
  "Protective Clothing" is 32 and the last entry, "Noble Relic", is 5. **Observed**
  `ref/shared/Constants.cs:488-517`. **Verified** `generated.test.ts` "checks set info Protective Clothing,
  Soldier's and Noble Relic".
- The generated tables are `setInfo` (28 entries), `skillInfo` (30), `masteryInfo` (11), `materialIds` (72) and
  `materialGroups` (11 groups). **Observed** `ref/shared/Constants.cs:486-576` (the set, skill and mastery
  tables), `Constants.cs:580-664` (the material list), `Constants.cs:695-721` (the groups). **Verified** `generated.test.ts`, the
  "has the entry count of ..." tests.
- `materialNames` is the inverse of `materialIds`, sorted by id. This matches `matNames`, which the C# code
  fills from `matIds` and reads as a `SortedDictionary<int, string>`. **Observed**
  `ref/shared/Constants.cs:658-662`. **Verified** `generated.test.ts` "maps each material id back to its name".
- The generated arrays keep the order of the `.Add` calls in the C# source. The C# tables are
  `SortedDictionary` values, which iterate in key order instead (name for string keys, id for int keys).
  Sort a table in the UI when the legacy editor shows it sorted. **Observed**
  `ref/shared/Constants.cs:486, 522, 559, 578-579, 695`.

## Combo keys (T17)

`src/core/gamedata/combokeys.ts` builds on the generated enums. The generator script does not write it.

- The five "acts on" lists hold the enum member names in culture order, as the C# `Array.Sort` does. Ordinal
  order is different: it puts `DamRating` before `DamageType`. **Observed** `ref/shared/ComboKeys.cs:56-103`.
  **Verified** `combokeys.test.ts` "sorts the names and keeps every member" and "sorts in culture order".
- `indexFromKeyValue` returns -1 for a value that no key has. The C# `List.IndexOf` does the same.
  **Observed** `ref/shared/ComboKeys.cs:109-112`. **Verified** `combokeys.test.ts` "returns -1 for a value
  that no key has".
- `isIdProperty` copies `GameInfo.IsIDProperty`. A StringValueKey is non-ID only for `Name` and
  `SecondaryName`. 28 IntValueKeys are non-ID. The list is in Constants.cs 435-474. `Burden` and `OwnedBy`
  appear there as comments, so they stay ID properties. A DoubleValueKey is non-ID only for
  `ApproachDistance` and `SalvageWorkmanship`. **Observed** `ref/shared/Constants.cs:425-484`.
  **Verified** `combokeys.test.ts`, the three tests in "isIdProperty".
- ObjectClass and VTCSkillID have no ID property. The legacy editor draws them always white. **Observed**
  `ref/shared/ComboKeys.cs:191-198`. **Verified** `combokeys.test.ts` "has no ID property for ObjectClass
  and VTCSkillID".

## Color slots (T17)

`src/core/gamedata/colorslots.ts` parses the slot XML text. The core gets the text from its caller. The
tests read `fixtures/ColorSlots.Default.xml` with `node:fs`.

- The result always has "None" with an empty list. A slotdef tag matches case-insensitively. An entry tag
  and the attribute names match case-sensitively. The parser skips a slotdef as a whole when the
  name is missing or an entry value is bad. A later definition of the same name replaces the first.
  **Observed** `ref/shared/ColorXML.cs:73-117`. **Verified** `colorslots.test.ts`, the "edge cases" tests.
- The shipped default file has 63 slot definitions. The file comments out the two Diforsa definitions. So no
  slot loads them. **Observed** `fixtures/ColorSlots.Default.xml:65-70`. **Verified**
  `colorslots.test.ts` "reads 63 slot definitions from the file" and "ignores the commented-out Diforsa
  definitions".
- The C# loads `ColorSlots.Default.xml` and then `ColorSlots.User.xml`. It looks in the program directory
  and the VTank profile directory. The C# loader skips a file that is not well-formed XML as a whole,
  because `XmlDocument.Load` throws. The TS parser only skips the parts that it cannot match. It does not
  reject a whole file. **Observed** `ref/shared/ColorXML.cs:56-87`. **Verified** the skip tests in
  `colorslots.test.ts`.

## Unknown

- How the legacy editor orders these lists in its own UI. Phase F (T27–T28) reads `Form1.cs` and settles it.
