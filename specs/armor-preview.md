# Armor preview: a 3D view of a colour rule

The user picked this "better" feature on 2026-10-24. It adds a view to the editor of a colour requirement. It shows
what armor in that colour looks like, as a stand-in model the user can turn with the mouse.

## Behavior
1. The editor of a requirement of type 14, 15 or 16 shows a 3D view beside its fields. The view updates as the user
   changes the colour, and for type 15 the armor group.
2. The model is a stylized stand-in built in code: simple shapes, no game files, no image or model assets. It is not
   the real Asheron's Call model.
3. **Type 15 (`SlotSimilarColor`, an armor group such as `Amuli Coat (Chest)`):**
   - The view shows the piece that the group names: coat, breastplate, legs, girth, helm, pauldrons, sleeves or
     greaves. A figure wears it so the shape reads as armor.
   - The region in the brackets has the rule's colour. Every other region of the piece is a neutral grey.
   - The group-to-piece-and-region map covers all 63 slot definitions of `fixtures/ColorSlots.Default.xml`. A
     pattern region (Veins, Stripes, Lines, Bumps, Ornaments, Hilight, Circle) shows as stripes or studs on the
     piece. A group that is not in the map, for example one from a user's own slot file, shows the piece type by
     its name if it can, otherwise the generic suit, with the whole piece in the colour.
4. **Type 14 (`AnySimilarColor`) and type 16 (`SimilarColor` in a slot number):** the rule names no armor, so the
   view shows a generic suit with every region in the colour. Type 16 adds a note: "Slot N: the region depends on
   the armor."
5. **Type 17 (a palette id) and every other type:** no view. A palette id has no RGB value without the game files.
6. **Turning:** drag to turn the model around its upright axis. The view starts at a three-quarter front angle.
   No zoom, no pan. Keyboard: the left and right arrow keys turn it while the view has focus.
7. The view has a text alternative for screen readers: the piece, the region and the colour as hex, for example
   "Amuli Coat, Chest in #3060C0".
8. The colour is the rule's R, G, B as written. The view does not show the hue and S/V tolerance.
9. **Randomize (user pick, 2026-10-24).** A Randomize button rolls a look for the rest of the piece, the way the game
   colours loot armor: it picks one palette template and one shade (0 to 1), and every region takes its colour from
   that pair (ACE `LootGenerationFactory.MutateColor`). Regions are not rolled one by one.
   - **With game files:** the user can point Ruleforge at the `client_portal.dat` of their own Asheron's Call
     install. Ruleforge then reads the piece's real `ClothingTable` and palettes from it: only templates that piece
     can roll, with their real colours. A roll keeps only looks where the rule's region matches the rule (the same
     similar-colour test as the loot preview), and shows one of them at random. When no template and shade of that
     piece matches, the view says so: "This armor never rolls this colour in <region>."
   - Exact looks need a piece, so they apply to type 15 only, and only to a piece whose `ClothingTable` id is known
     (`docs/gamedata.md`). Types 14 and 16, and a piece without a known id, use the approximate roll.
   - A region's colour is the example colour of its palette slot, the colour that the similar-colour test reads:
     the palette entry in the middle of the slot's range (`docs/gamedata.md`).
   - The game also weighs templates by the item's material (a table in ACE's world database, not in the game files).
     Ruleforge has no material, so it rolls each template of the piece with equal weight. The docs say so.
   - **Without game files:** the roll picks a named template from a fixed list (the names of ACE's palette
     templates) with hand-tuned colours, and a random shade. The rule's region keeps the rule's colour. A note says
     the colours are approximate.
   - The text alternative names the template and shade, for example "Amuli Coat, Chest in #3060C0, rolled as
     AquaBlue at shade 0.42".
10. **The game files stay on the user's machine.** Ruleforge never copies, uploads or bundles them. The browser
    reads byte ranges of the picked file (`Blob.slice`); the desktop app reads ranges of the file at the path picked
    in its native dialog. The desktop app keeps the path for the session, because the dialog grants access to the
    file for the session only. Nothing is read until the user picks the file. A missing or unreadable file falls back
    to the approximate roll with a short message.
11. **Parity fixes found while testing (user pick, 2026-10-24):**
    - The requirement editor has a type picker that calls `setRequirementType` (legacy: changing the requirement
      type). Today no control changes a requirement's type.
    - The armor group list of type 15 is filled from `ColorSlots.Default.xml`, bundled with the app, in both builds.
      The desktop app also reads `ColorSlots.User.xml` from the folder of the open profile, after the default
      file, as the C# reads it from the VTank profile folder (`ref/shared/ColorXML.cs`). Ruleforge has no profile
      folder setting, and the folder of an open `.utl` file is where VTank keeps its profiles. Today both builds pass
      no list, so the dropdown only offers "None".

## Constraints
- Ruleforge is MIT. gyre (AGPL-3.0, from webAC) and ACE (AGPL-3.0) may be read to learn the file format and the
  colour roll, but no code is copied from either. The DAT reader is written new, from the format, in `src/core/`
  (no DOM: it reads through a byte-range function the caller gives it), with tests on crafted bytes. Tests that need
  the real DAT skip when it is missing.
- The DAT reader guards against corrupt files: no cycle or size it reads can make it loop, recurse without bound or
  allocate more than the file holds.
- three.js renders it, one new dependency. The core (`src/core/`) gets no three.js and no DOM: the group-to-piece
  map and the colour logic are pure functions in the core, with tests. The three.js code sits in `src/ui/`.
- The three.js code loads only when a colour requirement is open (a dynamic import), so the first page load does not
  grow by the size of three.js.
- The WebGL context is released when the view closes. A browser without WebGL shows the text alternative instead
  of the view.
- The view works in the browser build and in the Tauri app.

## Out of scope
- Real models and textures from the game files (the colours come from them; the shapes stay stand-ins).
- Zoom, lighting controls, other camera moves, a picker that edits the colour from the view.
- Weighting templates by material.
- The loot preview tab.

## Done when
- The core map has a test that every slot definition of `fixtures/ColorSlots.Default.xml` maps to a piece and a
  region, and tests for the type 14, 15, 16 and unknown-group cases.
- A UI test checks that a type 15 requirement shows the view with the right text alternative, that type 17 shows
  none, and that a colour change updates the text.
- `npm test`, `npm run typecheck` and `npm run build` pass, and the initial bundle has no three.js in it.
- Tests for the roll: a crafted `ClothingTable` and palettes give only matching looks, the "never rolls" message, and
  the approximate fallback. The DAT reader has tests for each guard.
- With the real `client_portal.dat` (see the user's AC install; skip when absent), a roll for `Amuli Coat (Chest)`
  in a colour the coat can roll shows a matching look, and one it cannot roll shows the message.
- The type picker and the bundled armor group list have UI tests, and a new type 15 rule can be made from scratch in
  the UI.
- The 3D figure is centred in the view with the head fully visible.
- A screenshot from a real browser shows a type 15 rule from `fixtures/LootSnobV4.utl` or a new rule, with the
  region in its colour, before and after a turn.
