import { describe, expect, it, beforeEach } from 'vitest'
import { CountedWriter } from './writer'

describe('CountedWriter', () => {
  let writer: CountedWriter

  beforeEach(() => {
    writer = new CountedWriter()
  })

  it('writes one line and counts characters', () => {
    writer.writeLine('hello')
    expect(writer.count).toBe(7) // 5 chars + 2 for CRLF
    expect(writer.toString()).toBe('hello\r\n')
  })

  it('writes multiple lines with correct count', () => {
    writer.writeLine('abc')
    writer.writeLine('def')
    expect(writer.count).toBe(10) // (3+2) + (3+2)
    expect(writer.toString()).toBe('abc\r\ndef\r\n')
  })

  it('supports resetCount', () => {
    writer.writeLine('first')
    writer.resetCount()
    writer.writeLine('second')
    expect(writer.count).toBe(8) // 6 + 2
    expect(writer.toString()).toBe('second\r\n')
  })

  it('handles empty lines', () => {
    writer.writeLine('')
    expect(writer.count).toBe(2) // 0 chars + 2 for CRLF
    expect(writer.toString()).toBe('\r\n')
  })

  it('handles negative count after reset', () => {
    // resetCount clears the lines, so count starts fresh
    writer.writeLine('x')
    expect(writer.count).toBe(3)
    writer.resetCount()
    expect(writer.count).toBe(0)
    expect(writer.toString()).toBe('')
  })
})
