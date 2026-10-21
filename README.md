# Ruleforge

Ruleforge edits `.utl` loot profiles for the VTClassic looter, a Decal plugin for Asheron's Call. It is a
cross-platform rebuild of the Windows-only VTClassic loot editor ("uTank2 Settings Editor" 1.0.1.6).

- It reads and writes `.utl` files byte for byte, the same as the legacy editor. A test checks this on 8 real
  profiles.
- It has all 31 requirement types, the salvage combine settings and the legacy editor's macros.
- It runs in a browser, and as a Tauri desktop app with native open and save dialogs.

## Use it

```sh
npm install
npm run dev
```

Open the URL that Vite prints. In Chrome, Save writes back to the open file. In other browsers, Save downloads
the file.

### Desktop app

```sh
npm run tauri build      # installers in src-tauri/target/release/bundle
npm run tauri build -- --no-bundle   # the binary alone, at src-tauri/target/release/ruleforge
```

The desktop app uses native Open and Save dialogs, and writes a `.bak` copy of a saved profile at most once
each 5 minutes. Rust and the Tauri system packages are needed (see `PLAN.md` T32).

Use a copy of your profile until you trust the editor.

## Develop

```sh
npm test           # unit tests
npm run typecheck
npm run build
npm run gen        # regenerate src/core/gamedata/generated.ts (needs ref/)
npm run tauri dev  # the desktop app; it opens a window
```

- `specs/ruleforge.md`: what the editor must do.
- `docs/`: facts about the file format and the legacy editor, each tagged Verified, Observed or Unknown.
- `ref/`: links to the VTClassic C# source. They work only on the author's machine. You need them only for
  `npm run gen`.

### Commit hook

`tools/githooks/commit-msg` refuses a commit that changes `src/` without a test change in the same
commit. Docs and config pass. A change that truly needs no test passes with `[skip-tests]` in the
message.

On the user's boxes the global hook dispatcher (`~/.config/git/hooks/dispatch`) runs it by itself.
Do not set `core.hooksPath` in this repo: that would skip the global email guard. On another machine,
link it once: `ln -s ../../tools/githooks/commit-msg .git/hooks/commit-msg`.

- `specs/ruleforge.md`: what the editor must do.
- `docs/`: facts about the file format and the legacy editor, each tagged Verified, Observed or Unknown.
- `ref/`: links to the VTClassic C# source. They work only on the author's machine. You need them only for
  `npm run gen`.

## License

MIT. Ruleforge is a port of VTClassic, Copyright (c) 2009-2010 VirindiPlugins, which uses the MIT license. See
`LICENSE`.
