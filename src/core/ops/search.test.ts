// Tests for the rule search (T19). The C# is ref/editor/Form1.cs 959-992.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eLootAction } from '../format/enums'
import type { LootProfile, LootRule } from '../format/profile'
import { readProfile } from '../format/profile'
import { findNextMatchingRule, goToNextMatchingRule } from './search'

function rule(name: string): LootRule {
  return { name, customExpression: '', priority: 0, action: eLootAction.Keep, lootActionData: 0, requirements: [] }
}

function profile(...names: string[]): LootProfile {
  return { version: 1, rules: names.map(rule), extraBlocks: [] }
}

describe('findNextMatchingRule', () => {
  it('is case-insensitive and takes the first match at or after start', () => {
    const p = profile('Armor', 'Epic Armor', 'Weapons')
    expect(findNextMatchingRule(p, 'ARMOR', 0)).toBe(0)
    expect(findNextMatchingRule(p, 'armor', 1)).toBe(1)
    expect(findNextMatchingRule(p, 'epic', 0)).toBe(1)
  })

  it('wraps to the first match when no match follows', () => {
    expect(findNextMatchingRule(profile('Armor', 'Shield'), 'armor', 1)).toBe(0)
  })

  it('wraps when start is past the end, as the next-match button does', () => {
    // The button searches from CurrentRuleNum + 1 (Form1.cs 993-996).
    expect(findNextMatchingRule(profile('Armor', 'Shield', 'Epic'), 'epic', 3)).toBe(2)
    expect(findNextMatchingRule(profile('Armor', 'Shield', 'Epic'), 'shield', 56)).toBe(1)
  })

  it('starts at the first rule when start is below zero', () => {
    expect(findNextMatchingRule(profile('abc', 'bcd'), 'b', -1)).toBe(0)
  })

  it('matches the text the rule list shows', () => {
    // The list items are the rule names, spaces included.
    expect(findNextMatchingRule(profile('  spaced  '), 'spaced  ', 0)).toBe(0)
    expect(findNextMatchingRule(profile('$', '$p', '$s'), '$p', 0)).toBe(1)
  })

  it('returns -1 when no rule matches', () => {
    expect(findNextMatchingRule(profile('Armor', 'Shield'), 'bow', 0)).toBe(-1)
    expect(findNextMatchingRule(profile(), 'armor', 0)).toBe(-1)
  })

  it('takes an empty search as a match of every rule', () => {
    // "".Contains("") is true, so find returns the first index at or after start.
    expect(findNextMatchingRule(profile('A', 'B'), '', 0)).toBe(0)
    expect(findNextMatchingRule(profile('A', 'B'), '', 1)).toBe(1)
    expect(findNextMatchingRule(profile('A', 'B'), '', 9)).toBe(0)
  })

  it('finds the real rule names in a fixture', () => {
    const p = readProfile(readFileSync('fixtures/IAC_Level_NoCash.utl', 'utf8'))
    expect(findNextMatchingRule(p, 'leveling weapons', 0)).toBe(0)
    expect(findNextMatchingRule(p, 'LEVELING', 1)).toBeGreaterThan(0)
    // Past the end it wraps to the first match.
    expect(findNextMatchingRule(p, 'leveling weapons', p.rules.length + 10)).toBe(0)
    expect(findNextMatchingRule(p, 'no such rule', 0)).toBe(-1)
  })
})

describe('goToNextMatchingRule', () => {
  it('gives the next index to select', () => {
    expect(goToNextMatchingRule(profile('Armor', 'Shield'), 'shield', 0)).toBe(1)
  })

  it('does nothing for an empty search', () => {
    // GoToNextMatchingRule checks String.IsNullOrEmpty first (Form1.cs 961).
    expect(goToNextMatchingRule(profile('Armor', 'Shield'), '', 0)).toBe(-1)
  })

  it('returns -1 when no rule matches', () => {
    expect(goToNextMatchingRule(profile('Armor'), 'bow', 0)).toBe(-1)
  })
})
