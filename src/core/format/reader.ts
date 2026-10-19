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
   * Gets the number of unread bytes remaining in the buffer.
   */
  get posRemaining(): number {
    return this.buffer.length - this.pos
  }
}
