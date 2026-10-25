// The exact roll on the user's own client_portal.dat (specs/armor-preview.md,
// "Done when"). It reads byte ranges of the file in place and skips when the
// file is missing. Set RULEFORGE_PORTAL_DAT to use another path.

import { closeSync, existsSync, fstatSync, openSync, readFileSync, readSync } from 'node:fs'
import { homedir } from 'node:os'
import { afterAll, describe, expect, it } from 'vitest'
import { matchRequirement } from '../eval/match'
import { armorGroupView, armorView } from '../gamedata/armorpreview'
import { CLOTHING_TABLES, hasRegion, rollExact } from '../gamedata/armorroll'
import { parseColorSlots } from '../gamedata/colorslots'
import type { SimilarColorArmorTypeRequirement } from '../format/profile'
import { openPortalLooks } from './looks'

const PATH = process.env.RULEFORGE_PORTAL_DAT ?? `${homedir()}/Games/AsheronsCall/Client/client_portal.dat`
const present = existsSync(PATH)
const fd = present ? openSync(PATH, 'r') : -1
afterAll(() => {
  if (fd >= 0) closeSync(fd)
})

async function read(offset: number, length: number): Promise<Uint8Array> {
  const out = new Uint8Array(length)
  return out.subarray(0, readSync(fd, out, 0, length, offset))
}

const SLOTS = parseColorSlots(readFileSync('fixtures/ColorSlots.Default.xml', 'utf8'))

function chest(hex: number): SimilarColorArmorTypeRequirement {
  return { type: 15, r: hex >> 16, g: (hex >> 8) & 0xff, b: hex & 0xff, maxDifferenceH: 10, maxDifferenceSV: 0.1, armorGroup: 'Amuli Coat (Chest)' }
}

describe.skipIf(!present)('the exact roll on the real client_portal.dat', () => {
  it('rolls a red Amuli Coat chest that passes the rule, and never a magenta one', async () => {
    const source = await openPortalLooks(read, fstatSync(fd).size)
    const red = chest(0xf00000)
    const roll = await rollExact(source, armorView(red)!, red, SLOTS, Math.random)
    if (roll?.kind !== 'look') throw new Error(`expected a look, got ${JSON.stringify(roll)}`)
    expect(roll.look.exact).toBe(true)
    expect(roll.look.label).toMatch(/^Amuli Coat, Chest in #F00000, rolled as \w+ at shade [01]\.\d\d$/)
    const shown = Number.parseInt(roll.look.paint.parts.chest!.slice(1), 16)
    const item = { objectClass: 0, intValues: {}, doubleValues: {}, stringValues: {}, spells: [], palettes: [{ palette: 0, exampleColor: { r: shown >> 16, g: (shown >> 8) & 0xff, b: shown & 0xff } }] }
    expect(matchRequirement({ ...red, type: 16, slot: 0 }, item)).toBe(true)
    const magenta = chest(0xff00ff)
    expect(await rollExact(source, armorView(magenta)!, magenta, SLOTS, Math.random)).toEqual({
      kind: 'never',
      message: 'This armor never rolls this colour in Chest.',
    })
  })

  it('finds a ClothingTable for every piece of the map', async () => {
    const source = await openPortalLooks(read, fstatSync(fd).size)
    for (const [name, id] of Object.entries(CLOTHING_TABLES)) {
      const looks = await source.piece(id)
      expect(looks?.templates.length, name).toBeGreaterThan(0)
    }
  })

  it('fits the slots of every default group in its piece, but two', async () => {
    const source = await openPortalLooks(read, fstatSync(fd).size)
    const misfits: string[] = []
    for (const [group, region] of SLOTS) {
      if (group === 'None') continue
      const looks = await source.piece(CLOTHING_TABLES[armorGroupView(group).name]!)
      if (!looks || !hasRegion(looks, region)) misfits.push(group)
    }
    expect(misfits).toEqual(['Nariyid Girth (Ornaments)', 'Olthoi Amuli Legs (Trim)'])
  })
})
