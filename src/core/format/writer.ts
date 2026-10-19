/**
 * Writes lines prefixed with a byte length tag.
 * Collects lines in memory and tracks character count.
 */
export class CountedWriter {
  private lines: string[]
  private byteCount: number

  constructor() {
    this.lines = []
    this.byteCount = 0
  }

  get count(): number {
    return this.byteCount
  }

  writeLine(line: string): void {
    // Count characters (UTF-16 code units) + 2 for CRLF
    this.byteCount += line.length + 2
    this.lines.push(line)
  }

  resetCount(): void {
    this.byteCount = 0
    this.lines = []
  }

  toString(): string {
    if (this.lines.length === 0) {
      return ''
    }
    return this.lines.join('\r\n') + '\r\n'
  }
}
