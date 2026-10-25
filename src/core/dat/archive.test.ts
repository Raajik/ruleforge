// The DAT container reader on crafted bytes (specs/armor-preview.md
// Constraints): it finds files through the directory B-tree and follows block
// chains, and each guard stops a corrupt file with a DatError.

import { describe, expect, it } from 'vitest'
import { DatBuilder, memoryReader, setNext } from '../../test/craftDat'
import { DatError, openDat } from './archive'

function bytes(length: number, seed = 1): Uint8Array {
  return Uint8Array.from({ length }, (_, i) => (i * 7 + seed) & 0xff)
}

async function open(dat: Uint8Array) {
  return openDat(memoryReader(dat), dat.length)
}

describe('openDat on a good file', () => {
  it('reads a file that spans several blocks, and gives null for a missing id', async () => {
    const b = new DatBuilder()
    const data = bytes(1300)
    const entry = b.file(0x04000001, data)
    const dat = b.build(b.node([entry]))
    const archive = await open(dat)
    expect(archive.blockSize).toBe(512)
    expect(await archive.readFile(0x04000001)).toEqual(data)
    expect(await archive.readFile(0x04000002)).toBeNull()
  })

  it('finds files in the children of the root node, by id order', async () => {
    const b = new DatBuilder()
    const files = [0x10, 0x20, 0x30, 0x40, 0x50].map((id) => b.file(id, bytes(40, id)))
    const left = b.node([files[0]!, files[1]!])
    const right = b.node([files[3]!, files[4]!])
    const dat = b.build(b.node([files[2]!], [left, right]))
    const archive = await open(dat)
    for (const f of files) expect(await archive.readFile(f.id)).toEqual(bytes(40, f.id))
    expect(await archive.readFile(0x25)).toBeNull()
    expect(await archive.readFile(0x60)).toBeNull()
  })

  it('reads a file of contiguous blocks in one ranged read', async () => {
    const b = new DatBuilder()
    const entry = b.file(1, bytes(5000))
    const dat = b.build(b.node([entry]))
    const read = memoryReader(dat)
    const archive = await openDat(read, dat.length)
    const afterOpen = read.calls
    expect(await archive.readFile(1)).toEqual(bytes(5000))
    // One read for the root node, one for the file's 10 blocks.
    expect(read.calls - afterOpen).toBe(2)
    await archive.readFile(1)
    // The root node is cached.
    expect(read.calls - afterOpen).toBe(3)
  })
})

describe('openDat read sizes', () => {
  it('reads a big file in pieces of at most 64 KiB', async () => {
    const b = new DatBuilder()
    const data = bytes(200_000)
    const entry = b.file(1, data)
    const dat = b.build(b.node([entry]))
    const read = memoryReader(dat)
    const archive = await openDat(read, dat.length)
    expect(await archive.readFile(1)).toEqual(data)
    expect(read.largest).toBeLessThanOrEqual(65536)
  })

  it('reads a chain that runs backwards one block at a time, about the file once', async () => {
    const b = new DatBuilder()
    const data = bytes(400 * 508)
    const first = b.chain(data)
    const at = (i: number) => first + i * 512
    const dat = b.build(b.node([{ id: 1, offset: at(399), size: data.length }]))
    // Relink the 400 blocks from last to first, with the data in chain order.
    for (let i = 0; i < 400; i++) {
      setNext(dat, at(399 - i), i < 399 ? at(398 - i) : 0)
      dat.set(data.subarray(i * 508, (i + 1) * 508), at(399 - i) + 4)
    }
    const read = memoryReader(dat)
    const archive = await openDat(read, dat.length)
    expect(await archive.readFile(1)).toEqual(data)
    // The header, the root node and the 400 blocks; a read-ahead at every block read the file 87 times over.
    expect(read.total).toBeLessThan(dat.length * 1.05)
  })
})

describe('openDat guards', () => {
  it('rejects a file too small for the header, a bad block size and a short read', async () => {
    await expect(openDat(memoryReader(new Uint8Array(100)), 100)).rejects.toThrow(DatError)
    const b = new DatBuilder()
    const dat = b.build(b.node([]))
    new DataView(dat.buffer).setUint32(0x144, 3, true)
    await expect(open(dat)).rejects.toThrow(/block size/)
    // The caller says the file is larger than the bytes the reads give.
    await expect(openDat(memoryReader(dat.slice(0, 0x150)), dat.length)).rejects.toThrow(/Short read/)
  })

  it('stops a block chain that points at itself', async () => {
    const b = new DatBuilder()
    const entry = b.file(1, bytes(2000))
    const dat = b.build(b.node([entry]))
    setNext(dat, entry.offset, entry.offset)
    await expect((await open(dat)).readFile(1)).rejects.toThrow(/loops/)
  })

  it('stops a block chain that loops back after a few blocks', async () => {
    const b = new DatBuilder()
    const entry = b.file(1, bytes(2000))
    const dat = b.build(b.node([entry]))
    setNext(dat, entry.offset + 2 * 512, entry.offset)
    await expect((await open(dat)).readFile(1)).rejects.toThrow(/loops/)
  })

  it('stops a block pointer outside the file and a chain that ends early', async () => {
    const b = new DatBuilder()
    const one = b.file(1, bytes(2000))
    const two = b.file(2, bytes(2000))
    const dat = b.build(b.node([one, two]))
    setNext(dat, one.offset, 0x7ffffff0)
    setNext(dat, two.offset, 0)
    const archive = await open(dat)
    await expect(archive.readFile(1)).rejects.toThrow(/outside the file/)
    await expect(archive.readFile(2)).rejects.toThrow(/ends before/)
  })

  it('refuses a file size larger than the DAT can hold before it allocates', async () => {
    const b = new DatBuilder()
    const entry = b.file(1, bytes(10))
    const dat = b.build(b.node([{ ...entry, size: 0xfffffff0 }]))
    const read = memoryReader(dat)
    const archive = await openDat(read, dat.length)
    await expect(archive.readFile(1)).rejects.toThrow(/larger than the DAT can hold/)
    expect(read.largest).toBeLessThanOrEqual(dat.length)
  })

  it('stops a directory node that lists more entries than a node holds', async () => {
    const b = new DatBuilder()
    const dat = b.build(b.node([], [], 0xffffffff))
    await expect((await open(dat)).readFile(1)).rejects.toThrow(/entries/)
  })

  it('stops a directory cycle', async () => {
    const b = new DatBuilder()
    // The root's only child points back at the root.
    const root = b.node([], [512 * 5])
    const child = b.node([], [root])
    expect(child).toBe(512 * 5)
    const dat = b.build(root)
    await expect((await open(dat)).readFile(1)).rejects.toThrow(/cycle/)
  })

  it('stops a directory deeper than a DAT can be', async () => {
    const b = new DatBuilder()
    // 20 distinct nodes, each with no entries and one child: the next node.
    // A node is 1716 bytes, 4 blocks of 512, so node i sits at block 1 + 4i.
    const at = (i: number) => (1 + 4 * i) * 512
    for (let i = 0; i < 20; i++) expect(b.node([], [at(i + 1)])).toBe(at(i))
    b.node([])
    const dat = b.build(at(0))
    await expect((await open(dat)).readFile(1)).rejects.toThrow(/deeper/)
  })
})
