// The round-trip gate (PLAN.md T15): every fixture reads then writes the same
// bytes, and no requirement in a fixture stays unsupported.

import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readProfile, writeProfile } from './format/profile'

const fixtures = readdirSync('fixtures')
  .filter((n) => n.endsWith('.utl'))
  .sort()

describe('fixture round-trip', () => {
  for (const f of fixtures) {
    it(`${f} reads then writes the same bytes`, () => {
      const text = readFileSync(`fixtures/${f}`, 'utf8')
      expect(writeProfile(readProfile(text)), f).toBe(text)
    })

    it(`${f} has no unsupported requirement`, () => {
      const profile = readProfile(readFileSync(`fixtures/${f}`, 'utf8'))
      for (const rule of profile.rules) {
        for (const req of rule.requirements) {
          expect('data' in req, `${f}: rule "${rule.name}" type ${req.type}`).toBe(false)
        }
      }
    })
  }
})
