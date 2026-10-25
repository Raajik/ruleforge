// The exact roll's LookSource on the user's own client_portal.dat
// (specs/armor-preview.md item 9). The UI imports this module only when the
// user picks the file, so the DAT reader stays out of the first bundle.

import type { LookSource, PaletteColors, PieceLooks } from '../gamedata/armorroll'
import { DatError, openDat, type ReadRange } from './archive'
import { parseClothingTable, parsePalette, parsePaletteSet } from './clothing'

// A palette is 2048 colours (8 kB), so this keeps the cache near 32 MB at most.
const PALETTE_CACHE_LIMIT = 4096

export async function openPortalLooks(read: ReadRange, fileSize: number): Promise<LookSource> {
  const dat = await openDat(read, fileSize)
  const pieces = new Map<number, PieceLooks | null>()
  const sets = new Map<number, Uint32Array>()
  const palettes = new Map<number, Uint32Array>()

  async function file(id: number): Promise<Uint8Array> {
    const bytes = await dat.readFile(id)
    if (!bytes) throw new DatError(`The DAT has no file ${id.toString(16)}.`)
    return bytes
  }

  return {
    async piece(clothingId) {
      if (pieces.has(clothingId)) return pieces.get(clothingId)!
      const bytes = await dat.readFile(clothingId)
      let looks: PieceLooks | null = null
      if (bytes) {
        const table = parseClothingTable(bytes)
        const templates: { id: number; slots: { palettes: Uint32Array; entry: number }[] }[] = []
        for (const [id, template] of table.templates) {
          const slots: { palettes: Uint32Array; entry: number }[] = []
          for (const sub of template.subPalettes) {
            let set = sets.get(sub.paletteSet)
            if (!set) {
              set = parsePaletteSet(await file(sub.paletteSet))
              sets.set(sub.paletteSet, set)
            }
            // A slot is one range; its example colour is the middle entry (docs/gamedata.md).
            for (const range of sub.ranges) slots.push({ palettes: set, entry: range.offset + Math.floor(range.count / 2) })
          }
          templates.push({ id, slots })
        }
        looks = { templates }
      }
      pieces.set(clothingId, looks)
      return looks
    },
    async colors(ids) {
      const out = new Map<number, Uint32Array>()
      for (const id of ids) {
        let colors = palettes.get(id)
        if (!colors) {
          colors = parsePalette(await file(id))
          if (palettes.size >= PALETTE_CACHE_LIMIT) palettes.clear()
          palettes.set(id, colors)
        }
        out.set(id, colors)
      }
      return out satisfies PaletteColors
    },
  }
}
