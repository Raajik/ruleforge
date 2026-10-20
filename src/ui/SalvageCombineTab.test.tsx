// @vitest-environment jsdom
// Tests for the Salvage Combination tab (T30). The C# is ref/editor/Form_SalvageTab.cs.

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import type { LootProfile } from '../core/format/profile'
import { SalvageCombineTab } from './SalvageCombineTab'

afterEach(cleanup)

const start: LootProfile = {
  version: 1,
  rules: [],
  extraBlocks: [
    {
      kind: 'salvageCombine',
      defaultCombineString: '1-10',
      materialCombineStrings: new Map([
        [10, '1-5'],
        [13, '3-4'],
      ]),
      materialValueModeValues: new Map(),
    },
  ],
}

function Harness() {
  const [profile, setProfile] = useState(start)
  return <SalvageCombineTab profile={profile} onChange={setProfile} />
}

function entries(): string[] {
  return screen.getAllByRole('listitem').map((li) => li.textContent ?? '')
}

describe('SalvageCombineTab', () => {
  it('edits the range of the selected entry', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /3-4/ }))
    fireEvent.change(screen.getByLabelText('Combine Range'), { target: { value: '5-6' } })
    expect(entries()[1]).toMatch(/: 5-6$/)
  })

  it('keeps the selection on the entry after a material change', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /1-5/ }))
    const material = screen.getByLabelText('Material') as HTMLSelectElement
    const other = [...material.options].find((o) => o.value !== '10' && o.value !== '13')!
    fireEvent.change(material, { target: { value: other.value } })
    // The entry moves to the end, and the editor still shows its range.
    expect(entries()[1]).toMatch(/: 1-5$/)
    expect((screen.getByLabelText('Combine Range') as HTMLInputElement).value).toBe('1-5')
    expect((screen.getByLabelText('Material') as HTMLSelectElement).value).toBe(other.value)
  })

  it('adds an entry with the default range and deletes it', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'New' }))
    expect(entries()).toHaveLength(3)
    expect(entries()[2]).toMatch(/: 1-10$/)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(entries()).toHaveLength(2)
  })
})
