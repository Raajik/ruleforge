// formatDouble copies .NET double formatting into JavaScript.
// .NET uses Convert.ToString(x, InvariantCulture) for doubles.
// Differences from JS String(x):
//   - Upper case E instead of lower case e for scientific notation
//   - 2-digit padded exponent with explicit sign
//   - Different boundary for switching between fixed-point and scientific

export function formatDouble(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value)
  }
  if (value === 0 || value === -0) {
    return '0'
  }

  const absVal = Math.abs(value)
  const exp = Math.floor(Math.log10(absVal))

  // .NET G15 format uses scientific notation when exponent < -4 or >= 15
  // See Traps: 0.00001 becomes 1E-05 in .NET but 0.00001 in JS
  // Traps: 1.5E+20 is the .NET style (uppercase E, 2-digit padding)
  if (exp < -4 || exp >= 15) {
    return formatAsScientific(value, exp)
  }

  return String(value)
}

function formatAsScientific(value: number, exp: number): string {
  const absVal = Math.abs(value)
  const mantissa = absVal / Math.pow(10, exp)
  // Round to 15 significant digits (matching .NET G15 precision)
  let mantissaStr = parseFloat(mantissa.toPrecision(15)).toString()

  // Format exponent: 2-digit padded with explicit sign
  const expStr = Math.abs(exp).toString().padStart(2, '0')
  const sign = exp >= 0 ? '+' : '-'

  // Add value sign prefix for negative numbers
  const prefix = value < 0 ? '-' : ''

  return prefix + mantissaStr + 'E' + sign + expStr
}
