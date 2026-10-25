// @vitest-environment jsdom
// T28: the requirement field editor. The fields and labels copy the UI_*
// methods in ref/shared/LootRules.cs; see docs/ui.md.

import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Requirement } from '../core/format/profile'
import { parseColorSlots } from '../core/gamedata/colorslots'
import { indexFromKeyValue, keyValueFromIndex } from '../core/gamedata/combokeys'
import { intValueKey } from '../core/gamedata/generated'
import { ReqEditor } from './ReqEditor'

afterEach(cleanup)

const ARMOR_GROUPS = [...parseColorSlots(readFileSync('fixtures/ColorSlots.Default.xml', 'utf8')).keys()]

const LONG_VAL_KEY_GE: Requirement = { type: 3, keyval: 25, vk: intValueKey.Material }

describe('ReqEditor', () => {
  it('shows the acts-on combo and the value of a LongValKeyGE', () => {
    render(<ReqEditor req={LONG_VAL_KEY_GE} onChange={() => {}} />)
    const value = screen.getByLabelText('Long Value') as HTMLInputElement
    expect(value.value).toBe('25')
    const actsOn = screen.getByLabelText('Acts on') as HTMLSelectElement
    expect(actsOn.value).toBe(String(indexFromKeyValue('lvk', intValueKey.Material)))
    expect(actsOn.options.length).toBeGreaterThan(2)
  })

  it('typing a new long value gives a changed requirement', () => {
    let got: Requirement | undefined
    render(<ReqEditor req={LONG_VAL_KEY_GE} onChange={(r) => (got = r)} />)
    fireEvent.change(screen.getByLabelText('Long Value'), { target: { value: '99' } })
    expect(got).toEqual({ type: 3, keyval: 99, vk: intValueKey.Material })
  })

  it('picking another acts-on entry gives a changed key', () => {
    let got: Requirement | undefined
    render(<ReqEditor req={LONG_VAL_KEY_GE} onChange={(r) => (got = r)} />)
    fireEvent.change(screen.getByLabelText('Acts on'), { target: { value: '0' } })
    expect(got).toEqual({ type: 3, keyval: 25, vk: keyValueFromIndex('lvk', 0) })
  })

  it('shows a color sample for a similar color requirement', () => {
    const req: Requirement = { type: 14, r: 255, g: 0, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1 }
    render(<ReqEditor req={req} onChange={() => {}} />)
    expect((screen.getByRole('img', { name: 'Color sample' }) as HTMLElement).style.backgroundColor).toBe(
      'rgb(255, 0, 0)',
    )
    expect(screen.getByLabelText('Max diff (Hue 0-255)')).toBeTruthy()
  })

  it('lists the armor groups of the color slot file for type 15', () => {
    const req: Requirement = { type: 15, r: 255, g: 255, b: 255, maxDifferenceH: 10, maxDifferenceSV: 0.1, armorGroup: '' }
    render(<ReqEditor req={req} armorGroups={ARMOR_GROUPS} onChange={() => {}} />)
    const actsOn = screen.getByLabelText('Armor Type/Color Region') as HTMLSelectElement
    // One option more than the list: the empty one for "nothing selected".
    expect(actsOn.options.length).toBe(ARMOR_GROUPS.length + 1)
    expect(actsOn.selectedOptions[0]!.textContent).toBe('')
  })

  it('shows the armor preview text of a type 15 requirement, and none for type 17', () => {
    const req: Requirement = {
      type: 15,
      r: 0x30,
      g: 0x60,
      b: 0xc0,
      maxDifferenceH: 10,
      maxDifferenceSV: 0.1,
      armorGroup: 'Amuli Coat (Chest)',
    }
    const { rerender } = render(<ReqEditor req={req} armorGroups={ARMOR_GROUPS} onChange={() => {}} />)
    // jsdom has no WebGL, so the view shows its text alternative.
    expect(screen.getByText('Amuli Coat, Chest in #3060C0')).toBeTruthy()
    rerender(<ReqEditor req={{ ...req, r: 0xff }} armorGroups={ARMOR_GROUPS} onChange={() => {}} />)
    expect(screen.getByText('Amuli Coat, Chest in #FF60C0')).toBeTruthy()
    rerender(<ReqEditor req={{ type: 17, slot: 2, palette: 90 }} onChange={() => {}} />)
    expect(document.querySelector('.armor-preview')).toBeNull()
  })

  it('a colour change in the field updates the armor preview text', () => {
    function Editor() {
      const [req, setReq] = useState<Requirement>({ type: 14, r: 0, g: 0, b: 0, maxDifferenceH: 10, maxDifferenceSV: 0.1 })
      return <ReqEditor req={req} onChange={setReq} />
    }
    render(<Editor />)
    expect(screen.getByText('Armor suit, every region in #000000')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('RGB color value (hex)'), { target: { value: '3060C0' } })
    expect(screen.getByText('Armor suit, every region in #3060C0')).toBeTruthy()
  })

  it('type 16 shows the slot note under the armor preview', () => {
    const req: Requirement = { type: 16, r: 1, g: 2, b: 3, maxDifferenceH: 10, maxDifferenceSV: 0.1, slot: 4 }
    render(<ReqEditor req={req} onChange={() => {}} />)
    expect(screen.getByText('Slot 4: the region depends on the armor.')).toBeTruthy()
  })

  it('keeps a regex field as text and never compiles it', () => {
    let got: Requirement | undefined
    render(<ReqEditor req={{ type: 0, pattern: 'x' }} onChange={(r) => (got = r)} />)
    fireEvent.change(screen.getByLabelText('Spell Name Pattern'), { target: { value: 'a(' } })
    expect(got).toEqual({ type: 0, pattern: 'a(' })
  })
})
