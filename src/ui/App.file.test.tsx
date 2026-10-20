// @vitest-environment jsdom
// T31: open and save in the browser, the changed flag of every profile edit
// and the unsaved-changes prompt (ref/editor/Form1.cs 292-464, 1048-1052).

import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { eLootAction, eLootRuleType } from '../core/format/enums'
import type { LootProfile } from '../core/format/profile'
import { readProfile } from '../core/format/profile'
import { App } from './App'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  cleanup()
})

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
        requirements: [{ type: eLootRuleType.DoubleValKeyGE, keyval: 2, vk: 167772169 }],
      },
      {
        name: 'Alpha',
        customExpression: '',
        priority: 0,
        action: eLootAction.Sell,
        lootActionData: 0,
        requirements: [],
      },
    ],
  }
}

function ruleNames(): string[] {
  return within(screen.getByRole('list', { name: 'Rules' }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent ?? '')
}

function ruleButton(index: number): HTMLButtonElement {
  const items = within(screen.getByRole('list', { name: 'Rules' })).getAllByRole('listitem')
  return within(items[index]!).getByRole('button') as HTMLButtonElement
}

function pick(menu: string, item: string) {
  fireEvent.click(screen.getByRole('button', { name: menu }))
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Main menu' })).getByRole('button', { name: item }),
  )
}

/** Rename the first rule, which marks the file changed. */
function editRule() {
  fireEvent.click(ruleButton(0))
  fireEvent.change(screen.getByLabelText('Rule Name'), { target: { value: 'Renamed' } })
}

function promptButton(name: string): HTMLButtonElement {
  return within(screen.getByRole('dialog')).getByRole('button', { name }) as HTMLButtonElement
}

/**
 * The download path (no File System Access API). It returns the names the
 * app downloads.
 */
function stubDownload(): string[] {
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:x'), configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
  const downloads: string[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download)
  })
  return downloads
}

function stubPickers(
  open: ReturnType<typeof vi.fn>,
  save: ReturnType<typeof vi.fn>,
): void {
  vi.stubGlobal('showOpenFilePicker', open)
  vi.stubGlobal('showSaveFilePicker', save)
}

function cancelledPicker(): ReturnType<typeof vi.fn> {
  return vi.fn(async () => {
    throw new DOMException('aborted', 'AbortError')
  })
}

describe('App unsaved changes', () => {
  it('an edit then File > New asks first, and No starts the new file', () => {
    render(<App initialProfile={smallProfile()} />)
    editRule()
    pick('File', 'New')
    expect(within(screen.getByRole('dialog')).getByText('File not saved. Save now?')).toBeTruthy()
    // The profile is still there while the box is open.
    expect(ruleNames()).toEqual(['Renamed', 'Alpha'])
    fireEvent.click(promptButton('No'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ruleNames()).toHaveLength(0)
  })

  it('Cancel in the prompt keeps the profile and asks again', () => {
    render(<App initialProfile={smallProfile()} />)
    editRule()
    pick('File', 'New')
    fireEvent.click(promptButton('Cancel'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ruleNames()).toEqual(['Renamed', 'Alpha'])
    pick('File', 'New')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('Yes in the prompt saves first, then starts the new file', async () => {
    const downloads = stubDownload()
    render(<App initialProfile={smallProfile()} />)
    editRule()
    pick('File', 'New')
    fireEvent.click(promptButton('Yes'))
    await waitFor(() => expect(ruleNames()).toHaveLength(0))
    expect(downloads).toEqual(['New File.utl'])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('File > New without changes does not ask', () => {
    render(<App initialProfile={smallProfile()} />)
    pick('File', 'New')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ruleNames()).toHaveLength(0)
  })

  it('an edit in the Salvage Combination tab asks before File > New', () => {
    const profile = readProfile(readFileSync('fixtures/BuffedLongBuffedDouble.utl', 'utf8'))
    render(<App initialProfile={profile} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Salvage Combination' }))
    fireEvent.change(screen.getByLabelText('Default Combine Range'), {
      target: { value: '1-2' },
    })
    pick('File', 'New')
    expect(within(screen.getByRole('dialog')).getByText('File not saved. Save now?')).toBeTruthy()
  })

  it('File > Exit asks when changed and closes the window on No', () => {
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})
    render(<App initialProfile={smallProfile()} />)
    editRule()
    pick('File', 'Exit')
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(promptButton('No'))
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('beforeunload asks only when the file changed', () => {
    render(<App initialProfile={smallProfile()} />)
    function leave(): boolean {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(leave()).toBe(false)
    editRule()
    expect(leave()).toBe(true)
  })
})

describe('App open and save', () => {
  it('Save downloads the profile and clears the changed flag', async () => {
    const downloads = stubDownload()
    render(<App initialProfile={smallProfile()} />)
    editRule()
    pick('File', 'Save')
    await waitFor(() => expect(downloads).toHaveLength(1))
    expect(downloads[0]).toBe('New File.utl')
    // The file is clean again, so New does not ask.
    pick('File', 'New')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ruleNames()).toHaveLength(0)
  })

  it('Save and Save As write through the File System Access API', async () => {
    const writes: string[] = []
    const handle = {
      name: 'mine.utl',
      createWritable: async () => ({
        write: async (text: string) => {
          writes.push(text)
        },
        close: async () => {},
      }),
    } as unknown as FileSystemFileHandle
    const showSaveFilePicker = vi.fn(async () => handle)
    stubPickers(cancelledPicker(), showSaveFilePicker)
    render(<App initialProfile={smallProfile()} />)
    editRule()
    pick('File', 'Save')
    await waitFor(() => expect(writes).toHaveLength(1))
    expect(writes[0]).toContain('Renamed')
    // The picked file is the current one now, so the next Save skips the picker.
    pick('File', 'Save')
    await waitFor(() => expect(writes).toHaveLength(2))
    expect(showSaveFilePicker).toHaveBeenCalledTimes(1)
    pick('File', 'Save As')
    await waitFor(() => expect(showSaveFilePicker).toHaveBeenCalledTimes(2))
  })

  it('a write that fails keeps the profile and shows an error', async () => {
    const handle = {
      name: 'full.utl',
      createWritable: async () => {
        throw new DOMException('disk full', 'NotAllowedError')
      },
    } as unknown as FileSystemFileHandle
    stubPickers(cancelledPicker(), vi.fn(async () => handle))
    render(<App initialProfile={smallProfile()} />)
    editRule()
    pick('File', 'Save As')
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(ruleNames()).toEqual(['Renamed', 'Alpha'])
    // The edits are still there, so New asks again.
    pick('File', 'New')
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('File > Open loads the profile and clears the changed flag', async () => {
    const text = readFileSync('fixtures/vtclassic_editor_minimal.utl', 'utf8')
    const handle = {
      name: 'minimal.utl',
      getFile: async () => new File([text], 'minimal.utl'),
    } as unknown as FileSystemFileHandle
    const showOpenFilePicker = vi.fn(async () => [handle])
    stubPickers(showOpenFilePicker, cancelledPicker())
    render(<App initialProfile={smallProfile()} />)
    editRule()
    // The edited file asks first (Form1.cs 329-330).
    pick('File', 'Open')
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(promptButton('No'))
    await waitFor(() => expect(showOpenFilePicker).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(ruleNames()).toEqual(['fixture_minimal_editor']))
    // The loaded file is clean, so New does not ask.
    pick('File', 'New')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('a file the reader cannot read keeps the profile and shows an error', async () => {
    // Version 99 is above MAX_PROFILE_VERSION, so readProfile throws.
    const handle = {
      name: 'bad.utl',
      getFile: async () => new File(['UTL\n99\n0'], 'bad.utl'),
    } as unknown as FileSystemFileHandle
    stubPickers(vi.fn(async () => [handle]), cancelledPicker())
    render(<App initialProfile={smallProfile()} />)
    pick('File', 'Open')
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(ruleNames()).toEqual(['Beta', 'Alpha'])
  })
})
