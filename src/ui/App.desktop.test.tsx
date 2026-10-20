// @vitest-environment jsdom
// T32: the desktop path of the App. The native dialogs of src/ui/desktopio.ts
// replace the browser file access when the `desktop` prop is set, and the
// `.bak` backup of the `FileChanged` setter runs behind the 5-minute clock
// (ref/editor/Form1.cs 407-427, 429-464).

import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eLootAction } from '../core/format/enums'
import type { LootProfile } from '../core/format/profile'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { open, save } from '@tauri-apps/plugin-dialog'
import { App } from './App'

vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => true) }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }))
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn() }))

const MINIMAL = readFileSync('fixtures/vtclassic_editor_minimal.utl', 'utf8')

function smallProfile(): LootProfile {
  return {
    version: 1,
    extraBlocks: [],
    rules: [
      {
        name: 'Beta',
        customExpression: '',
        priority: 0,
        action: eLootAction.Keep,
        lootActionData: 0,
        requirements: [],
      },
    ],
  }
}

function ruleNames(): string[] {
  // The row also carries its action badge, so the name comes from its span.
  return within(screen.getByRole('list', { name: 'Rules' }))
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('.rule-name')?.textContent ?? '')
}

function pick(menu: string, item: string) {
  fireEvent.click(screen.getByRole('button', { name: menu }))
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Main menu' })).getByRole('button', { name: item }),
  )
}

function editRule() {
  const items = within(screen.getByRole('list', { name: 'Rules' })).getAllByRole('listitem')
  fireEvent.click(within(items[0]!).getByRole('button'))
  fireEvent.change(screen.getByLabelText('Rule Name'), { target: { value: 'Renamed' } })
}

function writtenPaths(): (string | URL)[] {
  return vi.mocked(writeTextFile).mock.calls.map(([path]) => path)
}

beforeEach(() => {
  vi.mocked(readTextFile).mockResolvedValue(MINIMAL)
  vi.mocked(writeTextFile).mockResolvedValue()
  vi.mocked(open).mockResolvedValue('/profiles/mine.utl')
  vi.mocked(save).mockResolvedValue('/profiles/new.utl')
})

afterEach(() => {
  vi.clearAllMocks()
  cleanup()
})

describe('App in the desktop build', () => {
  it('File > Open reads the file of the native dialog and shows its rules', async () => {
    render(<App initialProfile={smallProfile()} desktop />)
    pick('File', 'Open')
    await waitFor(() => expect(ruleNames()).toEqual(['fixture_minimal_editor']))
    expect(open).toHaveBeenCalledTimes(1)
    expect(readTextFile).toHaveBeenCalledWith('/profiles/mine.utl')
  })

  it('Save writes the edited profile back to the open path', async () => {
    render(<App initialProfile={smallProfile()} desktop />)
    pick('File', 'Open')
    await waitFor(() => expect(ruleNames()).toEqual(['fixture_minimal_editor']))
    editRule()
    pick('File', 'Save')
    await waitFor(() => expect(vi.mocked(writeTextFile).mock.calls.length).toBeGreaterThan(0))
    // Save without Save As does not ask for a path.
    expect(save).not.toHaveBeenCalled()
    const last = vi.mocked(writeTextFile).mock.calls.at(-1)!
    expect(last[0]).toBe('/profiles/mine.utl')
    expect(String(last[1])).toContain('Renamed')
  })

  it('Save As asks for a path and writes to it', async () => {
    render(<App initialProfile={smallProfile()} desktop />)
    editRule()
    pick('File', 'Save As')
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(writtenPaths().at(-1)).toBe('/profiles/new.utl'))
  })

  it('a bad file at Open writes over neither the file nor the open path', async () => {
    render(<App initialProfile={smallProfile()} desktop />)
    pick('File', 'Open')
    await waitFor(() => expect(ruleNames()).toEqual(['fixture_minimal_editor']))
    // A second Open picks a file that is not a profile: the first file stays
    // open, and a Save must still write to it.
    vi.mocked(readTextFile).mockResolvedValue('not a profile')
    vi.mocked(open).mockResolvedValue('/profiles/bad.utl')
    pick('File', 'Open')
    await waitFor(() => expect(screen.getByText('Could not read bad.utl.')).toBeTruthy())
    expect(ruleNames()).toEqual(['fixture_minimal_editor'])
    editRule()
    pick('File', 'Save')
    await waitFor(() => expect(writtenPaths().at(-1)).toBe('/profiles/mine.utl'))
    expect(writtenPaths()).not.toContain('/profiles/bad.utl')
  })

  it('takes the .bak backup of the first save after a load', async () => {
    render(<App initialProfile={smallProfile()} desktop />)
    pick('File', 'Open')
    await waitFor(() => expect(ruleNames()).toEqual(['fixture_minimal_editor']))
    editRule()
    // The stamp is local time, so build the instant in local time too.
    const at = new Date(2026, 9, 19, 21, 5).getTime()
    const now = vi.spyOn(Date, 'now').mockReturnValue(at)
    pick('File', 'Save')
    await waitFor(() => expect(writtenPaths()).toHaveLength(2))
    // A load resets `LastBackup`, so the backup is the first path of the pair.
    expect(writtenPaths()[0]).toBe('/profiles/mine.utl.2026-10-19-21-05.bak')
    expect(writtenPaths()[1]).toBe('/profiles/mine.utl')
    // The next save is inside the 5-minute window, so it writes no backup.
    now.mockReturnValue(at + 4 * 60 * 1000)
    editRule()
    pick('File', 'Save')
    await waitFor(() => expect(writtenPaths()).toHaveLength(3))
    expect(writtenPaths()[2]).toBe('/profiles/mine.utl')
    // Past 5 minutes it writes another one (`TotalMinutes > 5d`).
    now.mockReturnValue(at + 6 * 60 * 1000)
    editRule()
    pick('File', 'Save')
    await waitFor(() => expect(writtenPaths()).toHaveLength(5))
    expect(writtenPaths()[3]).toBe('/profiles/mine.utl.2026-10-19-21-11.bak')
    expect(writtenPaths()[4]).toBe('/profiles/mine.utl')
  })
})
