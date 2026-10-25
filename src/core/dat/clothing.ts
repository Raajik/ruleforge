// The three DAT file types that colour a piece of armor (docs/gamedata.md):
// a ClothingTable (0x10xxxxxx) lists the palette templates of the piece, each
// a list of sub-palettes; a sub-palette names a PaletteSet (0x0Fxxxxxx) and
// the palette entry ranges it fills; a PaletteSet lists Palettes (0x04xxxxxx)
// by shade. Every count is checked against the bytes left before it is used.

import { DatError } from './archive'

export interface PaletteRange {
  /** The first palette entry of the range. */
  offset: number
  /** The number of palette entries. */
  count: number
}

export interface SubPalette {
  ranges: PaletteRange[]
  paletteSet: number
}

export interface ClothingTable {
  id: number
  /** The palette templates by id, in file order. */
  templates: Map<number, { icon: number; subPalettes: SubPalette[] }>
}

/** A bounded little-endian reader. Reading past the end throws a DatError. */
class Cursor {
  private at = 0
  private readonly view: DataView

  constructor(bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  u16(): number {
    this.need(2)
    const v = this.view.getUint16(this.at, true)
    this.at += 2
    return v
  }

  u32(): number {
    this.need(4)
    const v = this.view.getUint32(this.at, true)
    this.at += 4
    return v
  }

  /** A count of items of at least `itemSize` bytes each, which must fit in the bytes left. */
  count(n: number, itemSize: number): number {
    if (n * itemSize > this.view.byteLength - this.at) throw new DatError(`Count ${n} does not fit in the file.`)
    return n
  }

  skip(n: number): void {
    this.need(n)
    this.at += n
  }

  private need(n: number): void {
    if (this.at + n > this.view.byteLength) throw new DatError('The file ends early.')
  }
}

export function parseClothingTable(bytes: Uint8Array): ClothingTable {
  const c = new Cursor(bytes)
  const id = c.u32()
  // The base effects (models and textures per setup): skipped, but walked to reach the templates.
  const bases = c.count(c.u16(), 8)
  c.u16()
  for (let i = 0; i < bases; i++) {
    c.u32()
    const objects = c.count(c.u32(), 12)
    for (let j = 0; j < objects; j++) {
      c.skip(8)
      c.skip(c.count(c.u32(), 8) * 8)
    }
  }
  const templates = new Map<number, { icon: number; subPalettes: SubPalette[] }>()
  const effects = c.count(c.u16(), 12)
  c.u16()
  for (let i = 0; i < effects; i++) {
    const key = c.u32()
    const icon = c.u32()
    const subs = c.count(c.u32(), 8)
    const subPalettes: SubPalette[] = []
    for (let j = 0; j < subs; j++) {
      const n = c.count(c.u32(), 8)
      const ranges: PaletteRange[] = []
      for (let k = 0; k < n; k++) ranges.push({ offset: c.u32(), count: c.u32() })
      subPalettes.push({ ranges, paletteSet: c.u32() })
    }
    templates.set(key, { icon, subPalettes })
  }
  return { id, templates }
}

// A palette holds at most 2048 colours: the sub-palette ranges index a
// 2048-entry palette (docs/gamedata.md). The largest real PaletteSet of the
// armor pieces has 72 palettes. The caps keep the caches of looks.ts near
// their stated size even when many ids point at one big corrupt file.
const MAX_COLORS = 2048
const MAX_SET = 1024

/** The palette ids of a PaletteSet, in shade order. */
export function parsePaletteSet(bytes: Uint8Array): Uint32Array {
  return parseIdList(bytes, MAX_SET)
}

/** The colours of a Palette, each 0xAARRGGBB. */
export function parsePalette(bytes: Uint8Array): Uint32Array {
  return parseIdList(bytes, MAX_COLORS)
}

// Both files are an id, then an int32 count, then that many uint32 values.
function parseIdList(bytes: Uint8Array, max: number): Uint32Array {
  const c = new Cursor(bytes)
  c.u32()
  const n = c.count(c.u32(), 4)
  if (n > max) throw new DatError(`Count ${n} is more than ${max}.`)
  const values = new Uint32Array(n)
  for (let i = 0; i < n; i++) values[i] = c.u32()
  return values
}
