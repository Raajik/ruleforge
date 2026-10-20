# UI facts (T27+)

- **Observed** (`ref/editor/Form1.Designer.cs` 163-167, 942-947): the main window has a menu bar. Its
  top-level items are File, Edit, Rule and Combine. The toolbar has Copy rule, Paste rule, a search box
  ("Search for rule by name") and Go to next match.
- **Observed** (`ref/editor/Form1.Designer.cs` 354-358, 802-806): the two tabs are "Loot Rules" and
  "Salvage Combination". The Loot Rules tab has the rule list on the left. It has the rule fields and the
  requirement list in the middle, and the requirement fields on the right.
- **Verified** (`src/core/format/enums.test.ts`, `friendlyActionName`): the action combo lists only five names
  in this order: Keep, Salvage, Sell, Read, Keep #. NoLoot and User1-5 have no friendly name and get no combo
  entry (`ref/shared/Constants.cs` 329-364, `ref/editor/Form1.cs` 127-141).
- **Verified** (`src/ui/App.test.tsx`, "a KeepUpTo rule shows its keep count"): the keep-count box is visible
  only when the action is KeepUpTo (`ref/editor/Form1.cs` 127-141).
- **Verified** (`src/ui/App.test.tsx`): `fixtures/LootSnobV4.utl` has 1627 rules, and the rule list shows the
  rule names, one per line (`ref/editor/Form1.cs` 376-379).

## Requirement fields (T28)

- **Observed** (`ref/editor/Form1.cs` 187-291): `SetCurrentReq` shows, per requirement type, an acts-on combo,
  up to four labelled text values and a color sample. No type uses the separate key combo:
  `UI_KeyCombo_Uses` stays false for all of them (`ref/shared/LootRules.cs` 74-79). The editor shows the
  acts-on combo only.
- **Observed** (`ref/shared/LootRules.cs` 337-2862): the text labels come from the `UI_TextValue*_Label`
  overrides. Examples: "Long Value" for types 2, 3, 11, 12 and 13, and "Double Value" for types 4 and 5.
  The fourth field of type 16 shows "Palette Entry #" as its label, but it sets `Slot` (lines 2284-2287).
- **Observed** (`ref/editor/Form1.cs` 171-185): the color sample is a label that shows the requirement color
  in both its fore- and background color. Only the types 14, 15 and 16 show it.
- **Verified** (`src/ui/ReqEditor.test.tsx`): `ReqEditor` shows the acts-on combo, the text values and the
  color sample of a requirement, and every change fires `onChange` with the changed requirement. The acts-on
  combo of type 15 lists the color slot names of `fixtures/ColorSlots.Default.xml` (64 names).
- **Verified** (`src/ui/App.test.tsx`, "clicking a requirement shows its fields"): clicking a requirement in
  the list shows its fields, and typing in a field updates the requirement. The App keeps the edited profile
  in state. The ops of phase E connect in T29.
