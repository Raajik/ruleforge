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

- Both builds bundle `fixtures/ColorSlots.Default.xml` (`src/ui/colorSlots.ts`, a Vite `?raw` import) and pass its
  definitions to the App, so the type 15 combo lists "None" and the 63 default groups. **Verified**
  `src/ui/App.test.tsx` "makes a new type 15 rule from scratch with the bundled armor groups".
- `parseColorSlots(xml, into)` reads a second file over the first, as the C# reads both files into one dictionary:
  a name in both takes the later list, a new name goes at the end. **Verified** `colorslots.test.ts` "replaces a
  default definition, appends a new one and keeps the input map".
- The desktop app reads `ColorSlots.User.xml` from the folder of each profile it opens, over the bundled default
  file. A missing or unreadable file leaves the default groups. This stands in for the C# read from the VTank
  profile folder; Ruleforge has no profile folder setting. **Verified** `src/ui/App.desktop.test.tsx`, the two
  "ColorSlots.User.xml" tests, with a fake fs. **Unknown** whether the `fs:scope` entry lets the real app read
  the file (`TO-TEST.md`).

## Armor preview map (H4 armor preview)

`src/core/gamedata/armorpreview.ts` maps a colour requirement to a stand-in piece, the parts in the colour and
a text alternative (`specs/armor-preview.md`). The pieces and their parts are made up for the stand-in model.
They are not the game's models or palette slots.

- Every one of the 63 slot definitions of the default file has a map entry: a piece named by the group, the
  region from its brackets, and parts that exist on that piece. A region with a pattern word (Veins, Stripes,
  Lines, Bumps, Ornaments, Hilight, Circle) gets stripes or studs. **Verified** `armorpreview.test.ts`, the
  "maps %s to a piece and the region in its brackets" tests.
- "Celdon (Base)" and "Celdon (Veins)" name no piece. The map shows them on the breastplate. **Unknown** which
  Celdon piece the game uses these slots for; the slots may fit all of the set.
- A group that is not in the map shows the piece its name names, or the generic suit, with every part in the
  colour. Types 14 and 16 show the generic suit. Type 16 adds "Slot N: the region depends on the armor."
  Type 17 gets no view. **Verified** `armorpreview.test.ts`, "armorGroupView on a group that is not in the
  map" and "armorView".
- The preview colour is `#RRGGBB` from R, G and B, each channel kept in 0-255. **Verified**
  `armorpreview.test.ts`, "colorHex".

## Game files: the armor preview roll (specs/armor-preview.md items 9-10)

`src/core/dat/` reads the user's own `client_portal.dat` through ranged reads. It was written new from the format;
ACE (`ACE.DatLoader`) and gyre (`docs/dat-parser.md`) were read to learn the format, and no code was copied.
`src/core/gamedata/armorroll.ts` rolls a look from what it reads. The tests use crafted bytes
(`src/test/craftDat.ts`); no game data is in the repo.

- The container: a header at 0x140 gives the block size (4 bytes in) and the offset of the root directory node
  (32 bytes in). A file or a node is a chain of blocks; the first 4 bytes of a block point to the next block, 0 ends
  the chain. A node is 62 branch offsets, an entry count and 61 entries of 24 bytes (flags, id, offset, size, date,
  iteration), sorted by id; a node whose first branch is 0 is a leaf. **Observed** ACE
  `Source/ACE.DatLoader/DatDatabase.cs`, `DatDatabaseHeader.cs`, `DatDirectory.cs`, `DatDirectoryHeader.cs`,
  `DatFile.cs`, `DatReader.cs`. **Verified** `src/core/dat/archive.test.ts`, "openDat on a good file", and
  `realdat.test.ts` on the real file (block size 1024).
- The reader stops a corrupt file with a `DatError`: a block chain that loops (to itself or back after some blocks),
  a block outside the file, a chain that ends early, a file size larger than the file's blocks can hold (checked
  before the buffer is made), a node with more than 61 entries, a directory cycle and a directory deeper than 16
  nodes. **Verified** `archive.test.ts`, "openDat guards".
- A ClothingTable (0x10xxxxxx) is an id, the base effects (a u16 count, a u16 bucket size, then per entry a key and
  a list of model and texture swaps), then the palette templates in the same hash table shape: per template a key
  (the PaletteTemplate id), an icon and a list of sub-palettes, each a list of ranges (offset and count, in palette
  entries) and a PaletteSet id. A PaletteSet (0x0F) and a Palette (0x04) are an id, an int32 count and that many
  uint32s: palette ids, or colours as 0xAARRGGBB. **Observed** ACE `FileTypes/ClothingTable.cs`,
  `FileTypes/PaletteSet.cs`, `FileTypes/Palette.cs`, `Entity/CloSubPalEffect.cs`, `Entity/CloSubPalette.cs`,
  `Entity/CloSubPaletteRange.cs`, `UnpackableExtensions.cs` 108-184. **Verified** `src/core/dat/clothing.test.ts`,
  and `realdat.test.ts` "finds a ClothingTable for every piece of the map". Every count is checked against the bytes
  left. **Verified** `clothing.test.ts`, "throws a DatError ..." and "throw on a count larger ...".
- **A VTClassic slot number is the index of a sub-palette range of the item's palette template, counting the ranges
  of all its sub-palettes in file order.** The item's palettes are its ObjDesc sub-palettes: ACE adds one per range,
  in that order, with the palette that the sub-palette's PaletteSet gives at the item's shade
  (**Observed** ACE `ACE.Server/WorldObjects/WorldObject_Networking.cs` 955-970), and VTClassic reads
  `id.Palettes[i]` by slot (**Observed** `ref/shared/LootRules.cs` 2053-2100). The real Amuli Coat table
  (0x100001A1) has 8 ranges, in sub-palettes of 1, 2, 2, 1, 1 and 1, and its slot file groups are Chest 0,
  Collar/Shoulder 1-2 and Arms/Trim 3-7. Every default group's slots fit its piece's ranges, but two.
  **Verified** `realdat.test.ts`, "fits the slots of every default group in its piece, but two".
- The example colour of a slot (`PaletteData.ExampleColor`, which the similar-colour test reads) is the palette entry
  in the middle of the range: `palette[offset + count / 2]`. VirindiTank is closed source, so this is an inference:
  of 23 target colours in a corpus of profiles, 21 are exactly that entry of a palette and range a ClothingTable can
  put on an item. **Observed** gyre `docs/vtank-formats.md` line 326 (the inference and its evidence, not code).
- The shade picks the palette of a PaletteSet with `trunc((count - 0.000001) * shade)`, kept in the list.
  **Observed** ACE `FileTypes/PaletteSet.cs` (`GetPaletteID`, from the client). **Verified** `armorroll.test.ts`,
  "copies PaletteSet.GetPaletteID".
- On the real Amuli Coat, shade 0 is the darkest palette: the Red template's chest is #620307 at shade 0, #80050B at
  0.5 and #F00000 at 0.999. The approximate roll darkens at low shades to match. **Observed** a ranged-read probe
  of the real `client_portal.dat`, 2026-10-24.
- ACE's loot roll (`MutateColor`) keeps the templates of the material's colour table that the ClothingTable has,
  picks one weighted by the table's probability, then a shade uniform in 0 to 1. **Observed** ACE
  `ACE.Server/Factories/LootGenerationFactory.cs` 535-616. The material table is in ACE's world database, not the game
  files, and Ruleforge has no material, so the exact roll weighs every template of the piece the same. A look is a
  template and a shade range in which the region's palettes stay the same; the roll picks one by its length, which
  is the game's chance with equal template weights, given that the look passes the rule. **Verified**
  `armorroll.test.ts`, "gives only looks whose rule region matches" and "pickSpan".
- The match test is the evaluator's similar-colour test on each slot of the rule's group (`matchRequirement` type 16
  per slot; type 15 passes when any of its slots does). **Verified** `armorroll.test.ts` and
  `src/core/dat/looks.test.ts` on a crafted DAT.
- With the real file, `Amuli Coat (Chest)` at #F00000 (hue 10, S/V 0.1) rolls a look whose chest passes the rule, and
  #FF00FF gives "This armor never rolls this colour in Chest." The first roll took 139 ranged reads. **Verified**
  `realdat.test.ts` (it skips when the file is missing), 2026-10-24.
- The ClothingTable of each piece is the `ClothingBase` (DID 7) of the piece's weenie in ACE's world data
  (**Observed** `ACE-World-16PY-0.8.8/.../9 WeenieDefaults/SQL/Clothing/Armor/` and the newer
  `ACE-World-16PY-Patches-0.9.293/.../Clothing/Armor/`, which wins where both have the weenie):
  Amuli Coat 0x100001A1 (6046), Amuli Legs 0x100001A0 (6047), Celdon 0x10000188 (Celdon Breastplate, 6044),
  Chiran Coat 0x1000053D (27215), Chiran Legs 0x10000540 (27218), Chiran Helm 0x10000541 (27217), Haebrean BP
  0x100007A5 (42749), Haebrean Girth 0x100007A7 (42751), Haebrean Helm 0x100007A9 (42753), Haebrean Pauldrons
  0x100007AA (42754), Lorica BP 0x10000547 (27221), Lorica Legs 0x10000545 (27224), Nariyid BP 0x1000054B (27227),
  Nariyid Girth 0x10000548 (27229), Nariyid Sleeves 0x10000549 (27232), Olthoi BP 0x1000071B (37216), Olthoi
  Alduressa Legs 0x10000739 (37200), Olthoi Amuli Coat 0x1000072C (37299), Olthoi Amuli Legs 0x1000072B (37201),
  Olthoi Koujia Kabuton 0x10000732 (37198), Olthoi Koujia Legs 0x10000734 (37203), Scalemail Cuirass 0x100000A1 (52),
  Tenassa Legs 0x100005C1 (28622), Tenassa BP 0x100005CA (31026), Yoroi Cuirass 0x100000A3 (54), Yoroi Girth
  0x10000047 (64).
- **Unknown** which Celdon piece the "Celdon" groups mean; the breastplate's 3 ranges fit their slots 0-2.
  **Unknown** whether "Olthoi BP" means the Olthoi heritage breastplate (37216, 0x1000071B) or the older Olthoi
  Breastplate (24617, 0x100004B2); both have 2 ranges. The map takes the heritage one, as the other Olthoi groups
  name heritage pieces.
- **Unknown** whether the slot file or the ClothingTable is wrong for "Nariyid Girth (Ornaments)" (slot 3; the
  girth has 3 ranges) and "Olthoi Amuli Legs (Trim)" (slots 6-8; the leggings have 6). These two regions, a group of
  a user's own slot file without a known piece, and types 14 and 16 use the approximate roll.
- The approximate roll's template colours are hand-tuned, not read from the game files.

## Unknown

- How the legacy editor orders these lists in its own UI. Phase F (T27–T28) reads `Form1.cs` and settles it.
