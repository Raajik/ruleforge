/**
 * Writes text into a buffer and tracks the character count, like the C#
 * `CountedStreamWriter`, which counts UTF-16 code units. Lines end with CRLF.
 */
export class CountedWriter {
  private parts: string[]
  private charCount: number

  constructor() {
    this.parts = []
    this.charCount = 0
  }

  get count(): number {
    return this.charCount
  }

  /** Writes raw text with no line break. */
  write(text: string): void {
    this.charCount += text.length
    this.parts.push(text)
  }

  writeLine(line: string): void {
    this.write(line)
    this.write('\r\n')
  }

  resetCount(): void {
    this.charCount = 0
    this.parts = []
  }

  toString(): string {
    return this.parts.join('')
  }
}
