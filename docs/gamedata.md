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

## Unknown

- How the legacy editor orders these lists in its own UI. Phase F (T27–T28) reads `Form1.cs` and settles it.
