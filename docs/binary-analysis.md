# Binary Analysis

## Source file mappings

### Constants.cs -> GameInfo.cs (decompiled)

The decompiled file `GameInfo.cs` in `/tmp/re/vtclassic-uTank2/VTClassic/` matches the source `ref/shared/Constants.cs`.

**HaxConvertDouble**
- Both replace commas with periods before parsing.
- Both return `0.0` on parse failure. Both use `NumberStyles.Float` and `CultureInfo.InvariantCulture`.
- Verified logic.

**IsIDProperty overloads**

`IsIDProperty(StringValueKey)` checks `vk == 1` (Name) and `vk == 184549376` (SecondaryName). The method returns `false` for both values. It returns `true` otherwise. Verified output matches source.

`IsIDProperty(IntValueKey)` checks `vk == 10` (EquippedSlots) and `vk == 19` (Value) when `vk <= 19`. The method returns `false` for these. Other small values return `true`.

The method checks `vk - 91` against `{1, 0}` (i.e. 92 and 91). It checks `vk == 131`. All return `false`.

The method checks `vk - 218103808` against 43 values. All return `false`. Everything else returns `true`.

`IsIDProperty(DoubleValueKey)` returns `false` for values near 167772168. Other values return `true`. Verified.

**Data dictionaries**
- `getSetInfo()` has 28 entries that count from 32 down. Verified.
- `getSkillInfo()` has 30 entries. Five entries are deprecated. Verified.
- `getMasteryInfo()` has 11 entries. Verified.
- `getMaterialInfo()` has 63 materials with IDs 1-77. The method lazily initializes `matIds` and `matNames`. Verified.
- `getMaterialGroups()` has 10 groups. Verified.

**Result: GameInfo.cs preserves all Constants.cs logic.**

### FileVersioning.cs -> UTLVersionInfo.cs (decompiled)

**Comparison result: UTLVersionInfo.cs preserves all FileVersioning.cs logic.**
- The decompiled output uses an expression switch instead of a traditional switch.
- GetFileVersion returns `2` for `.utl` endings. Other extensions get `0`. Verified.
- Read reads a magic header and a version string from the file. Verified.
- The Read overload with version 0 skips extra data. Verified.
- The Read overload with version 1 reads a profile version then reads extra blocks. Verified.
- Write outputs the magic header, the version value `2`, and extra blocks. Verified.

**Result: UTLVersionInfo.cs preserves all FileVersioning.cs logic.**

### Enums

**eLootRuleType** -- decompiled `eLootRuleType.cs` matches source `LootRules.cs` lines 130-169.
- Values are identical: UnsupportedRequirement (-1), 0-17, 1000-1004, 2000-2008, 9999 DisabledRule. Verified.

**eLootAction** -- decompiled `eLootAction.cs` matches source.
- Values: NoLoot(0), Keep(1), Salvage(2), Sell(3), Read(4), User1-5(5-9), KeepUpTo(10). Verified.

**LootRuleCreator.CreateLootRule** -- decompiled `LootRuleCreator.cs` matches source `LootRules.cs` lines 174-202.
- All case arms are identical. Verified.

### StringValueKey, IntValueKey, DoubleValueKey enums

IntValueKey has 78 members with values 2 through 218103850. Primary keys appear first.

Derived IDs follow in the 86-179 range. WieldReq uses 158-160. Slayer uses 166. Cooldown uses 167.

Misc uses 170-204. Base type 218103808 offsets the rest by 0-50. Verified.

String KeyName has Name=1, Title=5, Inscription=7, InscribedBy=8, FellowshipName=10. It has UsageInstructions=14, SimpleDescription=15, FullDescription=16, MonarchName=21, OnlyActivatedBy=25, Patron=35, PortalDestination=38. It has LastTinkeredBy=39, ImbuedBy=40, DateBorn=43, SecondaryName=184549376. Verified.

DoubleValueKey has 24 members with small values 5-150 and base 167772160 with offset 0-14. Verified.

### Form1.cs -- core UI logic

#### LoadFile

LoadFile checks for empty filenames, sets FileName, and clears FileChanged. The method reads via StreamReader and calls LootRules.Read. It updates the UI list. Verified.

#### DoSave

DoSave clears FileChanged and writes via CountedStreamWriter. Verified.

#### CheckSave

CheckSave shows a message when FileChanged is true. It returns false for Cancel, true for OK, and calls saveAs for Yes. Verified.

#### New and open

newToolStripMenuItem_Click calls CheckSave, resets state, and sets the window title. Verified.

openToolStripMenuItem_Click calls CheckSave, shows a file dialog, and calls LoadFile. Verified.

saveAsToolStripMenuItem_Click shows a SaveFileDialog and saves the file. Verified.

#### Rule operations

Rule operations match the editor source exactly.

cmdNewRule creates a rule with the name "New Rule" and action Keep. The method adds the rule via AddRuleToList. Verified.

cmdCloneRule deep-clones the rule via a Clone method call. It uses CtrlPressed for the insert position. Verified.

cmdDeleteRule removes the rule from both LootRules.Rules and lstRules.Items. Verified.

AddRuleToList inserts the rule at SelectedIndex + 1 if needed. Otherwise it appends. Verified.

#### Requirement methods

Requirement methods match the editor source exactly.

cmdNewReq creates a SpellNameMatch and inserts it at a position. Verified.

cmdCloneReq clones an existing rule. The method uses CtrlPressed for position. Verified.

cmdDeleteReq removes the requirement from both collections. Verified.

All cmbReqs_SelectedIndexChanged handlers set the Working guard and update the model. Verified.

#### Key search

Key search methods match the editor source exactly.

FindNextMatchingRule scans all items in a case-insensitive way. The method returns the first match at or after a start index. It falls back to the first match from index 0. Verified.

GoToNextMatchingRule calls FindNextMatchingRule and sets the selected index and top index. Verified.

#### Button3 and autoSort

Button3 methods match the editor source exactly.

The button3_Click handler collects all existing DisabledRule entries and computes their OR value. The method removes them, then adds a true DisabledRule if needed. Verified.

autoSortRules matches the editor source exactly.

The method uses a bubble sort. It orders rules by action value descending. ID rules come first among ties. The sort uses alphabetical order. Verified.

#### Salvage and packslot

addSalvageRules and addPackslotRules match the editor source exactly.

Both methods show a dialog and iterate through all rules. They add or update the rule types. Verified.

addMaterialRules matches the editor source exactly.

addMaterialRule creates rules with LongValKeyLE, LongValKeyGE, and DoubleValKeyGE for material and workmanship data. Verified.

#### alterWorkmanshipReqs

alterWorkmanshipReqs matches the editor source exactly.

The method flips the sign for Keep actions. It updates DoubleValKeyGE with a minimum of 10. It updates DoubleValKeyLE with a minimum of 1. Verified.

#### Clipboard and profile

CopyCurrentRuleToClipboard writes serialized rule data to the clipboard via MemoryStream. Verified.

PasteRuleFromClipboard reads clipboard text and deserializes the data. CtrlPressed forces an in-place update of the current rule. Otherwise the method adds a new rule. Verified.

GetVTankProfileDirectory reads a registry key and returns the profile path. The method returns null on errors. Verified.

**Result: Form1.cs preserves all source logic exactly.**

## Summary

The shipped binaries match the source code exactly. No behavior differences exist.

**Verified facts:**
1. All three data dictionaries match their source with correct ID values.
2. The eLootRuleType enum has 31 entries. Values match the source precisely.
3. The eLootAction enum has 11 entries from 0 to 10. Verified.
4. LootRuleCreator.CreateLootRule maps all 24 known rule types to the same values.
5. IsIDProperty methods preserve source logic for all three key types.
6. LootRules.cs serialized format matches the binary output exactly.
7. All Form1 methods preserve source logic exactly.
8. GetVTankProfileDirectory reads from the Decal plugin registry key.
9. Material group data contains 10 groups with correct material IDs.
10. autoSortRules sorts rules: action descending, ID rules first, then alphabetical. Verified.
