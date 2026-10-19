# File format facts for the VTClassic UTL format.

## Format

### Traps / known differences from JS
- [Verified] `CountedStreamWriter` counts UTF-16 code units via `string.Length`. `string.Length`. Same as JS `string.length`. See: `ref/shared/CountedStreamWriter.cs`
- [Verified] .NET Framework writes a double as "G15": 15 significant digits, then trailing zeros removed. Scientific notation (`1E-05`, `1.5E+20`) when the exponent is below -4 or 15 and above. Test: `src/core/format/doubles.test.ts`, "against .NET G15 output" (values from a real `dotnet run`).
- [Verified] JS `String(x)` differs from .NET even for normal values: `1/3` gives `0.3333333333333333` in JS and `0.333333333333333` in .NET. Test: same file.
- [Verified] `CountedStreamWriter.Write(double)` uses `Convert.ToString(x, InvariantCulture)`. C# `Write(double)` uses `Convert.ToString`. See: `ref/shared/CountedStreamWriter.cs`
