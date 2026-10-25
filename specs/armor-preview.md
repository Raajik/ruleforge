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

## Constraints
- three.js renders it, one new dependency. The core (`src/core/`) gets no three.js and no DOM: the group-to-piece
  map and the colour logic are pure functions in the core, with tests. The three.js code sits in `src/ui/`.
- The three.js code loads only when a colour requirement is open (a dynamic import), so the first page load does not
  grow by the size of three.js.
- The WebGL context is released when the view closes. A browser without WebGL shows the text alternative instead
  of the view.
- The view works in the browser build and in the Tauri app.

## Out of scope
- Real models, textures and palettes from the game files.
- Zoom, lighting controls, other camera moves, a picker that edits the colour from the view.
- The loot preview tab.

## Done when
- The core map has a test that every slot definition of `fixtures/ColorSlots.Default.xml` maps to a piece and a
  region, and tests for the type 14, 15, 16 and unknown-group cases.
- A UI test checks that a type 15 requirement shows the view with the right text alternative, that type 17 shows
  none, and that a colour change updates the text.
- `npm test`, `npm run typecheck` and `npm run build` pass, and the initial bundle has no three.js in it.
- A screenshot from a real browser shows a type 15 rule from `fixtures/LootSnobV4.utl` or a new rule, with the
  region in its colour, before and after a turn.
