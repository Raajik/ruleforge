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
- [Verified] `readProfile` then `writeProfile` gives the same bytes for `vtclassic_editor_minimal.utl`, `vtclassic_editor_rich.utl`, `BuffedLongBuffedDouble.utl` and `UnfamilarShores.utl` with types 0 and 1 parsed and the other types still raw. Test: `src/core/format/profile.test.ts`.

### Requirement types
- [Observed] Type 0 `SpellNameMatch` reads one line as the regex pattern (`inf.ReadLine()`) and writes it back as one line. The pattern stays text. `ref/shared/LootRules.cs:313,318`.
- [Observed] Type 1 `StringValueMatch` reads two lines. The first line is the pattern. The second line is the `StringValueKey` number (`Convert.ToInt32`). It writes them back with `Convert.ToString((int)vk, InvariantCulture)`, so the key is base 10. `ref/shared/LootRules.cs:379-386`.
- [Verified] A type 0 body is `pattern + CRLF`. A type 1 body is `pattern + CRLF + key + CRLF`. Both bodies round-trip through their length prefix. Test: `src/core/format/profile.test.ts`, "requirement type 0, SpellNameMatch" and "requirement type 1, StringValueMatch".
- [Observed] Types 2 (`LongValKeyLE`), 3 (`LongValKeyGE`), 11 (`LongValKeyFlagExists`), 12 (`LongValKeyE`) and 13 (`LongValKeyNE`) all read two lines: `keyval` as `Convert.ToInt32`, then `vk` as `Convert.ToUInt32` cast to `IntValueKey`. They write the same two lines with `Convert.ToString(..., InvariantCulture)`, so both are base 10. `ref/shared/LootRules.cs:454-461,571-578,1187-1194,1412-1419,1529-1536`.
- [Verified] A type 2, 3, 11, 12 or 13 body is `keyval + CRLF + vk + CRLF`. All five types round-trip through their length prefix, a negative keyval keeps its sign, and the real examples in `IAC_Level_NoCash.utl` parse to `{keyval, vk}` pairs. Test: `src/core/format/profile.test.ts`, "requirement type 2, LongValKeyLE" through "requirement type 13, LongValKeyNE".
- [Verified] `readProfile` then `writeProfile` gives the same bytes for all 8 fixtures, with types 0 to 13 parsed and the other types still raw. Test: `src/core/format/profile.test.ts`, "round-trips the fixtures byte for byte".
- [Observed] Types 4 (`DoubleValKeyLE`) and 5 (`DoubleValKeyGE`) read `keyval` with `GameInfo.HaxConvertDouble`, then `vk` as `Convert.ToUInt32` cast to `DoubleValueKey`. Types 6 (`DamagePercentGE`) and 10 (`MinDamageGE`) read only the `keyval` line. All four write `keyval` with `Convert.ToString(keyval, InvariantCulture)`. `ref/shared/LootRules.cs:686-696,761-771,827-835,1119-1127`.
- [Observed] `HaxConvertDouble` changes `,` to `.`, then calls `double.TryParse` with `NumberStyles.Float` and `InvariantCulture`. It returns 0 when the parse fails. `ref/shared/Constants.cs:415-422`.
- [Verified] A type 4 or 5 body is `formatDouble(keyval) + CRLF + vk + CRLF`. A type 6 or 10 body is `formatDouble(keyval) + CRLF`. A comma reads as the decimal point, and bad text reads as 0. The real type 4 and 5 examples in `LootSnobV4.utl` parse. No fixture has type 6 or 10. Test: `src/core/format/profile.test.ts`, "requirement types 4 and 5" and "requirement types 6 and 10", and `doubles.test.ts`, "haxConvertDouble".
- [Observed] Type 7 `ObjectClassE` reads one line as `Convert.ToUInt32` and casts it to `ObjectClass`. It writes one line as `Convert.ToString((int)vk, InvariantCulture)`, so the value is base 10. `ref/shared/LootRules.cs:891,893`.
- [Observed] Type 8 `SpellCountGE` reads one `Convert.ToInt32` line and writes it with `Convert.ToString(..., InvariantCulture)`. `ref/shared/LootRules.cs:957,959`.
- [Observed] Type 9 `SpellMatch` reads and writes three lines: the `rxDoesMatch` regex, the `rxDoesNotMatch` regex, then `Count` as `Convert.ToInt32`. Both regexes stay text. `ref/shared/LootRules.cs:1043-1046`.
- [Verified] A type 7 body is `vk + CRLF`. A type 8 body is `keyval + CRLF`. A type 9 body is `rxDoesMatch + CRLF + rxDoesNotMatch + CRLF + count + CRLF`. All three round-trip through their length prefix, a negative type 8 keyval keeps its sign, and an empty type 9 "does not match" pattern stays an empty line. The real type 7 example in `UnfamilarShores.utl` and the real type 9 example in `vtclassic_editor_rich.utl` parse. No fixture has type 8. Test: `src/core/format/profile.test.ts`, "requirement type 7, ObjectClass" through "requirement type 9, SpellMatch".
