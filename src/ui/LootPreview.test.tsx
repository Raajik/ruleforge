// @vitest-environment jsdom
// H3c: the loot preview panel (design/A3-customize.html). It shows the
// sample items with the action that the profile gives them. A click on an
// item shows the rule that matched and the result of every requirement.

import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { readProfile } from '../core/format/profile'
import type { LootProfile } from '../core/format/profile'
import { LootPreview } from './LootPreview'

afterEach(cleanup)

function iac(): LootProfile {
  return readProfile(readFileSync('fixtures/IAC_Level_NoCash.utl', 'utf8'))
}

function itemNames(): string[] {
  return within(screen.getByRole('list', { name: 'Loot preview items' }))
    .getAllByRole('listitem')
    .map((li) => li.textContent ?? '')
}

describe('LootPreview', () => {
  it('shows every sample item with the action that the profile gives it', () => {
    render(<LootPreview profile={iac()} />)
    const items = itemNames()
    expect(items.length).toBe(20)
    expect(items[0]).toContain('Health Philtre')
    // The item hits the rule "(W+) Bow", which keeps.
    expect(items.find((t) => t.includes('Yumi with XP'))).toContain('Keep')
    // The item hits the rule "(S) Aquamarine", which salvages.
    expect(items.find((t) => t.includes('Aquamarine'))).toContain('Salvage')
    // No rule of the profile keeps the crossbow.
    expect(items.find((t) => t.includes('Crossbow with XP'))).toContain('Ignore')
  })

  it('shows the rule that matched and the result of every requirement on a click', () => {
    render(<LootPreview profile={iac()} />)
    fireEvent.click(screen.getByRole('button', { name: /Yumi with XP/ }))
    const why = screen.getByRole('region', { name: 'Why' })
    expect(why.textContent).toContain('(W+) Bow')
    // The rule has six requirements, and all of them are true.
    const requirements = within(why).getAllByRole('listitem')
    expect(requirements.length).toBe(6)
    expect(requirements.every((li) => li.textContent?.includes('yes'))).toBe(true)
  })

  it('shows an error on a rule with an invalid regex pattern, not a crash', () => {
    const profile: LootProfile = {
      version: 1,
      extraBlocks: [],
      rules: [
        {
          name: 'broken',
          customExpression: '',
          priority: 0,
          action: 1,
          lootActionData: 0,
          requirements: [{ type: 1, pattern: '[unclosed', key: 1 }],
        },
      ],
    }
    render(<LootPreview profile={profile} />)
    expect(screen.getByRole('alert').textContent).toContain('not a valid regular expression')
  })
})
