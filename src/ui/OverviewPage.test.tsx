// @vitest-environment jsdom
// H5: the Overview page (design/A2-overview.html). It picks a base profile,
// a strictness level and the character, and it shows a sample of the drops.

import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readProfile } from '../core/format/profile'
import type { LootProfile } from '../core/format/profile'
import { isRuleDisabled } from '../core/ops/rules'
import { App } from './App'
import { OverviewPage } from './OverviewPage'

afterEach(cleanup)

function snob(): LootProfile {
  return readProfile(readFileSync('fixtures/LootSnobV4.utl', 'utf8'))
}

function onNames(profile: LootProfile): string[] {
  return profile.rules.filter((r) => !isRuleDisabled(r)).map((r) => r.name)
}

function renderPage(props: Partial<React.ComponentProps<typeof OverviewPage>> = {}) {
  const onChange = vi.fn()
  const onLoadBase = vi.fn()
  const onOpenPreview = vi.fn()
  render(
    <OverviewPage
      profile={snob()}
      fileName=""
      onChange={onChange}
      onLoadBase={onLoadBase}
      onOpenPreview={onOpenPreview}
      {...props}
    />,
  )
  return { onChange, onLoadBase, onOpenPreview }
}

describe('OverviewPage', () => {
  it('shows the four base profiles and the four strictness levels', () => {
    renderPage()
    const cards = within(screen.getByRole('group', { name: 'Base profiles' })).getAllByRole('button')
    expect(cards.map((b) => b.textContent)).toEqual([
      'LootSnob v41,627 rules, endgame',
      'ILT Legendary1,632 rules, legendary gear',
      'IAC Leveling56 rules, levels 1 to 275',
      'Empty profileBuild your own',
    ])
    const levels = within(screen.getByRole('radiogroup', { name: 'Strictness' })).getAllByRole('radio')
    expect(levels.map((b) => b.textContent)).toEqual(['Very strict', 'Strict', 'Regular', 'Soft'])
  })

  it('shows the character fields and the Trophies groups', () => {
    renderPage()
    expect((screen.getByLabelText('Main skill') as HTMLSelectElement).value).toBe('heavy')
    expect((screen.getByLabelText('Level') as HTMLInputElement).value).toBe('126')
    expect((screen.getByLabelText('Free pack slots to keep') as HTMLInputElement).value).toBe('12')
    const pills = within(screen.getByRole('group', { name: 'Also keep' })).getAllByRole('button')
    // The 19 sub-sections of the Trophies section of LootSnobV4.utl.
    expect(pills).toHaveLength(19)
    expect(pills[0]!.textContent).toBe('Aetheria2/5')
  })

  it('turns the rules on and off when a strictness level is picked', () => {
    const { onChange } = renderPage()
    fireEvent.click(screen.getByRole('radio', { name: 'Very strict' }))
    const next = onChange.mock.calls[0]![0] as LootProfile
    const names = onNames(next)
    expect(names).toContain('(H) Axe (OD +10)')
    expect(names).not.toContain('(H) Axe (OD +8)')
  })

  it('turns the rules of the other weapon types off when the main skill changes', () => {
    const { onChange } = renderPage()
    fireEvent.change(screen.getByLabelText('Main skill'), { target: { value: 'light' } })
    const next = onChange.mock.calls[0]![0] as LootProfile
    const names = onNames(next)
    expect(names.some((n) => n.startsWith('(H)'))).toBe(false)
    expect(names.some((n) => n.startsWith('(L)'))).toBe(true)
  })

  it('loads a base profile when a card is clicked', () => {
    const { onLoadBase } = renderPage()
    fireEvent.click(screen.getByRole('button', { name: /IAC Leveling/ }))
    expect(onLoadBase).toHaveBeenCalledTimes(1)
    const [loaded, name] = onLoadBase.mock.calls[0] as [LootProfile, string]
    expect(loaded.rules).toHaveLength(56)
    expect(name).toBe('IAC_Level_NoCash.utl')
  })

  it('applies the strictness level and the weapon choice to the base profile', () => {
    const { onChange } = renderPage()
    fireEvent.click(screen.getByRole('button', { name: /LootSnob v4/ }))
    const next = onChange.mock.calls[0]![0] as LootProfile
    const names = onNames(next)
    // The Regular level keeps the best six rungs of a ladder.
    expect(names).toContain('(H) Axe (OD +5)')
    expect(names).not.toContain('(H) Axe (OD +4)')
    // The character is heavy, so the light rules go off.
    expect(names.some((n) => n.startsWith('(L)'))).toBe(false)
  })

  it('marks the base profile of the open file', () => {
    renderPage({ fileName: 'LootSnobV4.utl' })
    const cards = within(screen.getByRole('group', { name: 'Base profiles' })).getAllByRole('button')
    expect(cards[0]!.getAttribute('aria-pressed')).toBe('true')
    expect(cards[1]!.getAttribute('aria-pressed')).toBe('false')
  })

  it('turns a Trophies group on and off', () => {
    const { onChange } = renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Aetheria/ }))
    const next = onChange.mock.calls[0]![0] as LootProfile
    const aetheria = next.rules.filter((r) => r.name.startsWith('    (T) Aetheria'))
    expect(aetheria.length).toBe(5)
    expect(aetheria.every((r) => !isRuleDisabled(r))).toBe(true)
  })

  it('shows the sample items with the action of the profile', () => {
    renderPage()
    const items = within(screen.getByRole('complementary')).getAllByRole('listitem')
    expect(items).toHaveLength(20)
    expect(items[0]!.textContent).toContain('Health Philtre')
  })

  it('opens the full loot preview', () => {
    const { onOpenPreview } = renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Open the full loot preview' }))
    expect(onOpenPreview).toHaveBeenCalledTimes(1)
  })
})

describe('App Overview tab', () => {
  it('the Overview tab shows the page and hides the rule list', () => {
    render(<App initialProfile={snob()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))
    expect(screen.getByRole('tabpanel', { name: 'Overview' })).toBeTruthy()
    expect(screen.queryByRole('tabpanel', { name: 'Loot Rules' })).toBeNull()
  })

  it('a strictness level of the Overview tab changes the rules of the profile', () => {
    render(<App initialProfile={snob()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Very strict' }))
    // The rule list of the Loot Rules tab shows the new state in its badge.
    fireEvent.click(screen.getByRole('tab', { name: 'Loot Rules' }))
    const names = screen.getAllByRole('button').map((b) => b.textContent ?? '')
    expect(names.find((n) => n.includes('(H) Axe (OD +8)'))).toContain('Off')
    expect(names.find((n) => n.includes('(H) Axe (OD +10)'))).not.toContain('Off')
  })
})
