# File format facts for the VTClassic UTL format.

## Format

### Traps / known differences from JS
- [Verified] `CountedStreamWriter` counts UTF-16 code units via `string.Length`. `string.Length`. Same as JS `string.length`. See: `ref/shared/CountedStreamWriter.cs`
- [Verified] .NET Framework writes a double as "G15": 15 significant digits, then trailing zeros removed. Scientific notation (`1E-05`, `1.5E+20`) when the exponent is below -4 or 15 and above. Test: `src/core/format/doubles.test.ts`, "against .NET G15 output" (values from a real `dotnet run`).
- [Verified] JS `String(x)` differs from .NET even for normal values: `1/3` gives `0.3333333333333333` in JS and `0.333333333333333` in .NET. Test: same file.
- [Verified] `CountedStreamWriter.Write(double)` uses `Convert.ToString(x, InvariantCulture)`. C# `Write(double)` uses `Convert.ToString`. See: `ref/shared/CountedStreamWriter.cs`

### Profile and rule records
- [Observed] A version 0 file starts with the rule count. A version 1 file starts with `UTL`, the version number, then the rule count. `ref/shared/LootRules.cs:3140-3155`.
- [Observed] A version 1 file prefixes each requirement body with its character count. A version 0 file has no prefix. `ref/shared/LootRules.cs:2976-2999`.
- [Observed] An unknown requirement is skipped by its count and kept as raw characters. `ref/shared/LootRules.cs:2987-2992`.
- [Observed] The writer always saves version `MAX_PROFILE_VERSION` (1), whatever the input version was. `ref/shared/LootRules.cs:3181`.
- [Observed] Extra blocks after the rules are `typeId`, `length`, then `length` raw characters. `ref/shared/UTLFileExtraBlockManager.cs:94-120`.
- [Verified] `readProfile` then `writeProfile` gives the same bytes for `vtclassic_editor_minimal.utl`, `vtclassic_editor_rich.utl`, `BuffedLongBuffedDouble.utl` and `UnfamilarShores.utl`, with types 0 and 1 parsed and the other types still raw. Test: `src/core/format/profile.test.ts`.

### Requirement types
- [Observed] Type 0 `SpellNameMatch` reads one line as the regex pattern (`inf.ReadLine()`) and writes it back as one line. The pattern stays text. `ref/shared/LootRules.cs:313,318`.
- [Observed] Type 1 `StringValueMatch` reads two lines. The first line is the pattern. The second line is the `StringValueKey` number (`Convert.ToInt32`). It writes them back with `Convert.ToString((int)vk, InvariantCulture)`, so the key is base 10. `ref/shared/LootRules.cs:379-386`.
- [Verified] A type 0 body is `pattern + CRLF`. A type 1 body is `pattern + CRLF + key + CRLF`. Both bodies round-trip through their length prefix. Test: `src/core/format/profile.test.ts`, "requirement type 0, SpellNameMatch" and "requirement type 1, StringValueMatch".
