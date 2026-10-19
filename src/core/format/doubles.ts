// formatDouble copies .NET Framework double formatting: Convert.ToString(x, InvariantCulture), which is "G15".
// 15 significant digits, upper case E, a sign and at least 2 digits in the exponent.
// Scientific notation when the exponent is below -4 or 15 and above (Verified: doubles.test.ts, .NET values).

export function formatDouble(value: number): string {
  if (Number.isNaN(value)) return 'NaN'
  if (value === Infinity) return 'Infinity'
  if (value === -Infinity) return '-Infinity'
  if (value === 0) return '0' // .NET Framework also writes -0 as "0"

  // toExponential(14) rounds to 15 significant digits and gives the exponent after the rounding.
  const [mantissa = '', expText = ''] = value.toExponential(14).split('e')
  const exp = Number(expText)
  const digits = mantissa.replace('-', '').replace('.', '').replace(/0+$/, '')
  const sign = value < 0 ? '-' : ''

  if (exp < -4 || exp >= 15) {
    const m = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits
    return `${sign}${m}E${exp < 0 ? '-' : '+'}${String(Math.abs(exp)).padStart(2, '0')}`
  }
  if (exp < 0) return `${sign}0.${'0'.repeat(-exp - 1)}${digits}`
  const intLen = exp + 1
  if (digits.length <= intLen) return sign + digits.padEnd(intLen, '0')
  return `${sign}${digits.slice(0, intLen)}.${digits.slice(intLen)}`
}

// haxConvertDouble copies GameInfo.HaxConvertDouble (ref/shared/Constants.cs 415-422): ',' becomes '.',
// then double.TryParse with NumberStyles.Float and InvariantCulture, and 0 when the parse fails.
export function haxConvertDouble(line: string | null | undefined): number {
  const s = (line ?? '').replace(/,/g, '.').trim()
  if (s === 'NaN') return NaN
  if (s === 'Infinity') return Infinity
  if (s === '-Infinity') return -Infinity
  // NumberStyles.Float: a sign, digits with one '.', and an exponent. No hex, no thousands separator.
  return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) ? Number(s) : 0
}
