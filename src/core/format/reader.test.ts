// Tests for LineReader and parseInt32.
// The LineReader reads one line at a time from a buffer and strips CR.

import { describe, expect, it } from 'vitest'
import { LineReader, parseInt32 } from './reader'

describe('LineReader', () => {
  it('reads a single line', () => {
    const reader = new LineReader('hello\n')
    expect(reader.readLine()).toBe('hello')
    expect(reader.readLine()).toBeNull()
  })

  it('reads multiple lines', () => {
    const reader = new LineReader('abc\ndef\nghi')
    expect(reader.readLine()).toBe('abc')
    expect(reader.readLine()).toBe('def')
    expect(reader.readLine()).toBe('ghi')
    expect(reader.readLine()).toBeNull()
  })

  it('strips CR from CRLF lines', () => {
    const reader = new LineReader('abc\r\ndef\r\nghi\r\n')
    expect(reader.readLine()).toBe('abc')
    expect(reader.readLine()).toBe('def')
    expect(reader.readLine()).toBe('ghi')
    expect(reader.readLine()).toBeNull()
  })

  it('handles empty lines', () => {
    const reader = new LineReader('abc\n\ndef')
    expect(reader.readLine()).toBe('abc')
    expect(reader.readLine()).toBe('')
    expect(reader.readLine()).toBe('def')
    expect(reader.readLine()).toBeNull()
  })

  it('handles no trailing newline', () => {
    const reader = new LineReader('abc')
    expect(reader.readLine()).toBe('abc')
    expect(reader.readLine()).toBeNull()
  })

  it('handles only CR', () => {
    const reader = new LineReader('abc\ndef')
    expect(reader.readLine()).toBe('abc')
    expect(reader.readLine()).toBe('def')
    expect(reader.readLine()).toBeNull()
  })
})

describe('parseInt32', () => {
  it('parses like C# int.TryParse with the default NumberStyles.Integer', () => {
    expect(parseInt32('42')).toBe(42)
    expect(parseInt32('-7')).toBe(-7)
    expect(parseInt32(' +5 ')).toBe(5) // sign and surrounding whitespace
    expect(parseInt32('-0')).toBe(0) // C# int has no negative zero
    expect(parseInt32('-2147483648')).toBe(-2147483648)
    expect(parseInt32('2147483647')).toBe(2147483647)
  })

  it('gives undefined where C# int.TryParse returns false', () => {
    expect(parseInt32('')).toBeUndefined()
    expect(parseInt32('4a2')).toBeUndefined()
    expect(parseInt32('1.5')).toBeUndefined()
    expect(parseInt32('1e5')).toBeUndefined()
    expect(parseInt32('2147483648')).toBeUndefined() // overflow
    expect(parseInt32('-2147483649')).toBeUndefined()
  })
})
