// @vitest-environment jsdom
// T27: the main layout renders a real profile. The control names come from
// ref/editor/Form1.Designer.cs (see docs/ui.md).

import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { eLootAction } from '../core/format/enums'
import type { LootProfile } from '../core/format/profile'
import { readProfile } from '../core/format/profile'
import { App } from './App'
import { DEFAULT_COLOR_SLOTS } from './colorSlots'

afterEach(cleanup)

function lootSnob() {
  return readProfile(readFileSync('fixtures/LootSnobV4.utl', 'utf8'))
}

describe('App layout', () => {
  it('renders LootSnobV4.utl and shows its 1627 rules', () => {
    render(<App initialProfile={lootSnob()} />)
    const list = screen.getByRole('list', { name: 'Rules' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1627)
  })

  it('has the menu bar, the toolbar and the tabs', () => {
    render(<App initialProfile={lootSnob()} />)
    for (const menu of ['File', 'Edit', 'Rule', 'Combine']) {
      expect(screen.getByRole('button', { name: menu })).toBeTruthy()
    }
    for (const item of ['Copy rule', 'Paste rule', 'Go to next match']) {
      expect(screen.getByRole('button', { name: item })).toBeTruthy()
    }
    expect(screen.getByPlaceholderText('Search for rule by name')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Loot Rules' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Loot preview' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Salvage Combination' })).toBeTruthy()
  })

  it('the Loot preview tab shows the sample items with the action of the profile', () => {
    render(<App initialProfile={lootSnob()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Loot preview' }))
    const items = within(screen.getByRole('list', { name: 'Loot preview items' })).getAllByRole('listitem')
    expect(items.length).toBe(20)
    // LootSnobV4 keeps the health philtre.
    expect(items[0]!.textContent).toContain('Health Philtre')
    expect(items[0]!.textContent).toContain('Keep')
  })

  it('clicking a rule shows its name, action and requirements', () => {
    render(<App initialProfile={lootSnob()} />)
    // Rule 0 is "***** Trophies *****" (Keep) with a DisabledRule and a
    // StringValueMatch requirement.
    fireEvent.click(screen.getByRole('button', { name: 'Off ***** Trophies *****' }))
    expect((screen.getByLabelText('Rule Name') as HTMLInputElement).value).toBe('***** Trophies *****')
    const action = screen.getByLabelText('Action') as HTMLSelectElement
    expect(action.selectedOptions[0]!.textContent).toBe('Keep')
    // The keep count is visible only for KeepUpTo (Form1.cs 127-141).
    expect(screen.queryByLabelText('Keep Count')).toBeNull()
    const reqs = screen.getByRole('list', { name: 'Requirements' })
    expect(within(reqs).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'DisabledRule',
      'StringValueMatch',
    ])
  })

  it('a KeepUpTo rule shows its keep count', () => {
    render(<App initialProfile={lootSnob()} />)
    // Rule 17 is "    (T) Adept Healing Kit", KeepUpTo with count 5.
    const items = within(screen.getByRole('list', { name: 'Rules' })).getAllByRole('listitem')
    fireEvent.click(within(items[17]!).getByRole('button'))
    expect((screen.getByLabelText('Keep Count') as HTMLInputElement).value).toBe('5')
  })

  it('clicking a requirement shows its fields, and typing updates the requirement', () => {
    render(<App initialProfile={lootSnob()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Off ***** Trophies *****' }))
    fireEvent.click(screen.getByRole('button', { name: 'StringValueMatch' }))
    const pattern = screen.getByLabelText('String Value Pattern') as HTMLInputElement
    expect(pattern.value).toBeTruthy()
    fireEvent.change(pattern, { target: { value: 'Changed' } })
    expect((screen.getByLabelText('String Value Pattern') as HTMLInputElement).value).toBe('Changed')
  })

  it('switching to the Salvage Combination tab hides the rule list', () => {
    render(<App initialProfile={lootSnob()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Salvage Combination' }))
    expect(screen.queryByRole('list', { name: 'Rules' })).toBeNull()
    expect(screen.getByRole('tabpanel')).toBeTruthy()
  })

  it('the action badge shows "Off" only for a rule with a true DisabledRule', () => {
    const profile: LootProfile = {
      version: 1,
      extraBlocks: [],
      rules: [
        {
          name: 'Off rule',
          customExpression: '',
          priority: 0,
          action: eLootAction.Keep,
          lootActionData: 0,
          requirements: [{ type: 9999, b: true }],
        },
        {
          name: 'Live rule',
          customExpression: '',
          priority: 0,
          action: eLootAction.Sell,
          lootActionData: 0,
          requirements: [],
        },
        {
          name: 'False rule',
          customExpression: '',
          priority: 0,
          action: eLootAction.Salvage,
          lootActionData: 0,
          requirements: [{ type: 9999, b: false }],
        },
      ],
    }
    render(<App initialProfile={profile} />)
    const items = within(screen.getByRole('list', { name: 'Rules' })).getAllByRole('listitem')
    expect(within(items[0]!).getByText('Off')).toBeTruthy()
    expect(within(items[1]!).getByText('Sell')).toBeTruthy()
    expect(within(items[2]!).getByText('Salvage')).toBeTruthy()
  })

  it('makes a new type 15 rule from scratch with the bundled armor groups', () => {
    render(<App initialProfile={{ version: 1, rules: [], extraBlocks: [] }} colorSlots={DEFAULT_COLOR_SLOTS} />)
    fireEvent.click(within(screen.getByRole('group', { name: 'Rule actions' })).getByRole('button', { name: 'New' }))
    // The requirement "New" button sits under the requirement list, after the rule's.
    fireEvent.click(screen.getAllByRole('button', { name: 'New' }).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'SpellNameMatch' }))
    const type = screen.getByLabelText('Requirement type') as HTMLSelectElement
    const armor = [...type.options].find((o) => o.textContent === 'Armor Type Similar Color')!
    fireEvent.change(type, { target: { value: armor.value } })
    expect(screen.getByRole('button', { name: 'SimilarColorArmorType' })).toBeTruthy()
    // The bundled ColorSlots.Default.xml: "None" and its 63 definitions.
    const actsOn = screen.getByLabelText('Armor Type/Color Region') as HTMLSelectElement
    expect(actsOn.options).toHaveLength(64)
    const chest = [...actsOn.options].find((o) => o.textContent === 'Amuli Coat (Chest)')!
    fireEvent.change(actsOn, { target: { value: chest.value } })
    fireEvent.change(screen.getByLabelText('RGB color value (hex)'), { target: { value: '3060C0' } })
    expect(screen.getByText('Amuli Coat, Chest in #3060C0')).toBeTruthy()
  })
})
