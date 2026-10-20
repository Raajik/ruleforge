// @vitest-environment jsdom
// T29: the menus, the toolbar, the buttons and the keyboard connect the App
// to the ops of phase E. The control names come from
// ref/editor/Form1.Designer.cs (see docs/ui.md).

import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eLootAction, eLootRuleType } from '../core/format/enums'
import type { LootProfile } from '../core/format/profile'
import { readProfile } from '../core/format/profile'
import { autoSortRules } from '../core/ops/sort'
import { App } from './App'

let clipboardText = ''
let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  // jsdom has no crypto.subtle; copyRuleText needs it for the sha256 hash.
  vi.stubGlobal('crypto', webcrypto)
  clipboardText = ''
  writeText = vi.fn(async (text: string) => {
    clipboardText = text
  })
  const readText = vi.fn(async () => clipboardText)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText, readText }, configurable: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
})

function iac(): LootProfile {
  return readProfile(readFileSync('fixtures/IAC_Level_NoCash.utl', 'utf8'))
}

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
  // The row also carries its action badge, so the name comes from its span.
  return within(screen.getByRole('list', { name: 'Rules' }))
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('.rule-name')?.textContent ?? '')
}

function ruleButton(index: number): HTMLButtonElement {
  const items = within(screen.getByRole('list', { name: 'Rules' })).getAllByRole('listitem')
  return within(items[index]!).getByRole('button') as HTMLButtonElement
}

function reqNames(): string[] {
  return within(screen.getByRole('list', { name: 'Requirements' }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent ?? '')
}

function pick(menu: string, item: string) {
  fireEvent.click(screen.getByRole('button', { name: menu }))
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Main menu' })).getByRole('button', { name: item }),
  )
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('App menus', () => {
  it('a click on "Auto-Sort Rules" changes the rule order', () => {
    const profile = iac()
    render(<App initialProfile={profile} />)
    const sorted = autoSortRules(profile).rules.map((r) => r.name)
    expect(ruleNames()).not.toEqual(sorted)
    pick('Rule', 'Auto-Sort Rules')
    expect(ruleNames()).toEqual(sorted)
    // The C# auto-sort clears the selection (Form1.cs 828-830).
    expect(screen.queryByLabelText('Rule Name')).toBeNull()
  })

  it('a click outside closes an open menu', () => {
    render(<App initialProfile={smallProfile()} />)
    fireEvent.click(screen.getByRole('button', { name: 'File' }))
    expect(screen.getByRole('button', { name: 'Save As' })).toBeTruthy()
    fireEvent.click(ruleButton(0))
    expect(screen.queryByRole('button', { name: 'Save As' })).toBeNull()
  })

  it('File > New resets the profile to an empty one', () => {
    render(<App initialProfile={iac()} />)
    pick('File', 'New')
    expect(ruleNames()).toHaveLength(0)
    expect(screen.getByText('Select a rule.')).toBeTruthy()
  })

  it('File > Open, Save and Save As use the browser file access, Exit closes the window', async () => {
    const openPicker = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError')
    })
    const savePicker = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError')
    })
    vi.stubGlobal('showOpenFilePicker', openPicker)
    vi.stubGlobal('showSaveFilePicker', savePicker)
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})
    render(<App initialProfile={smallProfile()} />)
    for (const item of ['Open', 'Save', 'Save As', 'Exit']) pick('File', item)
    await waitFor(() => expect(openPicker).toHaveBeenCalledTimes(1))
    expect(savePicker).toHaveBeenCalledTimes(2)
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('Edit > Copy Rule and Paste Rule move a rule through the clipboard', async () => {
    render(<App initialProfile={iac()} />)
    fireEvent.click(ruleButton(0))
    pick('Edit', 'Copy Rule')
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(String(writeText.mock.calls[0]![0])).toContain(ruleNames()[0]!)
    pick('Edit', 'Paste Rule')
    await waitFor(() => expect(ruleNames()).toHaveLength(57))
    expect(ruleNames()[56]).toBe(ruleNames()[0])
  })

  it('Paste Rule checks the hash, "Paste Rule Unchecked (Dangerous)" does not', async () => {
    render(<App initialProfile={iac()} />)
    fireEvent.click(ruleButton(0))
    pick('Edit', 'Copy Rule')
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    // Change the hash only. The rule text stays valid.
    clipboardText = `AAAA${clipboardText.slice(4)}`
    pick('Edit', 'Paste Rule')
    await flush()
    expect(ruleNames()).toHaveLength(56)
    pick('Edit', 'Paste Rule Unchecked (Dangerous)')
    await waitFor(() => expect(ruleNames()).toHaveLength(57))
  })

  it('Rule > Add Packslot Requirements adds the requirement through the dialog', () => {
    render(<App initialProfile={smallProfile()} />)
    pick('Rule', 'Add Packslot Requirements')
    const dialog = screen.getByRole('dialog')
    expect((within(dialog).getByLabelText('Minimum Packslots') as HTMLInputElement).value).toBe('1')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add missing' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(ruleButton(0))
    // The packslot requirement joins the DoubleValKeyGE that is already there.
    expect(reqNames()).toEqual(['DoubleValKeyGE', 'CharacterMainPackEmptySlotsGE'])
    // The Sell rule does not match the Keep action.
    fireEvent.click(ruleButton(1))
    expect(reqNames()).toEqual([])
  })

  it('Rule > Update Workmanship Requirements changes a value through the dialog', () => {
    render(<App initialProfile={smallProfile()} />)
    fireEvent.click(ruleButton(0))
    pick('Rule', 'Update Workmanship Requirements')
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Change by'), { target: { value: '3' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update' }))
    fireEvent.click(screen.getByRole('button', { name: 'DoubleValKeyGE' }))
    // Keep negates the change (Macros.cs 121), so 2 + (-3) = -1.
    expect((screen.getByLabelText('Double Value') as HTMLInputElement).value).toBe('-1')
  })

  it('Rule > Add/Update Salvage Rules adds one rule per material through the dialog', () => {
    render(<App initialProfile={smallProfile()} />)
    pick('Rule', 'Add/Update Salvage Rules')
    const dialog = screen.getByRole('dialog')
    // The C# combo starts at the first SortedDictionary key (AddSalvageRulesForm.cs 17-25).
    expect((within(dialog).getByLabelText('Material Group') as HTMLSelectElement).value).toBe(
      'Armor Imbues',
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add rules' }))
    const names = ruleNames()
    // Armor Imbues has 3 materials (generated.ts).
    expect(names).toHaveLength(5)
    expect(names.slice(2).every((name) => name.startsWith('S: '))).toBe(true)
  })

  it('Cancel in a dialog closes it and leaves the profile alone', () => {
    render(<App initialProfile={smallProfile()} />)
    pick('Rule', 'Add Packslot Requirements')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ruleNames()).toEqual(['Beta', 'Alpha'])
  })

  it('Combine > Export Ranges downloads the .ucr text', () => {
    const createObjectURL = vi.fn(() => 'blob:ranges')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<App initialProfile={iac()} />)
    pick('Combine', 'Export Ranges')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    click.mockRestore()
  })

  it('Combine > Import Ranges reads a .ucr file without touching the rules', async () => {
    render(<App initialProfile={iac()} />)
    const input = screen.getByLabelText('Import ranges file') as HTMLInputElement
    const click = vi.spyOn(input, 'click')
    pick('Combine', 'Import Ranges')
    expect(click).toHaveBeenCalledTimes(1)
    // The block content shows in T30. Here the read must not crash the app.
    fireEvent.change(input, { target: { files: [new File(['bad'], 'bad.ucr')] } })
    await flush()
    expect(ruleNames()).toHaveLength(56)
  })
})

describe('App toolbar', () => {
  it('the Copy rule and Paste rule buttons move a rule through the clipboard', async () => {
    render(<App initialProfile={smallProfile()} />)
    const first = ruleNames()[0]!
    // Copy acts on the selected rule, as the C# CopyCurrentRuleToClipboard does.
    fireEvent.click(ruleButton(0))
    fireEvent.click(screen.getByRole('button', { name: 'Copy rule' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Paste rule' }))
    await waitFor(() => expect(ruleNames()).toHaveLength(3))
    expect(ruleNames()[2]).toBe(first)
    // Ctrl overwrites the selected rule, as the C# tooltip says
    // (Form1.Designer.cs 972-973).
    fireEvent.click(ruleButton(1))
    fireEvent.click(screen.getByRole('button', { name: 'Paste rule' }), { ctrlKey: true })
    await waitFor(() => expect(ruleNames()).toEqual(['Beta', 'Beta', 'Beta']))
  })

  it('typing in the search box selects the match and "Go to next match" takes the next', () => {
    const profile = iac()
    render(<App initialProfile={profile} />)
    const matches = profile.rules
      .map((rule, index) => ({ index, name: rule.name }))
      .filter(({ name }) => name.toLowerCase().includes('t'))
    expect(matches.length).toBeGreaterThan(1)
    fireEvent.change(screen.getByPlaceholderText('Search for rule by name'), {
      target: { value: 't' },
    })
    expect(ruleButton(matches[0]!.index).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Go to next match' }))
    expect(ruleButton(matches[1]!.index).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('App buttons', () => {
  it('the rule buttons add, clone and delete rules', () => {
    render(<App initialProfile={smallProfile()} />)
    const ruleButtonRow = () => within(screen.getByRole('group', { name: 'Rule actions' }))
    fireEvent.click(ruleButton(0))
    fireEvent.click(ruleButtonRow().getByRole('button', { name: 'New' }))
    expect(ruleNames()).toEqual(['Beta', 'Alpha', 'New Rule'])
    expect(ruleButton(2).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(ruleButtonRow().getByRole('button', { name: 'Clone' }))
    expect(ruleNames()).toEqual(['Beta', 'Alpha', 'New Rule', 'New Rule'])
    fireEvent.click(ruleButtonRow().getByRole('button', { name: 'Delete' }))
    expect(ruleNames()).toEqual(['Beta', 'Alpha', 'New Rule'])
    // Ctrl puts the new rule after the selected one (Form1.cs 1003-1019).
    fireEvent.click(ruleButton(0))
    fireEvent.click(ruleButtonRow().getByRole('button', { name: 'New' }), { ctrlKey: true })
    expect(ruleNames()).toEqual(['Beta', 'New Rule', 'Alpha', 'New Rule'])
  })

  it('Move Up and Move Down move the selected rule, three places with Ctrl', () => {
    const profile = iac()
    render(<App initialProfile={profile} />)
    fireEvent.click(ruleButton(2))
    fireEvent.click(screen.getByRole('button', { name: 'Move Up' }))
    expect(ruleNames()[1]).toBe(profile.rules[2]!.name)
    expect(ruleNames()[2]).toBe(profile.rules[1]!.name)
    fireEvent.click(screen.getByRole('button', { name: 'Move Down' }), { ctrlKey: true })
    expect(ruleNames()[4]).toBe(profile.rules[2]!.name)
  })

  it('"Toggle this rule" adds a DisabledRule requirement', () => {
    render(<App initialProfile={smallProfile()} />)
    fireEvent.click(ruleButton(0))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle this rule' }))
    fireEvent.click(ruleButton(0))
    expect(reqNames()).toEqual(['DoubleValKeyGE', 'DisabledRule'])
  })

  it('the requirement buttons add, clone and delete requirements', () => {
    render(<App initialProfile={smallProfile()} />)
    fireEvent.click(ruleButton(0))
    const reqButton = (name: string) =>
      within(screen.getByRole('group', { name: 'Rule' })).getByRole('button', { name })
    fireEvent.click(reqButton('New'))
    expect(reqNames()).toEqual(['DoubleValKeyGE', 'SpellNameMatch'])
    fireEvent.click(reqButton('Clone'))
    expect(reqNames()).toEqual(['DoubleValKeyGE', 'SpellNameMatch', 'SpellNameMatch'])
    fireEvent.click(reqButton('Delete'))
    expect(reqNames()).toEqual(['DoubleValKeyGE', 'SpellNameMatch'])
  })
})

describe('App keyboard', () => {
  it('Ctrl+C and Ctrl+V copy and replace the selected rule', async () => {
    render(<App initialProfile={smallProfile()} />)
    fireEvent.click(ruleButton(0))
    fireEvent.keyDown(document, { key: 'c', ctrlKey: true })
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(String(writeText.mock.calls[0]![0])).toContain('Beta')
    fireEvent.click(ruleButton(1))
    fireEvent.keyDown(document, { key: 'v', ctrlKey: true })
    // Ctrl+paste replaces the selected rule in place (Form1.cs 1131-1147).
    await waitFor(() => expect(ruleNames()).toEqual(['Beta', 'Beta']))
  })

  it('Ctrl+C in a text box does not copy a rule', async () => {
    render(<App initialProfile={smallProfile()} />)
    fireEvent.keyDown(screen.getByPlaceholderText('Search for rule by name'), {
      key: 'c',
      ctrlKey: true,
    })
    await flush()
    expect(writeText).not.toHaveBeenCalled()
  })

  it('Ctrl+S and Ctrl+O use the browser file access, Delete removes the selected rule', async () => {
    const openPicker = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError')
    })
    const savePicker = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError')
    })
    vi.stubGlobal('showOpenFilePicker', openPicker)
    vi.stubGlobal('showSaveFilePicker', savePicker)
    render(<App initialProfile={smallProfile()} />)
    fireEvent.keyDown(document, { key: 's', ctrlKey: true })
    fireEvent.keyDown(document, { key: 'o', ctrlKey: true })
    await waitFor(() => expect(openPicker).toHaveBeenCalledTimes(1))
    expect(savePicker).toHaveBeenCalledTimes(1)
    fireEvent.click(ruleButton(0))
    fireEvent.keyDown(document, { key: 'Delete' })
    expect(ruleNames()).toEqual(['Alpha'])
  })
})

describe('App rule fields', () => {
  it('edits the rule name, the action and the keep count', () => {
    render(<App initialProfile={smallProfile()} />)
    fireEvent.click(ruleButton(0))

    // Form1.cs 577-587: the list shows the new name at once.
    fireEvent.change(screen.getByLabelText('Rule Name'), { target: { value: 'Renamed' } })
    expect(ruleNames()[0]).toBe('Renamed')

    // Form1.cs 589-617: only KeepUpTo shows the keep count box.
    expect(screen.queryByLabelText('Keep Count')).toBeNull()
    fireEvent.change(screen.getByLabelText('Action'), { target: { value: String(eLootAction.KeepUpTo) } })
    const keep = screen.getByLabelText('Keep Count') as HTMLInputElement
    fireEvent.change(keep, { target: { value: '7' } })
    expect(keep.value).toBe('7')
    // Form1.cs 619-629: int.TryParse stores 0 for bad text.
    fireEvent.change(keep, { target: { value: 'abc' } })
    expect(keep.value).toBe('0')
  })
})
