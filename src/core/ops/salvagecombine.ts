/**
 * Salvage combine tab edits (T25). The C# is ref/editor/Form_SalvageTab.cs.
 *
 * The tab edits the first SalvageCombine block of the profile. It holds the
 * default range, one combine range per material entry, and the value mode
 * ("combine for value up to").
 * "Export Ranges" writes the block body alone to a .ucr file. "Import
 * Ranges" reads that body back (Form_SalvageTab.cs 258-293). The file
 * format is the SalvageCombine body without any header.
 *
 * Every function returns a new profile and never changes its input. A
 * profile without a SalvageCombine block comes back unchanged. The
 * importRanges function is the exception: it appends the imported block at
 * the end, the place that CreateDefaultBlocks uses
 * (UTLFileExtraBlockManager.cs 76-83).
 */

import { parseInt32 } from '../format/reader'
import type { LootProfile, SalvageCombineBlock } from '../format/profile'
import { readSalvageCombine, writeSalvageCombine } from '../format/profile'
import { CountedWriter } from '../format/writer'
import { materialIds } from '../gamedata/generated'

// Form_SalvageTab.cs line 11: the value of a fresh "combine for value up to".
const DEFAULT_VALUECOMBINE_VALUE = 390000

/** The list index of the first SalvageCombine block, -1 when there is none. */
function salvageIndex(profile: LootProfile): number {
  return profile.extraBlocks.findIndex((b) => b.kind === 'salvageCombine')
}

/**
 * Runs `edit` on a copy of the first SalvageCombine block. Gives the input
 * profile back when it has no such block or when `edit` reports no change.
 */
function withSalvageBlock(profile: LootProfile, edit: (block: SalvageCombineBlock) => boolean): LootProfile {
  const index = salvageIndex(profile)
  const current = profile.extraBlocks[index]
  if (index < 0 || !current || current.kind !== 'salvageCombine') return profile
  const block: SalvageCombineBlock = {
    ...current,
    materialCombineStrings: new Map(current.materialCombineStrings),
    materialValueModeValues: new Map(current.materialValueModeValues),
  }
  if (!edit(block)) return profile
  const extraBlocks = [...profile.extraBlocks]
  extraBlocks[index] = block
  return { ...profile, extraBlocks }
}

/** The material of the entry at `list index`, undefined outside the list. */
function materialAt(block: SalvageCombineBlock, index: number): number | undefined {
  return [...block.materialCombineStrings.keys()][index]
}

/** Form_SalvageTab.cs 198-205: the default combine range text box. */
export function setDefaultRange(profile: LootProfile, text: string): LootProfile {
  return withSalvageBlock(profile, (block) => {
    if (block.defaultCombineString === text) return false
    block.defaultCombineString = text
    return true
  })
}

/**
 * Form_SalvageTab.cs 207-233: "New" walks the material combo list. The
 * list uses the `getMaterialInfo` order (lines 14-25). The function takes
 * the first material without an entry, gives it the default range and
 * appends it at the end. When every material has an entry it does nothing
 * (221-225).
 */
export function addMaterialEntry(profile: LootProfile): LootProfile {
  return withSalvageBlock(profile, (block) => {
    const free = materialIds.find(([, id]) => !block.materialCombineStrings.has(id))
    if (!free) return false
    block.materialCombineStrings.set(free[1], block.defaultCombineString)
    return true
  })
}

/**
 * Form_SalvageTab.cs 235-256: "Delete" removes the entry of the list index.
 * It removes only MaterialCombineStrings (line 244), so a value mode of that
 * material stays in the file.
 */
export function deleteMaterialEntry(profile: LootProfile, index: number): LootProfile {
  return withSalvageBlock(profile, (block) => {
    const material = materialAt(block, index)
    if (material === undefined) return false
    block.materialCombineStrings.delete(material)
    return true
  })
}

/** Form_SalvageTab.cs 124-140: the combine range of the selected entry. */
export function setRange(profile: LootProfile, index: number, text: string): LootProfile {
  return withSalvageBlock(profile, (block) => {
    const material = materialAt(block, index)
    if (material === undefined) return false
    if (block.materialCombineStrings.get(material) === text) return false
    block.materialCombineStrings.set(material, text)
    return true
  })
}

/**
 * Form_SalvageTab.cs 142-174: the "combine for value up to" checkbox.
 * Turning it on stores 390000 (the handler sets the text box to it first,
 * line 152), turning it off drops the value (166-167).
 */
export function setValueMode(profile: LootProfile, index: number, enabled: boolean): LootProfile {
  return withSalvageBlock(profile, (block) => {
    const material = materialAt(block, index)
    if (material === undefined) return false
    if (enabled) {
      block.materialValueModeValues.set(material, DEFAULT_VALUECOMBINE_VALUE)
      return true
    }
    return block.materialValueModeValues.delete(material)
  })
}

/**
 * Form_SalvageTab.cs 176-196: the value text box. It only writes while the
 * checkbox is on (line 187), so the material must have a value mode. A
 * value that int.TryParse rejects falls back to 390000 (lines 183-184).
 */
export function setValueModeValue(profile: LootProfile, index: number, text: string): LootProfile {
  return withSalvageBlock(profile, (block) => {
    const material = materialAt(block, index)
    if (material === undefined) return false
    if (!block.materialValueModeValues.has(material)) return false
    block.materialValueModeValues.set(material, parseInt32(text) ?? DEFAULT_VALUECOMBINE_VALUE)
    return true
  })
}

/**
 * Form_SalvageTab.cs 258-273: "Export Ranges" writes SalvageBlock.Write into
 * the file, so the .ucr file is the block body with CRLF lines. Gives
 * undefined without a SalvageCombine block (the C# always has one, see above).
 */
export function exportRanges(profile: LootProfile): string | undefined {
  const index = salvageIndex(profile)
  const block = profile.extraBlocks[index]
  if (index < 0 || !block || block.kind !== 'salvageCombine') return undefined
  const writer = new CountedWriter()
  writeSalvageCombine(block, writer)
  return writer.toString()
}

/**
 * Form_SalvageTab.cs 275-293: "Import Ranges" reads SalvageBlock.Read, which
 * replaces the content of the first block in place. Without a block the
 * imported one joins at the end, where CreateDefaultBlocks appends it. Text
 * that is not a .ucr file throws, as the C# int.Parse does, so a wrong file
 * pick cannot wipe the stored ranges.
 */
export function importRanges(profile: LootProfile, text: string): LootProfile {
  const block = readSalvageCombine(text)
  const index = salvageIndex(profile)
  if (index < 0) return { ...profile, extraBlocks: [...profile.extraBlocks, block] }
  const extraBlocks = [...profile.extraBlocks]
  extraBlocks[index] = block
  return { ...profile, extraBlocks }
}
