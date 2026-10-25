// The ClothingTable, PaletteSet and Palette parsers on crafted bytes.

import { describe, expect, it } from 'vitest'
import { concat, u16s, u32s } from '../../test/craftDat'
import { DatError } from './archive'
import { parseClothingTable, parsePalette, parsePaletteSet } from './clothing'

// One base effect (setup 0x02000001, one object with one texture swap), then
// two templates: 14 with two sub-palettes, 2 with one.
const TABLE = concat(
  u32s(0x100001a1),
  u16s(1, 64),
  u32s(0x02000001, 1, 9, 0x01000abc, 1, 0x05000001, 0x05000002),
  u16s(2, 64),
  u32s(14, 0x06001234, 2, 1, 1728, 192, 0x0f00001b, 2, 1024, 64, 1392, 96, 0x0f000023),
  u32s(2, 0x06005678, 1, 1, 768, 96, 0x0f000025),
)

describe('parseClothingTable', () => {
  it('reads the templates in file order with their sub-palettes and ranges', () => {
    const table = parseClothingTable(TABLE)
    expect(table.id).toBe(0x100001a1)
    expect([...table.templates.keys()]).toEqual([14, 2])
    expect(table.templates.get(14)).toEqual({
      icon: 0x06001234,
      subPalettes: [
        { ranges: [{ offset: 1728, count: 192 }], paletteSet: 0x0f00001b },
        { ranges: [{ offset: 1024, count: 64 }, { offset: 1392, count: 96 }], paletteSet: 0x0f000023 },
      ],
    })
  })

  it('throws a DatError on a count that cannot fit and on a file that ends early', () => {
    const huge = TABLE.slice()
    // The template count of the second hash table.
    new DataView(huge.buffer).setUint16(4 + 4 + 28, 0xffff, true)
    expect(() => parseClothingTable(huge)).toThrow(DatError)
    const many = TABLE.slice()
    // The sub-palette count of template 14.
    new DataView(many.buffer).setUint32(4 + 4 + 28 + 4 + 8, 0x7fffffff, true)
    expect(() => parseClothingTable(many)).toThrow(/does not fit/)
    expect(() => parseClothingTable(TABLE.subarray(0, TABLE.length - 2))).toThrow(DatError)
  })
})

describe('parsePaletteSet and parsePalette', () => {
  it('read the id list after the file id', () => {
    expect([...parsePaletteSet(u32s(0x0f00001b, 3, 0x04000001, 0x04000002, 0x04000003))]).toEqual([
      0x04000001, 0x04000002, 0x04000003,
    ])
    expect([...parsePalette(u32s(0x04000001, 2, 0xff102030, 0xff405060))]).toEqual([0xff102030, 0xff405060])
  })

  it('throw on a count larger than the bytes left, so they never allocate it', () => {
    expect(() => parsePalette(u32s(0x04000001, 0xffffffff))).toThrow(/does not fit/)
  })

  it('throw on more than 2048 colours or 1024 palettes, even when the bytes are there', () => {
    expect(parsePalette(u32s(0x04000001, 2048, ...new Array<number>(2048).fill(0)))).toHaveLength(2048)
    expect(() => parsePalette(u32s(0x04000001, 2049, ...new Array<number>(2049).fill(0)))).toThrow(/more than 2048/)
    expect(() => parsePaletteSet(u32s(0x0f000001, 1025, ...new Array<number>(1025).fill(0)))).toThrow(/more than 1024/)
  })
})
