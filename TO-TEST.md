# To test by hand

These checks need a real window, a real operating system or a real game. No automated check covers
them. Do each item, then delete it and its line here in the same commit.

1. **Native Open dialog (desktop).** In the installed app, choose File > Open. Pick
   `fixtures/vtclassic_editor_minimal.utl`.
   **Expected:** a native system dialog, filtered to `.utl`, and the rules of the profile appear.
   **Why no check:** the tests run in jsdom and fake the Tauri plugin. A native dialog needs a Tauri
   window, which no test starts.

2. **Native Save and Save As dialog (desktop).** Edit a rule, choose File > Save, then File > Save As
   with a new name.
   **Expected:** Save writes the open file with no dialog. Save As shows a native save dialog and
   writes the file at the chosen path.
   **Why no check:** as item 1, the tests fake `plugin-dialog` and `plugin-fs`.

3. **`.bak` backup (desktop).** Open a profile, edit it and save twice within 5 minutes. Save again
   after 5 minutes.
   **Expected:** the first save writes `<name>.utl.<YYYY-MM-DD-HH-MM>.bak` beside the profile. The
   second save inside the window writes no backup. The save after 5 minutes writes one.
   **Why no check:** the tests prove the file names and the 5-minute clock with a fake fs. Only a real
   run shows that the app can write beside the profile, including on a protected folder.

4. **Installer starts on each OS (Windows, macOS, Linux).** Build with `npm run tauri build`, install
   the package, and open Ruleforge.
   **Expected:** the app opens with no console window and no missing library error. File > Open shows
   the native dialog. The menu and pages work as in the browser build.
   **Why no check:** the release workflow builds the installers but starts no desktop app, and nothing
   in CI can click through a GUI on all three systems.

5. **VTClassic loads a saved profile.** Save a copy of a profile from Ruleforge, then load it in
   VirindiTank in Asheron's Call.
   **Expected:** the looter loads the profile and keeps the rules, with no error.
   **Why no check:** it needs the game and the Decal plugin, which are not part of this repo.

6. **`ColorSlots.User.xml` beside a profile (desktop).** Put a `ColorSlots.User.xml` with a
   `<slotdef name="My Robe (Base)">` in a folder, and a profile beside it. Open the profile, select a
   requirement and pick the type "Armor Type Similar Color".
   **Expected:** the "Armor Type/Color Region" combo lists "My Robe (Base)" after the 63 default groups.
   **Why no check:** the tests fake `plugin-fs`. Only a real run shows that the `fs:scope` entry in
   `src-tauri/capabilities/default.json` lets the app read the file.
