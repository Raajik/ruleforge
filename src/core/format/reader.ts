/**
 * Reads one line at a time from a string buffer.
 * Strips CR (carriage return) from each line.
 */
export class LineReader {
  private buffer: string
  private pos: number
  private done: boolean

  constructor(buffer: string) {
    this.buffer = buffer
    this.pos = 0
    this.done = false
  }

  /**
   * Reads the next line, stripping CR.
   * Returns null at end of buffer.
   */
  readLine(): string | null {
    if (this.done) {
      return null
    }

    const lineStart = this.pos
    const lineEnd = this.buffer.indexOf('\n', lineStart)

    if (lineEnd === -1) {
      // No more LF found. Take everything remaining.
      let line = ''
      if (lineStart < this.buffer.length) {
        line = this.buffer.slice(lineStart, this.buffer.length)
        if (line.length > 0 && line.endsWith('\r')) {
          line = line.slice(0, -1)
        }
      }
      this.pos = this.buffer.length
      this.done = true
      return line || null
    }

    // Found LF. The line content is between lineStart and lineEnd.
    // Strip trailing CR if present.
    const hasCR = lineEnd > lineStart && this.buffer[lineEnd - 1] === '\r'
    const contentEnd = hasCR ? lineEnd - 1 : lineEnd

    let line = ''
    if (contentEnd > lineStart) {
      line = this.buffer.slice(lineStart, contentEnd)
    }

    this.pos = lineEnd + 1
    return line
  }

  /**
   * Reads up to n characters as raw text. Line breaks are not treated.
   * This copies `StreamReader.Read(char[], 0, n)`, which the C# code uses for
   * an unsupported requirement and for an extra block body.
   */
  readChars(n: number): string {
    // C# new char[n] throws on a negative n. Going back here would re-read the same text forever.
    if (n < 0) throw new Error(`Negative length in the profile: ${n}`)
    const end = Math.min(this.pos + n, this.buffer.length)
    const text = this.buffer.slice(this.pos, end)
    this.pos = end
    return text
  }

  /**
   * Gets the number of unread bytes remaining in the buffer.
   */
  get posRemaining(): number {
    return this.buffer.length - this.pos
  }

  /** True when only whitespace is left unread. */
  get restIsBlank(): boolean {
    return this.buffer.slice(this.pos).trim() === ''
  }
}

/**
 * Parses text the way C# `int.TryParse` with the default styles does
 * (NumberStyles.Integer): surrounding whitespace, an optional sign, ASCII
 * digits, and the Int32 range. Gives undefined where C# gives false.
 */
export function parseInt32(text: string): number | undefined {
  const s = text.trim()
  if (!/^[+-]?[0-9]+$/.test(s)) return undefined
  const n = Number(s)
  if (n < -2147483648 || n > 2147483647) return undefined
  return n === 0 ? 0 : n // C# int has no negative zero, so "-0" reads as 0.
}
