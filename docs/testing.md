# Tests and release checks

Facts about the fake Tauri modules, the release gate, the manual checks and the commit hook.

- **Verified**: One fake for the Tauri modules is `src/test/fakeTauri.ts`. It covers `isTauri` (sync,
  boolean), `open` and `save` (async, string or null), and `readTextFile` and `writeTextFile` (async).
  The types are `typeof` the installed packages, so a changed call name or shape fails
  `npm run typecheck`. Both tests that mock Tauri import it. Test: `npm test` (40 files, 613 tests) and
  `npm run typecheck` pass on 2026-10-21; `src/ui/desktopio.test.ts` and `src/ui/App.desktop.test.tsx`
  use `fakeTauri`.
- **Observed**: Every test file that mocks a Tauri module calls `vi.mock` with a factory that imports
  `coreMock`, `dialogMock` or `fsMock` from `src/test/fakeTauri.ts`. Source: `src/ui/*.test.ts*`.
- **Observed**: The release workflow runs `npm test` before `tauri-apps/tauri-action@v0` in each matrix
  job, so a failed test stops every installer. Source: `.github/workflows/release.yml`.
- **Observed**: `TO-TEST.md` lists the checks that only the user can do: the native dialogs, the `.bak`
  backup, the installers on each OS and a profile loaded in VTClassic. Each item has its expected result
  and why no automated check covers it.
