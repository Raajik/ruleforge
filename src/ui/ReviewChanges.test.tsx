// @vitest-environment jsdom
// H4: the Review changes page shows each change of the current profile
// against the base profile, with one Undo for each change.

import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { eLootAction } from '../core/format/enums'
import type { LootProfile, LootRule, Requirement } from '../core/format/profile'
import { diffProfiles } from '../core/ops/review'
import { App } from './App'
import { ReviewChanges } from './ReviewChanges'

afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

function rule(name: string, action: number = eLootAction.Keep, requirements: Requirement[] = []): LootRule {
  return { name, customExpression: '', priority: 0, action, lootActionData: 0, requirements }
}

function profile(...rules: LootRule[]): LootProfile {
  return { version: 1, rules, extraBlocks: [] }
}

function changeList(): HTMLElement {
  return screen.getByRole('list', { name: 'Changes' })
}

describe('ReviewChanges page', () => {
  it('shows each change with one Undo', () => {
    const base = profile(rule('a'), rule('b', eLootAction.Keep, [{ type: 6, keyval: 1 }]))
    const current = profile(rule('a', eLootAction.Sell), rule('c'))
    const changes = diffProfiles(base, current)
    render(<ReviewChanges changes={changes} profile={current} onChange={() => {}} />)
    const list = changeList()
    expect(within(list).getAllByRole('button', { name: /Undo/ })).toHaveLength(3)
    // The button names the rule, so a screen reader gives the context.
    expect(within(list).getByRole('button', { name: 'Undo the change of a' })).toBeTruthy()
    expect(list.textContent).toContain('Action: Keep -> Sell')
    expect(list.textContent).toContain('added')
    expect(list.textContent).toContain('removed')
  })

  it('shows the number of changes', () => {
    const base = profile(rule('a'))
    const current = profile(rule('a', eLootAction.Sell))
    render(<ReviewChanges changes={diffProfiles(base, current)} profile={current} onChange={() => {}} />)
    expect(screen.getByText('1 change against the base profile.')).toBeTruthy()
  })

  it('shows a line when there are no changes', () => {
    const base = profile(rule('a'))
    render(<ReviewChanges changes={diffProfiles(base, base)} profile={base} onChange={() => {}} />)
    expect(screen.getByText('No changes against the base profile.')).toBeTruthy()
  })

  it('the Undo of a change gives the base rule back', () => {
    const base = profile(rule('a'), rule('b'))
    const current = profile(rule('a', eLootAction.Sell), rule('b'))
    const onChange = vi.fn()
    render(<ReviewChanges changes={diffProfiles(base, current)} profile={current} onChange={onChange} />)
    const undos = within(changeList()).getAllByRole('button', { name: /Undo/ })
    expect(undos).toHaveLength(1)
    fireEvent.click(undos[0]!)
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]![0] as LootProfile
    expect(next.rules.map((r) => [r.name, r.action])).toEqual([
      ['a', eLootAction.Keep],
      ['b', eLootAction.Keep],
    ])
  })

  it('shows the changed requirements of a rule', () => {
    const base = profile({
      ...rule('a'),
      requirements: [{ type: 9999, b: true }],
    })
    const current = profile(rule('a'))
    render(<ReviewChanges changes={diffProfiles(base, current)} profile={current} onChange={() => {}} />)
    expect(changeList().textContent).toContain('Requirement removed: Disabled')
  })
})

describe('the Review changes tab of the App', () => {
  it('shows the changes against the base profile', () => {
    const base = profile(rule('a'), rule('b'))
    render(<App initialProfile={base} />)
    // The action of the first rule changes.
    fireEvent.click(within(screen.getByRole('list', { name: 'Rules' })).getAllByRole('button')[0]!)
    fireEvent.change(screen.getByLabelText('Action'), { target: { value: String(eLootAction.Sell) } })
    fireEvent.click(screen.getByRole('tab', { name: /Review changes/ }))
    const list = changeList()
    expect(list.textContent).toContain('Action: Keep -> Sell')
    // The tab shows the number of changes.
    expect(screen.getByRole('tab', { name: /Review changes/ }).textContent).toContain('1')
    // The Undo takes the change back.
    fireEvent.click(within(list).getByRole('button', { name: /Undo/ }))
    expect(screen.getByText('No changes against the base profile.')).toBeTruthy()
  })

  it('the base profile is the file that the user opened', async () => {
    const text = readFileSync('fixtures/vtclassic_editor_minimal.utl', 'utf8')
    const handle = {
      name: 'minimal.utl',
      getFile: async () => new File([text], 'minimal.utl'),
    } as unknown as FileSystemFileHandle
    vi.stubGlobal('showOpenFilePicker', vi.fn(async () => [handle]))
    render(<App initialProfile={profile(rule('a'))} />)
    fireEvent.click(screen.getByRole('button', { name: 'File' }))
    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Main menu' })).getByRole('button', { name: 'Open' }),
    )
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: 'Rules' })).getAllByRole('listitem'),
      ).toHaveLength(1),
    )
    fireEvent.click(screen.getByRole('tab', { name: /Review changes/ }))
    // The opened file is the base, so it has no changes.
    expect(screen.getByText('No changes against the base profile.')).toBeTruthy()
  })
})
