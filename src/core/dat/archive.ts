// A reader for the Asheron's Call DAT container (client_portal.dat), written
// from the format described in docs/gamedata.md. It reads through a byte-range
// function that the caller gives it, so the browser can use Blob.slice and the
// desktop app a ranged file read. Nothing here holds the whole file.
//
// The container: a header at 0x140 gives the block size and the sector of the
// root directory node. A file or a node is a chain of blocks; the first 4
// bytes of each block point to the next block (0 ends the chain). Directory
// nodes form a B-tree sorted by file id.
//
// Every number read from the file is checked before it is used, so a corrupt
// file gives a DatError and never a loop, an unbounded recursion or an
// allocation larger than the file.

/** Reads `length` bytes at `offset`. It may give fewer bytes at the end of the file. */
export type ReadRange = (offset: number, length: number) => Promise<Uint8Array>

export class DatError extends Error {}

const HEADER_OFFSET = 0x140
const HEADER_SIZE = 0x40
const BRANCHES = 62
const MAX_ENTRIES = 61
const ENTRY_SIZE = 24
const NODE_SIZE = BRANCHES * 4 + 4 + MAX_ENTRIES * ENTRY_SIZE
// A B-tree of 61 entries per node and this depth holds far more than 2^32 ids.
const MAX_DEPTH = 16
const MIN_BLOCK = 64
const MAX_BLOCK = 1 << 16
const NODE_CACHE_LIMIT = 4096

interface Entry {
  id: number
  offset: number
  size: number
}

interface Node {
  branches: number[]
  entries: Entry[]
}

export interface DatArchive {
  readonly blockSize: number
  /** The bytes of a file, or null when no file has the id. */
  readFile(id: number): Promise<Uint8Array | null>
}

export async function openDat(read: ReadRange, fileSize: number): Promise<DatArchive> {
  if (!Number.isSafeInteger(fileSize) || fileSize < HEADER_OFFSET + HEADER_SIZE) {
    throw new DatError('The file is too small to be a DAT file.')
  }
  const header = await readExact(read, HEADER_OFFSET, HEADER_SIZE)
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength)
  const blockSize = view.getUint32(4, true)
  const root = view.getUint32(32, true)
  if (blockSize < MIN_BLOCK || blockSize > MAX_BLOCK || blockSize % 4 !== 0) {
    throw new DatError(`Bad block size ${blockSize}.`)
  }
  const blocks = Math.floor(fileSize / blockSize)
  // The most file bytes the blocks can hold: every block but the header's.
  const capacity = (blocks - 1) * (blockSize - 4)
  const nodes = new Map<number, Node>()

  function checkBlock(offset: number): void {
    if (offset < blockSize || offset % 4 !== 0 || offset + blockSize > fileSize) {
      throw new DatError(`Block offset ${offset} is outside the file.`)
    }
  }

  /** The `size` bytes of the chain that starts at `first`. */
  async function readChain(first: number, size: number): Promise<Uint8Array> {
    if (size < 0 || size > capacity) throw new DatError(`File size ${size} is larger than the DAT can hold.`)
    const out = new Uint8Array(size)
    const seen = new Set<number>()
    let block = first
    let done = 0
    let chunk: Uint8Array = new Uint8Array(0)
    let chunkStart = 0
    while (done < size) {
      checkBlock(block)
      if (seen.has(block)) throw new DatError(`Block chain loops at ${block}.`)
      seen.add(block)
      const take = Math.min(size - done, blockSize - 4)
      if (block < chunkStart || block + 4 + take > chunkStart + chunk.length) {
        // Blocks of a file usually follow each other, so read all the blocks
        // still needed in one go and follow the chain inside that.
        const left = Math.ceil((size - done) / (blockSize - 4))
        chunkStart = block
        chunk = await readExact(read, block, Math.min(left * blockSize, fileSize - block))
      }
      const at = block - chunkStart
      const next = new DataView(chunk.buffer, chunk.byteOffset + at, 4).getUint32(0, true)
      out.set(chunk.subarray(at + 4, at + 4 + take), done)
      done += take
      if (done < size && next === 0) throw new DatError('Block chain ends before the file does.')
      block = next
    }
    return out
  }

  async function readNode(offset: number): Promise<Node> {
    const cached = nodes.get(offset)
    if (cached) return cached
    const bytes = await readChain(offset, NODE_SIZE)
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const branches: number[] = []
    for (let i = 0; i < BRANCHES; i++) branches.push(v.getUint32(i * 4, true))
    const count = v.getUint32(BRANCHES * 4, true)
    if (count > MAX_ENTRIES) throw new DatError(`Directory node at ${offset} has ${count} entries.`)
    const entries: Entry[] = []
    for (let i = 0; i < count; i++) {
      const at = BRANCHES * 4 + 4 + i * ENTRY_SIZE
      entries.push({ id: v.getUint32(at + 4, true), offset: v.getUint32(at + 8, true), size: v.getUint32(at + 12, true) })
    }
    if (nodes.size >= NODE_CACHE_LIMIT) nodes.clear()
    const node = { branches, entries }
    nodes.set(offset, node)
    return node
  }

  async function find(id: number): Promise<Entry | null> {
    const seen = new Set<number>()
    let offset = root
    for (let depth = 0; depth < MAX_DEPTH; depth++) {
      if (seen.has(offset)) throw new DatError(`Directory cycle at ${offset}.`)
      seen.add(offset)
      const node = await readNode(offset)
      let i = 0
      while (i < node.entries.length && node.entries[i]!.id < id) i++
      const entry = node.entries[i]
      if (entry && entry.id === id) return entry
      // A leaf has no branches; a node with n entries has n + 1 children.
      if (node.branches[0] === 0) return null
      offset = node.branches[i]!
    }
    throw new DatError('The directory is deeper than a DAT can be.')
  }

  return {
    blockSize,
    async readFile(id) {
      const entry = await find(id >>> 0)
      return entry ? readChain(entry.offset, entry.size) : null
    },
  }
}

/** A read that must give all `length` bytes. */
async function readExact(read: ReadRange, offset: number, length: number): Promise<Uint8Array> {
  const bytes = await read(offset, length)
  if (bytes.length < length) throw new DatError(`Short read at ${offset}: ${bytes.length} of ${length} bytes.`)
  return bytes.length === length ? bytes : bytes.subarray(0, length)
}
