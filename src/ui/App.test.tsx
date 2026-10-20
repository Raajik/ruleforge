// @vitest-environment jsdom
// T27: the main layout renders a real profile. The control names come from
// ref/editor/Form1.Designer.cs (see docs/ui.md).

import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { readProfile } from '../core/format/profile'
import { App } from './App'

afterEach(cleanup)

function lootSnob() {
  return readProfile(readFileSync('fixtures/LootSnobV4.utl', 'utf8'))
}

describe('App layout', () => {
  it('renders LootSnobV4.utl and shows its 1627 rules', () => {
    render(<App profile={lootSnob()} />)
    const list = screen.getByRole('list', { name: 'Rules' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1627)
  })

  it('has the menu bar, the toolbar and the two tabs', () => {
    render(<App profile={lootSnob()} />)
    for (const menu of ['File', 'Edit', 'Rule', 'Combine']) {
      expect(screen.getByRole('button', { name: menu })).toBeTruthy()
    }
    for (const item of ['Copy rule', 'Paste rule', 'Go to next match']) {
      expect(screen.getByRole('button', { name: item })).toBeTruthy()
    }
    expect(screen.getByPlaceholderText('Search for rule by name')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Loot Rules' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Salvage Combination' })).toBeTruthy()
  })

  it('clicking a rule shows its name, action and requirements', () => {
    render(<App profile={lootSnob()} />)
    // Rule 0 is "***** Trophies *****" (Keep) with a DisabledRule and a
    // StringValueMatch requirement.
    fireEvent.click(screen.getByRole('button', { name: '***** Trophies *****' }))
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
    render(<App profile={lootSnob()} />)
    // Rule 17 is "    (T) Adept Healing Kit", KeepUpTo with count 5.
    const items = within(screen.getByRole('list', { name: 'Rules' })).getAllByRole('listitem')
    fireEvent.click(within(items[17]!).getByRole('button'))
    expect((screen.getByLabelText('Keep Count') as HTMLInputElement).value).toBe('5')
  })

  it('switching to the Salvage Combination tab hides the rule list', () => {
    render(<App profile={lootSnob()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Salvage Combination' }))
    expect(screen.queryByRole('list', { name: 'Rules' })).toBeNull()
    expect(screen.getByRole('tabpanel')).toBeTruthy()
  })
})
