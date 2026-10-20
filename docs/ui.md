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
