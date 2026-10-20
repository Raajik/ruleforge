// Tests for the sample items (PLAN.md H3c). The items in samples.json are
// made by hand to hit real rules. They are not taken from the game. Each one
// must keep hitting its rule of LootSnobV4.utl and IAC_Level_NoCash.utl.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { eLootAction } from '../format/enums'
import { readProfile } from '../format/profile'
import { doubleValueKey, intValueKey, stringValueKey } from '../gamedata/generated'
import type { Character } from './character'
import type { SampleItem } from './item'
import { previewItem } from './preview'
import samples from './samples.json'

// The JSON import gives a union of the item shapes, so the items need one
// cast to become SampleItem values.
const items = samples.items as unknown as SampleItem[]
const character = samples.character as Character

/** The rule that each sample hits, per fixture. An empty name means no rule. */
const IAC_RULES: Record<string, string> = {
  'Yumi with XP': '(W+) Bow',
  'Wand with XP': '(W+) Wand',
  'Shashqa with XP': '(2H+) Cleaving',
  'Assagai with XP': '(2H+) Spear',
  'Gold Pea': '($) Peas',
  'Major Mana Stone': '(MS) Major',
  'Peerless Healing Kit': '(H) Peerless',
  Aquamarine: '(S) Aquamarine',
  Emerald: '(S) Emerald',
  Mote: '(T) Mote/Sliver/Nugget',
  Aetheria: '(T) Aetheria (4+)',
  'Crossbow with XP': '',
}

const LOOTSNOB_RULES: Record<string, string> = {
  'Health Philtre': '(T) Health Philtre',
  'Aged Legendary Key': '(T) Aged Legendary Key',
  Coconut: '(T) Coconut',
  'Rynthid Masks': '(T) Rynthid Masks',
  Mote: '(T) Mote/Sliver/Nugget',
  'Phyntos Essence': '(T) Essence (200 Naturalist)',
  'Lugian War Axe': '(H) Axe (OD +10)',
  'Snow Tusker Blood': '(T) Snow Tusker Blood',
  Aetheria: '(T) Aetheria (5)',
  'Shattered Legendary Key': '(T) Shattered Legendary Key',
  'Gold Pea': '(T) Pyreal/Gold/Silver Pea',
}

function fixture(name: string) {
  return readProfile(readFileSync(`fixtures/${name}`, 'utf8'))
}

describe('the sample items', () => {
  it('has about 20 items, each with a name', () => {
    expect(items.length).toBeGreaterThanOrEqual(18)
    expect(items.length).toBeLessThanOrEqual(22)
    for (const item of items) expect(item.name).not.toBe('')
  })

  it('uses only the key names of the generated enums', () => {
    for (const item of items) {
      for (const key of Object.keys(item.intValues)) expect(Object.keys(intValueKey)).toContain(key)
      for (const key of Object.keys(item.doubleValues)) expect(Object.keys(doubleValueKey)).toContain(key)
      for (const key of Object.keys(item.stringValues)) expect(Object.keys(stringValueKey)).toContain(key)
      for (const id of item.spellIds ?? []) expect(typeof id).toBe('number')
    }
  })

  it('gives the name of the item as the Name value, so the name rules can match it', () => {
    for (const item of items) expect(item.stringValues.Name).toBe(item.name)
  })

  it('hits the rules of IAC_Level_NoCash.utl', () => {
    const profile = fixture('IAC_Level_NoCash.utl')
    for (const item of items) {
      const decision = previewItem(profile, item, undefined, character)
      expect(`${item.name}:${decision.ruleName.trim()}`).toBe(`${item.name}:${IAC_RULES[item.name] ?? ''}`)
      expect(decision.known).toBe(true)
    }
  })

  it('hits the rules of LootSnobV4.utl', () => {
    const profile = fixture('LootSnobV4.utl')
    for (const item of items) {
      const decision = previewItem(profile, item, undefined, character)
      expect(`${item.name}:${decision.ruleName.trim()}`).toBe(`${item.name}:${LOOTSNOB_RULES[item.name] ?? ''}`)
      expect(decision.known).toBe(true)
    }
  })

  it('gives the buffed damage of the axe only with the spell id in spellIds', () => {
    const profile = fixture('LootSnobV4.utl')
    const axe = items.find((i) => i.name === 'Lugian War Axe')!
    // The rule wants a buffed max damage of 84. The item has 80, and the
    // spell adds 4.
    expect(previewItem(profile, axe, undefined, character).ruleName).toBe('(H) Axe (OD +10)')
    const withoutSpell = { ...axe, spellIds: [] }
    expect(previewItem(profile, withoutSpell, undefined, character).ruleName).toBe('')
  })

  it('keeps the item that no rule keeps', () => {
    const profile = fixture('IAC_Level_NoCash.utl')
    const crossbow = items.find((i) => i.name === 'Crossbow with XP')!
    const decision = previewItem(profile, crossbow, undefined, character)
    expect(decision.action).toBe(eLootAction.NoLoot)
    expect(decision.ruleIndex).toBe(-1)
  })
})
