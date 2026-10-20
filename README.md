# Ruleforge

Ruleforge edits `.utl` loot profiles for the VTClassic looter, a Decal plugin for Asheron's Call. It is a
cross-platform rebuild of the Windows-only VTClassic loot editor ("uTank2 Settings Editor" 1.0.1.6).

- It reads and writes `.utl` files byte for byte, the same as the legacy editor. A test checks this on 8 real
  profiles.
- It has all 31 requirement types, the salvage combine settings and the legacy editor's macros.
- It runs in a browser. A Tauri desktop build is next.

## Use it

```sh
npm install
npm run dev
```

Open the URL that Vite prints. In Chrome, Save writes back to the open file. In other browsers, Save downloads
the file.

Use a copy of your profile until you trust the editor.

## Develop

```sh
npm test           # unit tests
npm run typecheck
npm run build
npm run gen        # regenerate src/core/gamedata/generated.ts (needs ref/)
```

- `specs/ruleforge.md`: what the editor must do.
- `docs/`: facts about the file format and the legacy editor, each tagged Verified, Observed or Unknown.
- `ref/`: links to the VTClassic C# source. They work only on the author's machine. You need them only for
  `npm run gen`.

## License

MIT. Ruleforge is a port of VTClassic, Copyright (c) 2009-2010 VirindiPlugins, which uses the MIT license. See
`LICENSE`.
