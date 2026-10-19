// Tests for the Salvage combine tab edits (T25). The C# is
// ref/editor/Form_SalvageTab.cs (295 lines).
//
// The tab edits the first SalvageCombine block: the default range, one range
// per material entry, and "combine for value up to". "Export Ranges" writes
// the block body alone to a .ucr file and "Import Ranges" reads that body
// back (Form_SalvageTab.cs 258-293 uses SalvageBlock.Write and Read).

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ExtraBlock, LootProfile, SalvageCombineBlock } from '../format/profile'
import { readProfile, writeProfile } from '../format/profile'
import { materialIds } from '../gamedata/generated'
import {
  addMaterialEntry,
  deleteMaterialEntry,
  exportRanges,
  importRanges,
  setDefaultRange,
  setRange,
  setValueMode,
  setValueModeValue,
} from './salvagecombine'

function block(overrides: Partial<SalvageCombineBlock> = {}): SalvageCombineBlock {
  return {
    kind: 'salvageCombine',
    defaultCombineString: '1-6, 7-8, 9, 10',
    materialCombineStrings: new Map([
      [10, '1-10'],
      [13, '3-4'],
    ]),
    // Material 10 (Agate) also has "combine for value up to".
    materialValueModeValues: new Map([[10, 500]]),
    ...overrides,
  }
}

function profile(...extraBlocks: ExtraBlock[]): LootProfile {
  return { version: 1, rules: [], extraBlocks }
}

function salvageOf(p: LootProfile): SalvageCombineBlock {
  const b = p.extraBlocks.find((x) => x.kind === 'salvageCombine')
  if (!b) throw new Error('expected a SalvageCombine block')
  return b
}

describe('setDefaultRange', () => {
  it('writes the default range text into the block', () => {
    const p = profile(block())
    const out = setDefaultRange(p, '1-10, 11')

    expect(salvageOf(out).defaultCombineString).toBe('1-10, 11')
    expect(p).toEqual(profile(block()))
  })

  it('returns the same profile when the text is already stored, as C# returns early', () => {
    const p = profile(block())
    expect(setDefaultRange(p, '1-6, 7-8, 9, 10')).toBe(p)
  })
})

describe('addMaterialEntry', () => {
  it('adds the first material of the combo list without an entry, with the default range', () => {
    const p = profile(block())
    const out = addMaterialEntry(p)

    // Agate (10) has an entry, so Alabaster (66) is first without one. The
    // C# appends it at the end of the list (Form_SalvageTab.cs 227-230).
    expect([...salvageOf(out).materialCombineStrings]).toEqual([
      [10, '1-10'],
      [13, '3-4'],
      [66, '1-6, 7-8, 9, 10'],
    ])
    expect(p).toEqual(profile(block()))
  })

  it('does nothing when every material already has an entry', () => {
    const full = new Map(materialIds.map(([name, id]) => [id, '1-10']))
    const p = profile(block({ materialCombineStrings: full }))

    expect(addMaterialEntry(p)).toBe(p)
  })

  it('keeps the combo order: the material ids sort in culture order like the C# SortedDictionary', () => {
    const names = materialIds.map(([name]) => name)
    expect(names).toEqual([...names].sort(new Intl.Collator('en').compare))
  })

  it('picks Alabaster in a real fixture and round-trips it', () => {
    const p = readProfile(readFileSync('fixtures/vtclassic_editor_minimal.utl', 'utf8'))
    const out = addMaterialEntry(p)
    const b = salvageOf(out)

    expect(b.materialCombineStrings.size).toBe(26)
    expect([...b.materialCombineStrings.keys()].at(-1)).toBe(66)
    expect(b.materialCombineStrings.get(66)).toBe('1-6, 7-8, 9, 10')
    expect(readProfile(writeProfile(out))).toEqual(out)
  })
})

describe('deleteMaterialEntry', () => {
  it('removes the entry at the index and keeps the rest in order', () => {
    const p = profile(block())
    const out = deleteMaterialEntry(p, 0)

    expect([...salvageOf(out).materialCombineStrings]).toEqual([[13, '3-4']])
    expect(p).toEqual(profile(block()))
  })

  it('keeps the value mode of the deleted material, as the C# does', () => {
    // Form_SalvageTab.cs 244 removes only from MaterialCombineStrings, so the
    // value mode entry of material 10 survives its delete.
    const out = deleteMaterialEntry(profile(block()), 0)

    expect(salvageOf(out).materialValueModeValues).toEqual(new Map([[10, 500]]))
  })

  it('returns the same profile for an index outside the list', () => {
    const p = profile(block())
    expect(deleteMaterialEntry(p, -1)).toBe(p)
    expect(deleteMaterialEntry(p, 2)).toBe(p)
  })
})

describe('setRange', () => {
  it('writes the combine range of the entry at the index', () => {
    const p = profile(block())
    const out = setRange(p, 1, '9')

    expect([...salvageOf(out).materialCombineStrings]).toEqual([
      [10, '1-10'],
      [13, '9'],
    ])
    expect(p).toEqual(profile(block()))
  })

  it('returns the same profile for the same text or an index outside the list', () => {
    const p = profile(block())
    expect(setRange(p, 1, '3-4')).toBe(p)
    expect(setRange(p, -1, '9')).toBe(p)
    expect(setRange(p, 2, '9')).toBe(p)
  })
})

describe('setValueMode', () => {
  it('stores 390000 when the checkbox turns on', () => {
    const p = profile(block({ materialValueModeValues: new Map() }))
    const out = setValueMode(p, 0, true)

    expect(salvageOf(out).materialValueModeValues).toEqual(new Map([[10, 390000]]))
    expect(p).toEqual(profile(block({ materialValueModeValues: new Map() })))
  })

  it('drops the value when the checkbox turns off', () => {
    const p = profile(block())
    const out = setValueMode(p, 0, false)

    expect(salvageOf(out).materialValueModeValues.size).toBe(0)
    // Nothing to remove for material 13: the profile comes back unchanged.
    expect(setValueMode(p, 1, false)).toBe(p)
  })
})

describe('setValueModeValue', () => {
  it('stores the parsed value while the material has a value mode', () => {
    const out = setValueModeValue(profile(block()), 0, '250000')
    expect(salvageOf(out).materialValueModeValues.get(10)).toBe(250000)

    // C# int.TryParse allows surrounding whitespace and a sign.
    const spaced = setValueModeValue(profile(block()), 0, ' +42 ')
    expect(salvageOf(spaced).materialValueModeValues.get(10)).toBe(42)
  })

  it('falls back to 390000 when int.TryParse fails', () => {
    for (const text of ['', 'abc', '1.5', '1e5', '2147483648']) {
      const out = setValueModeValue(profile(block()), 0, text)
      expect(salvageOf(out).materialValueModeValues.get(10), text).toBe(390000)
    }
  })

  it('writes nothing while the material has no value mode (checkbox off)', () => {
    const p = profile(block())
    expect(setValueModeValue(p, 1, '500')).toBe(p)
  })
})

describe('exportRanges', () => {
  it('writes the block body with CRLF, as SalvageBlock.Write does', () => {
    // Form_SalvageTab.cs 268-271: the .ucr file is the body alone, with no
    // UTL header and no block header (UTLBlock_SalvageCombine.cs 302-321).
    expect(exportRanges(profile(block()))).toBe(
      '1\r\n1-6, 7-8, 9, 10\r\n2\r\n10\r\n1-10\r\n13\r\n3-4\r\n1\r\n10\r\n500\r\n',
    )
  })

  it('exports the real block of vtclassic_editor_minimal.utl', () => {
    const p = readProfile(readFileSync('fixtures/vtclassic_editor_minimal.utl', 'utf8'))
    const text = exportRanges(p)

    expect(text?.startsWith('1\r\n1-6, 7-8, 9, 10\r\n25\r\n10\r\n1-10\r\n')).toBe(true)
    // The value mode count line closes the file.
    expect(text?.endsWith('1-10\r\n0\r\n')).toBe(true)
  })

  it('gives undefined without a SalvageCombine block', () => {
    expect(exportRanges(profile({ kind: 'raw', typeId: 'Other', data: 'x' }))).toBeUndefined()
  })
})

describe('importRanges', () => {
  const text = '1\r\n9-9\r\n1\r\n5\r\n1-10\r\n0\r\n'

  it('replaces the first block in place and leaves the other blocks alone', () => {
    const raw: ExtraBlock = { kind: 'raw', typeId: 'Other', data: 'x' }
    const p = profile(raw, block())
    const out = importRanges(p, text)

    expect(out.extraBlocks[0]).toBe(raw)
    expect(out.extraBlocks[1]).toEqual({
      kind: 'salvageCombine',
      defaultCombineString: '9-9',
      materialCombineStrings: new Map([[5, '1-10']]),
      materialValueModeValues: new Map(),
    })
    expect(p).toEqual(profile(raw, block()))
  })

  it('adds the block at the end when the profile has none, where CreateDefaultBlocks puts it', () => {
    const raw: ExtraBlock = { kind: 'raw', typeId: 'Other', data: 'x' }
    const out = importRanges(profile(raw), text)

    expect(out.extraBlocks).toHaveLength(2)
    expect(salvageOf(out).defaultCombineString).toBe('9-9')
  })

  it('reads LF-only text, because StreamReader accepts LF and CRLF', () => {
    const out = importRanges(profile(), '1\n9-9\n1\n5\n1-10\n0\n')
    expect(salvageOf(out).materialCombineStrings).toEqual(new Map([[5, '1-10']]))
  })

  it('export then import gives the same block back', () => {
    const p = readProfile(readFileSync('fixtures/vtclassic_editor_minimal.utl', 'utf8'))
    const out = importRanges(profile(), exportRanges(p)!)

    expect(salvageOf(out)).toEqual(salvageOf(p))
  })

  it('throws on text that is not a .ucr file and keeps the profile', () => {
    const p = profile(block())

    // C# int.Parse throws the same way (UTLBlock_SalvageCombine.cs 281), so a
    // wrong file pick must not wipe the stored ranges.
    expect(() => importRanges(p, '')).toThrow()
    expect(() => importRanges(p, '1\r\n9-9\r\nabc\r\n')).toThrow(/material count/)
    expect(p).toEqual(profile(block()))
  })
})

describe('ops without a SalvageCombine block', () => {
  it('leaves the profile alone, except import which appends the block', () => {
    const raw: ExtraBlock = { kind: 'raw', typeId: 'Other', data: 'x' }
    const p = profile(raw)

    expect(setDefaultRange(p, '1')).toBe(p)
    expect(addMaterialEntry(p)).toBe(p)
    expect(deleteMaterialEntry(p, 0)).toBe(p)
    expect(setRange(p, 0, '1')).toBe(p)
    expect(setValueMode(p, 0, true)).toBe(p)
    expect(setValueModeValue(p, 0, '5')).toBe(p)
    expect(exportRanges(p)).toBeUndefined()
    expect(importRanges(p, '1\r\n9-9\r\n1\r\n5\r\n1-10\r\n0\r\n').extraBlocks).toHaveLength(2)
  })
})

describe('the tab edits together on a real fixture', () => {
  it('applies every edit to vtclassic_editor_minimal.utl and round-trips it', () => {
    const p = readProfile(readFileSync('fixtures/vtclassic_editor_minimal.utl', 'utf8'))
    let out = setDefaultRange(p, '1-10')
    out = addMaterialEntry(out) // Alabaster (66) at the end
    out = setRange(out, 0, '9') // Agate (10)
    out = setValueMode(out, 0, true) // Agate: 390000
    out = setValueModeValue(out, 0, '250000')
    out = deleteMaterialEntry(out, 1) // Azurite (14)

    const b = salvageOf(out)
    expect(b.defaultCombineString).toBe('1-10')
    expect(b.materialCombineStrings.size).toBe(25) // 25 + 1 - 1
    expect(b.materialCombineStrings.has(14)).toBe(false)
    expect(b.materialCombineStrings.get(10)).toBe('9')
    expect([...b.materialCombineStrings.keys()].at(-1)).toBe(66)
    expect(b.materialValueModeValues.get(10)).toBe(250000)
    expect(readProfile(writeProfile(out))).toEqual(out)

    // The input profile does not change.
    expect(p).toEqual(readProfile(readFileSync('fixtures/vtclassic_editor_minimal.utl', 'utf8')))
  })
})
