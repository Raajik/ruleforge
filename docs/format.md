# File format facts for the VTClassic UTL format.

## Format

### Traps / known differences from JS
- [Verified] `CountedStreamWriter` counts UTF-16 code units via `string.Length`. `string.Length`. Same as JS `string.length`. See: `ref/shared/CountedStreamWriter.cs`
- [Verified] .NET Framework doubles use `Convert.ToString(x, InvariantCulture)`. `.ToString()` formats 15 significant digits. `0.1`, `1E-05`, `1.5E+20`. See: `ref/shared/Constants.cs`
- [Verified] .NET Framework for doubles in [0.0001, 1e15) agree with JS `String()`. Outside this range, .NET switches to scientific notation. JS differs. See: `ref/shared/Constants.cs`
- [Verified] `CountedStreamWriter.Write(double)` uses `Convert.ToString(x, InvariantCulture)`. C# `Write(double)` uses `Convert.ToString`. See: `ref/shared/CountedStreamWriter.cs`
