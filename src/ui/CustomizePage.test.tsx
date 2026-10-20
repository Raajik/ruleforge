// @vitest-environment jsdom
// H2: the Customize page (design/A3-customize.html). It shows the categories of
// the profile on the left and the rules of one category in the middle.

import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readProfile } from '../core/format/profile'
import { App } from './App'
import { CustomizePage } from './CustomizePage'

afterEach(cleanup)

function iac() {
  return readProfile(readFileSync('fixtures/IAC_Level_NoCash.utl', 'utf8'))
}

function categoryNames(): string[] {
  return within(screen.getByRole('navigation', { name: 'Categories' }))
    .getAllByRole('button')
    .map((b) => b.querySelector('.category-name')?.textContent ?? '')
}

function openCustomize() {
  fireEvent.click(screen.getByRole('tab', { name: 'Customize' }))
}

describe('CustomizePage', () => {
  it('shows the top sections of IAC_Level_NoCash.utl with their rule counts', () => {
    render(<CustomizePage profile={iac()} onChange={() => {}} onEditInDetail={() => {}} />)
    expect(categoryNames()).toEqual(['*** Leveling Weapons ***', '*** Leveling Armor ***', '***** Salvage *****'])
    const counts = within(screen.getByRole('navigation', { name: 'Categories' }))
      .getAllByRole('button')
      .map((b) => b.querySelector('.category-count')?.textContent)
    // Each section holds the rules after its marker rule: 1-10, 12-27, 29-55.
    expect(counts).toEqual(['10', '16', '27'])
  })

  it('shows the rules of the selected category with a summary', () => {
    render(<CustomizePage profile={iac()} onChange={() => {}} onEditInDetail={() => {}} />)
    // Leveling Weapons holds "(W+) Bow".
    const rows = within(screen.getByRole('list', { name: 'Category rules' })).getAllByRole('listitem')
    const bow = rows.find((li) => li.textContent?.includes('(W+) Bow'))!
    expect(bow.textContent).toContain('LongValKeyE WeaponMasteryCategory 8')
  })

  it('turns a rule on and off through the checkbox', () => {
    const onChange = vi.fn()
    render(<CustomizePage profile={iac()} onChange={onChange} onEditInDetail={() => {}} />)
    // (W+) Bow is enabled. Turn it off.
    fireEvent.click(screen.getByLabelText('Enable (W+) Bow'))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]![0]
    const bow = next.rules.find((r: { name: string }) => r.name === '(W+) Bow')
    expect(bow.requirements.some((q: { type: number }) => q.type === 9999)).toBe(true)
  })

  it('edits the one number box of a rule', () => {
    const onChange = vi.fn()
    render(<CustomizePage profile={iac()} onChange={onChange} onEditInDetail={() => {}} />)
    const box = screen.getByLabelText('Value of (W+) Bow') as HTMLInputElement
    expect(box.value).toBe('8')
    fireEvent.change(box, { target: { value: '9' } })
    const next = onChange.mock.calls[0]![0]
    const bow = next.rules.find((r: { name: string }) => r.name === '(W+) Bow')
    expect(bow.requirements[0]).toEqual({ type: 12, keyval: 9, vk: 353 })
  })

  it('switches the rule list to another category on a category click', () => {
    render(<CustomizePage profile={iac()} onChange={() => {}} onEditInDetail={() => {}} />)
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Categories' })).getByRole('button', {
        name: /Leveling Armor/,
      }),
    )
    expect(screen.getByRole('heading', { name: '*** Leveling Armor ***' })).toBeTruthy()
  })
})

describe('App Customize tab', () => {
  it('the Customize tab shows the categories and hides the rule list', () => {
    render(<App initialProfile={iac()} />)
    openCustomize()
    expect(screen.getByRole('navigation', { name: 'Categories' })).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Rules' })).toBeNull()
  })

  it('"Edit rules in detail" opens the Loot Rules tab', () => {
    render(<App initialProfile={iac()} />)
    openCustomize()
    fireEvent.click(screen.getByRole('button', { name: 'Edit rules in detail' }))
    expect(screen.getByRole('list', { name: 'Rules' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Loot Rules' }).getAttribute('aria-selected')).toBe('true')
  })
})
