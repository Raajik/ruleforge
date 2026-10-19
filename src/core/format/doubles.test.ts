// Tests for formatDouble.
// Traps section: .NET uses Convert.ToString(x, InvariantCulture) for doubles.
// .NET gives 15 significant digits, uppercase E, 2-digit padded exponent.
// JS String(x) differs (0.00001, 1e-5). formatDouble copies .NET behavior.

import { describe, expect, it } from 'vitest'
import { formatDouble, haxConvertDouble } from './doubles'

describe('formatDouble', () => {
  it('formats 0.1 same as .NET', () => {
    expect(formatDouble(0.1)).toBe('0.1')
  })

  it('formats 0.5 same as .NET', () => {
    expect(formatDouble(0.5)).toBe('0.5')
  })

  it('formats integer 1 same as .NET', () => {
    expect(formatDouble(1)).toBe('1')
  })

  it('formats 100 same as .NET', () => {
    expect(formatDouble(100)).toBe('100')
  })

  it('formats 0.00001 as 1E-05 like .NET (not 0.00001 or 1e-5)', () => {
    expect(formatDouble(0.00001)).toBe('1E-05')
  })

  it('formats large value 1.5E+20 like .NET', () => {
    expect(formatDouble(1.5e+20)).toBe('1.5E+20')
  })

  it('formats 0.333333333333333 same as .NET', () => {
    expect(formatDouble(0.333333333333333)).toBe('0.333333333333333')
  })

  // Real doubles from fixtures/ILT_Legendary.utl
  it('formats 1.1 same as .NET', () => {
    expect(formatDouble(1.1)).toBe('1.1')
  })

  it('formats 1.17 same as .NET', () => {
    expect(formatDouble(1.17)).toBe('1.17')
  })

  it('formats 1.04 same as .NET', () => {
    expect(formatDouble(1.04)).toBe('1.04')
  })

  it('formats 1.31 same as .NET', () => {
    expect(formatDouble(1.31)).toBe('1.31')
  })

  it('formats 1.3 same as .NET', () => {
    expect(formatDouble(1.3)).toBe('1.3')
  })

  it('formats 1.29 same as .NET', () => {
    expect(formatDouble(1.29)).toBe('1.29')
  })

  it('formats 1.28 same as .NET', () => {
    expect(formatDouble(1.28)).toBe('1.28')
  })

  it('formats 1.27 same as .NET', () => {
    expect(formatDouble(1.27)).toBe('1.27')
  })

  it('formats 1.26 same as .NET', () => {
    expect(formatDouble(1.26)).toBe('1.26')
  })

  it('formats 1.25 same as .NET', () => {
    expect(formatDouble(1.25)).toBe('1.25')
  })

  it('formats 1.24 same as .NET', () => {
    expect(formatDouble(1.24)).toBe('1.24')
  })

  it('formats 1.23 same as .NET', () => {
    expect(formatDouble(1.23)).toBe('1.23')
  })

  it('formats 1.22 same as .NET', () => {
    expect(formatDouble(1.22)).toBe('1.22')
  })

  it('formats 1.21 same as .NET', () => {
    expect(formatDouble(1.21)).toBe('1.21')
  })

  it('formats 1.20 same as .NET', () => {
    expect(formatDouble(1.2)).toBe('1.2')
  })

  it('formats 1.19 same as .NET', () => {
    expect(formatDouble(1.19)).toBe('1.19')
  })

  it('formats 1.18 same as .NET', () => {
    expect(formatDouble(1.18)).toBe('1.18')
  })

  it('formats 1.16 same as .NET', () => {
    expect(formatDouble(1.16)).toBe('1.16')
  })

  // Edge cases
  it('handles zero', () => {
    expect(formatDouble(0)).toBe('0')
    expect(formatDouble(-0)).toBe('0')
  })

  it('handles negative values', () => {
    expect(formatDouble(-1.1)).toBe('-1.1')
    expect(formatDouble(-0.00001)).toBe('-1E-05')
  })

  it('uses uppercase E for scientific notation', () => {
    expect(formatDouble(1e-5)).toMatch(/E/)
    expect(formatDouble(1e15)).toMatch(/E/)
    expect(formatDouble(1e-5).charAt(formatDouble(1e-5).indexOf('E') - 1)).not.toBe('e')
  })
})

// Real .NET output: x.ToString("G15", InvariantCulture) from a dotnet run on 2026-10-19 (the orchestrator's check).
describe('formatDouble against .NET G15 output', () => {
  const cases: [number, string][] = [
    [0.1 + 0.2, '0.3'],
    [1 / 3, '0.333333333333333'],
    [2 / 3, '0.666666666666667'],
    [1000, '1000'],
    [1e15, '1E+15'],
    [9.99999999999999999e14, '1E+15'],
    [123456789012345678, '1.23456789012346E+17'],
    [1e-5 * 3, '3E-05'],
    [-0.00012345, '-0.00012345'],
    [0.0001, '0.0001'],
    [1234.5678, '1234.5678'],
    [1e100, '1E+100'],
  ]
  for (const [value, want] of cases) {
    it(`${value} -> ${want}`, () => expect(formatDouble(value)).toBe(want))
  }
})

describe('haxConvertDouble', () => {
  it('copies GameInfo.HaxConvertDouble', () => {
    expect(haxConvertDouble('0.53')).toBe(0.53)
    expect(haxConvertDouble('1,5')).toBe(1.5)
    expect(haxConvertDouble(' -1E-05 ')).toBe(-1e-5)
    expect(haxConvertDouble('.5')).toBe(0.5)
    expect(haxConvertDouble('Infinity')).toBe(Infinity)
    expect(haxConvertDouble('NaN')).toBeNaN()
    // TryParse fails, so the C# returns 0.
    for (const bad of ['', 'abc', '0x10', '1.2.3', '1,000.5', null]) expect(haxConvertDouble(bad)).toBe(0)
  })
})
