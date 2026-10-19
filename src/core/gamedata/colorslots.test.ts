// Tests for the color slot definitions (T17). The C# is
// ref/shared/ColorXML.cs (LoadColorXMLDefinitions, lines 51-120).

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseColorSlots } from './colorslots'

const fixtureXml = readFileSync(new URL('../../../fixtures/ColorSlots.Default.xml', import.meta.url), 'utf8')

describe('parseColorSlots on the shipped default file', () => {
  const slots = parseColorSlots(fixtureXml)

  it('always has None with an empty list', () => {
    expect(slots.get('None')).toEqual([])
  })

  it('reads 63 slot definitions from the file', () => {
    const names = [...slots.keys()].filter((name) => name !== 'None')
    expect(names).toHaveLength(63)
  })

  it('reads known definitions with their palette entries in file order', () => {
    expect(slots.get('Amuli Coat (Chest)')).toEqual([0])
    expect(slots.get('Amuli Coat (Collar/Shoulder)')).toEqual([1, 2])
    // Tab-indented entry line.
    expect(slots.get('Chiran Legs (Girth)')).toEqual([1])
    expect(slots.get('Olthoi Amuli Legs (Trim)')).toEqual([6, 7, 8])
  })

  it('ignores the commented-out Diforsa definitions', () => {
    expect(slots.has('Diforsa Greaves')).toBe(false)
    expect(slots.has('Diforsa Pauldrons')).toBe(false)
  })
})

describe('parseColorSlots edge cases', () => {
  const one = (body: string) =>
    parseColorSlots(`<?xml version="1.0"?>\n<VTClassicColorInfo>${body}</VTClassicColorInfo>`)

  it('matches the slotdef tag case-insensitively and the entry tag case-sensitively', () => {
    const slots = one(`<SLOTDEF name="A"><entry value="1"/><Entry value="2"/></SLOTDEF>`)
    expect(slots.get('A')).toEqual([1])
  })

  it('keeps a slotdef that has no entries as an empty list', () => {
    expect(one(`<slotdef name="Empty"></slotdef>`).get('Empty')).toEqual([])
  })

  it('lets a later definition of the same name overwrite the first', () => {
    const slots = one(
      `<slotdef name="A"><entry value="1"/></slotdef><slotdef name="A"><entry value="9"/></slotdef>`,
    )
    expect(slots.get('A')).toEqual([9])
  })

  it('skips the whole slotdef when the name or a value is bad (C# try/catch)', () => {
    const slots = one(
      `<slotdef><entry value="1"/></slotdef>` +
        `<slotdef name="Bad"><entry value="x"/></slotdef>` +
        `<slotdef name="Good"><entry value="3"/></slotdef>`,
    )
    expect(slots.has('')).toBe(false)
    expect(slots.has('Bad')).toBe(false)
    expect(slots.get('Good')).toEqual([3])
  })

  it('skips a value that is not a 32-bit int (C# int.Parse throws)', () => {
    const slots = one(`<slotdef name="Big"><entry value="99999999999"/></slotdef>`)
    expect(slots.has('Big')).toBe(false)
  })
})
