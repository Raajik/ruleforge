/**
 * Salvage Combination tab (T30), connected to the T25 ops. The layout and
 * control names mirror ref/editor/Form_SalvageTab.cs and the Designer.
 *
 * It edits the first SalvageCombine block of the profile. When there is none,
 * the ops leave the profile unchanged and import will append one.
 */
import { useEffect, useState } from 'react'
import {
  addMaterialEntry,
  deleteMaterialEntry,
  setDefaultRange,
  setRange,
  setValueMode,
  setValueModeValue,
} from '../core/ops/salvagecombine'
import { materialIds } from '../core/gamedata/generated'
import type { LootProfile, SalvageCombineBlock } from '../core/format/profile'

const DEFAULT_VALUECOMBINE_VALUE = 390000

function salvageBlock(profile: LootProfile): SalvageCombineBlock | undefined {
  return profile.extraBlocks.find((b) => b.kind === 'salvageCombine') as SalvageCombineBlock | undefined
}

function materialAt(block: SalvageCombineBlock, index: number): number | undefined {
  return [...block.materialCombineStrings.keys()][index]
}

function getMaterialName(id: number): string {
  const m = materialIds.find(([, mid]) => mid === id)
  return m ? m[0] : String(id)
}

/** Title of a list entry, as the C# builds it in UpdateIndexTitle. */
function entryTitle(block: SalvageCombineBlock, mat: number, index: number): string {
  const range = block.materialCombineStrings.get(mat)
  let sb = `${getMaterialName(mat)}: ${range ?? ''}`
  if (block.materialValueModeValues.has(mat)) {
    sb += `, Val >= ${block.materialValueModeValues.get(mat)!.toString()}`
  }
  return sb
}

export function SalvageCombineTab({
  profile,
  onChange,
}: {
  profile: LootProfile
  onChange: (profile: LootProfile) => void
}) {
  const block = salvageBlock(profile)
  const [selected, setSelected] = useState(-1)
  const [working, setWorking] = useState(false)

  const materialList = block ? [...block.materialCombineStrings.keys()] : []

  useEffect(() => {
    if (working) return
    // Keep the selection in bounds when the list changes.
    if (selected >= materialList.length && materialList.length > 0) {
      setSelected(materialList.length - 1)
    } else if (materialList.length === 0 && selected !== -1) {
      setSelected(-1)
    }
  }, [working, selected, materialList.length])

  if (!block) {
    return <p>Salvage Combination tab.</p>
  }

  const matSelected = selected >= 0 && selected < materialList.length ? materialList[selected] : undefined
  const showSettings = matSelected !== undefined

  function select(index: number) {
    if (working) return
    setSelected(index)
  }

  function onMaterialChange(value: string) {
    if (working) return
    const newmat = Number(value)
    if (selected < 0) return
    if (isNaN(newmat)) return
    // See if we can do this - there can only be one entry for each mat
    const oldmat = materialList[selected]
    if (oldmat === undefined) return
    if (materialList.includes(newmat)) return
    // Perform the switch: update the block maps
    const next = { ...profile }
    const b = salvageBlock(next)!
    const range = b.materialCombineStrings.get(oldmat)
    const vmode = b.materialValueModeValues.get(oldmat)
    b.materialCombineStrings.delete(oldmat)
    if (range !== undefined) b.materialCombineStrings.set(newmat, range)
    b.materialValueModeValues.delete(oldmat)
    if (vmode !== undefined) b.materialValueModeValues.set(newmat, vmode)
    onChange(next)
    // Selection index stays the same
  }

  function onDefaultChange(text: string) {
    if (working) return
    onChange(setDefaultRange(profile, text))
  }

  function onRangeChange(text: string) {
    if (working) return
    onChange(setRange(profile, selected, text))
  }

  function onValueModeChange(checked: boolean) {
    if (working) return
    onChange(setValueMode(profile, selected, checked))
  }

  function onValueModeTextChange(text: string) {
    if (working) return
    onChange(setValueModeValue(profile, selected, text))
  }

  function onNew() {
    const next = addMaterialEntry(profile)
    onChange(next)
    const newBlock = salvageBlock(next)
    if (newBlock) {
      setSelected((newBlock.materialCombineStrings.size || 0) - 1)
    }
  }

  function onDelete() {
    if (selected < 0) return
    onChange(deleteMaterialEntry(profile, selected))
    // Selection updated by effect
  }

  return (
    <div role="tabpanel" aria-label="Salvage Combination">
      <div>
        <label>
          Default Combine Range:
          <input
            aria-label="Default Combine Range"
            value={block.defaultCombineString}
            onChange={(e) => onDefaultChange(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>Combine Rules:</label>
        <ul aria-label="Combine rules list" style={{ height: 300, overflow: 'auto' }}>
          {materialList.map((mat, i) => (
            <li key={mat}>
              <button type="button" aria-pressed={i === selected} onClick={() => select(i)}>
                {entryTitle(block, mat, i)}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onNew}>
          New
        </button>
        <button type="button" onClick={onDelete}>
          Delete
        </button>
      </div>
      {showSettings && (
        <fieldset>
          <legend>Combine Range Setting</legend>
          <label>
            Material
            <select
              aria-label="Material"
              value={matSelected}
              onChange={(e) => onMaterialChange(e.target.value)}
            >
              {materialIds.map(([name, id]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Combine Range
            <input
              aria-label="Combine Range"
              value={block.materialCombineStrings.get(matSelected!) ?? ''}
              onChange={(e) => onRangeChange(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={block.materialValueModeValues.has(matSelected!)}
              onChange={(e) => onValueModeChange(e.target.checked)}
            />
            Combine for value up to
          </label>
          {block.materialValueModeValues.has(matSelected!) && (
            <input
              aria-label="Value up to"
              value={block.materialValueModeValues.get(matSelected!)?.toString() ?? DEFAULT_VALUECOMBINE_VALUE}
              onChange={(e) => onValueModeTextChange(e.target.value)}
            />
          )}
        </fieldset>
      )}
    </div>
  )
}
