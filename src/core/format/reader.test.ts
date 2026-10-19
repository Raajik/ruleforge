// Tests for LineReader.
// The LineReader reads one line at a time from a buffer and strips CR.

import { describe, expect, it } from 'vitest'
import { LineReader } from './reader'

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
