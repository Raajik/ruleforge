// Builds small synthetic DAT files for the reader tests. No game data: every
// byte comes from the test. The layout follows src/core/dat/archive.ts.

import type { ReadRange } from '../core/dat/archive'

export interface CraftEntry {
  id: number
  offset: number
  size: number
}

const NODE_SIZE = 62 * 4 + 4 + 61 * 24

export class DatBuilder {
  private readonly blocks: Uint8Array[]

  constructor(readonly blockSize = 512) {
    // Block 0 holds the header at 0x140.
    this.blocks = [new Uint8Array(blockSize)]
  }

  /** Writes `data` as a chain of new blocks and gives the first block's offset. */
  chain(data: Uint8Array): number {
    const per = this.blockSize - 4
    const count = Math.max(1, Math.ceil(data.length / per))
    const first = this.blocks.length
    for (let i = 0; i < count; i++) {
      const block = new Uint8Array(this.blockSize)
      const next = i + 1 < count ? (first + i + 1) * this.blockSize : 0
      new DataView(block.buffer).setUint32(0, next, true)
      block.set(data.subarray(i * per, (i + 1) * per), 4)
      this.blocks.push(block)
    }
    return first * this.blockSize
  }

  /** Writes a file and gives its directory entry. */
  file(id: number, data: Uint8Array): CraftEntry {
    return { id, offset: this.chain(data), size: data.length }
  }

  /** Writes a directory node. A leaf has no branches. */
  node(entries: readonly CraftEntry[], branches: readonly number[] = [], count = entries.length): number {
    const bytes = new Uint8Array(NODE_SIZE)
    const v = new DataView(bytes.buffer)
    branches.forEach((b, i) => v.setUint32(i * 4, b, true))
    v.setUint32(62 * 4, count, true)
    entries.forEach((e, i) => {
      const at = 62 * 4 + 4 + i * 24
      v.setUint32(at + 4, e.id, true)
      v.setUint32(at + 8, e.offset, true)
      v.setUint32(at + 12, e.size, true)
    })
    return this.chain(bytes)
  }

  /** The whole file with the header pointing at `root`. */
  build(root: number): Uint8Array<ArrayBuffer> {
    const out = new Uint8Array(this.blocks.length * this.blockSize)
    this.blocks.forEach((b, i) => out.set(b, i * this.blockSize))
    const v = new DataView(out.buffer)
    v.setUint32(0x140 + 4, this.blockSize, true)
    v.setUint32(0x140 + 32, root, true)
    return out
  }
}

/** Overwrites the next-block pointer of the block at `offset`. */
export function setNext(dat: Uint8Array, offset: number, next: number): void {
  new DataView(dat.buffer, dat.byteOffset).setUint32(offset, next, true)
}

/** Little-endian uint32 values as bytes. */
export function u32s(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 4)
  values.forEach((value, i) => new DataView(out.buffer).setUint32(i * 4, value >>> 0, true))
  return out
}

/** Joins byte arrays. */
export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/** A ranged read over bytes in memory that counts its calls and its largest read. */
export function memoryReader(bytes: Uint8Array): ReadRange & { calls: number; largest: number } {
  const read = Object.assign(
    async (offset: number, length: number) => {
      read.calls++
      read.largest = Math.max(read.largest, length)
      return bytes.slice(offset, offset + length)
    },
    { calls: 0, largest: 0 },
  )
  return read
}

/** Little-endian uint16 values as bytes. */
export function u16s(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 2)
  values.forEach((v, i) => new DataView(out.buffer).setUint16(i * 2, v, true))
  return out
}

/**
 * A tiny portal DAT with the Amuli Coat's ClothingTable id (0x100001A1): one
 * template, 14, with one sub-palette over entries 0-3 (example colour: entry
 * 2), whose PaletteSet has a dark red (#400000) and a red (#FF0000) palette.
 * Made-up colours.
 */
export function craftPortal(): Uint8Array<ArrayBuffer> {
  const b = new DatBuilder()
  const table = concat(u32s(0x100001a1), u16s(0, 0), u16s(1, 0), u32s(14, 0x06000001, 1, 1, 0, 4, 0x0f000001))
  const entries = [
    b.file(0x04000001, u32s(0x04000001, 4, 0, 0, 0xff400000, 0)),
    b.file(0x04000002, u32s(0x04000002, 4, 0, 0, 0xffff0000, 0)),
    b.file(0x0f000001, u32s(0x0f000001, 2, 0x04000001, 0x04000002)),
    b.file(0x100001a1, table),
  ]
  return b.build(b.node(entries))
}
