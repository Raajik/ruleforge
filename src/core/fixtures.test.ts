import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Checks that the fixtures are intact. The round-trip test (PLAN.md T15) replaces this file.
describe('fixtures', () => {
  for (const f of readdirSync('fixtures').filter((n) => n.endsWith('.utl'))) {
    it(`${f} starts with the UTL header and uses CRLF`, () => {
      const text = readFileSync(`fixtures/${f}`, 'latin1')
      expect(text.startsWith('UTL\r\n1\r\n')).toBe(true)
    })
  }
})
