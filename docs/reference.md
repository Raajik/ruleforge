# Reference sources

- The svn source (`ref/shared`, `ref/editor`, `ref/plugin`) and the shipped binaries (`ref/shipped/VTClassic.dll`,
  `ref/shipped/uTank2 Settings Editor.exe`) are both version 1.0.1.6. **Observed:** `AssemblyInfo.cs` lines 32–35,
  and the UTF-16 version strings in both binaries (`strings -e l`).
- Both binaries are .NET assemblies (PE32, Mono/.Net). **Observed:** `file -b`.
- `ilspycmd` decompiles both binaries. Output from 2026-10-19 is in `/tmp/re/vtclassic-uTank2/`. It is not kept.
- Logic parity between the svn source and the binaries: **Unknown.** A model-written report (commit 882e181) claimed
  parity, but it named a function that does not exist (`GetFileVersion`). The round-trip gate (PLAN.md T15) is the
  real check for the file format.
- `LootRuleCreator.cs` has 31 `case` lines in `ref/decompiled` and 30 in the 2026-10-19 decompile. Cause:
  **Unknown** (maybe a decompiler difference).
