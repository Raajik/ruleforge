/**
 * The Overview page (PLAN.md H5, design/A2-overview.html). It picks a base
 * profile, a strictness level and the character. The list on the right shows
 * what the profile does with the sample drops.
 *
 * The strictness level and the weapon choice change the rules of the
 * profile. The level and the free pack slots change the character of the
 * sample. So the list shows the result for that character.
 */
import { useMemo, useState } from 'react'
import type { Character } from '../core/eval/character'
import type { SampleItem } from '../core/eval/item'
import { previewItem } from '../core/eval/preview'
import type { LootProfile } from '../core/format/profile'
import { BASE_PROFILES, readBaseProfile, type BaseProfile } from '../core/ops/baseprofiles'
import { isRuleDisabled } from '../core/ops/rules'
import {
  STRICTNESS_LEVELS,
  WEAPON_CHOICES,
  applySettings,
  setGroupEnabled,
  trophyGroups,
} from '../core/ops/strictness'
import { actionClass, actionName } from './LootPreview'
import samples from '../core/eval/samples.json'

// The JSON import gives a union of the item shapes, so the items need one
// cast to become SampleItem values.
const ITEMS = samples.items as unknown as SampleItem[]
const SAMPLE_CHARACTER = samples.character as Character

export function OverviewPage({
  profile,
  fileName,
  onChange,
  onLoadBase,
  onOpenPreview,
}: {
  profile: LootProfile
  /** The name of the open file. It shows the base profile card in use. */
  fileName: string
  /** Applies a change to the profile. */
  onChange: (profile: LootProfile) => void
  /** Loads a base profile, as File > Open does. */
  onLoadBase: (profile: LootProfile, name: string) => void
  /** Opens the Loot preview tab. */
  onOpenPreview: () => void
}) {
  const [strictnessId, setStrictnessId] = useState('regular')
  const [weaponId, setWeaponId] = useState('heavy')
  const [characterLevel, setCharacterLevel] = useState(126)
  const [packSlots, setPackSlots] = useState(12)

  const strictness = STRICTNESS_LEVELS.find((l) => l.id === strictnessId) ?? STRICTNESS_LEVELS[0]!
  const weapon = WEAPON_CHOICES.find((w) => w.id === weaponId) ?? WEAPON_CHOICES[0]!

  const character = useMemo(
    () => ({ ...SAMPLE_CHARACTER, level: characterLevel, mainPackFreeSlots: packSlots }),
    [characterLevel, packSlots],
  )

  const decisions = useMemo(
    () => ITEMS.map((item) => previewItem(profile, item, undefined, character)),
    [profile, character],
  )

  const groups = useMemo(() => trophyGroups(profile), [profile])

  function chooseStrictness(id: string) {
    const level = STRICTNESS_LEVELS.find((l) => l.id === id)
    if (!level) return
    setStrictnessId(id)
    onChange(applySettings(profile, level, weapon.prefix))
  }

  function chooseWeapon(id: string) {
    const choice = WEAPON_CHOICES.find((w) => w.id === id)
    if (!choice) return
    setWeaponId(id)
    onChange(applySettings(profile, strictness, choice.prefix))
  }

  function setNumber(value: string, set: (n: number) => void) {
    const number = Number(value)
    if (Number.isFinite(number)) set(number)
  }

  /**
   * Loads a base profile. The strictness level and the weapon choice come
   * with it, so the page always shows the state of the profile.
   */
  function loadBase(base: BaseProfile) {
    const loaded = readBaseProfile(base)
    onLoadBase(loaded, base.fileName)
    onChange(applySettings(loaded, strictness, weapon.prefix))
  }

  return (
    <div role="tabpanel" aria-label="Overview" className="overview">
      <div className="overview-main">
        <section aria-labelledby="overview-base" className="overview-section">
          <h2 id="overview-base">
            <span>1</span> · Start from a base profile
          </h2>
          <div role="group" aria-label="Base profiles" className="base-profiles">
            {BASE_PROFILES.map((base) => (
              <button
                key={base.id}
                type="button"
                aria-pressed={base.fileName === fileName}
                onClick={() => loadBase(base)}
              >
                <span>{base.name}</span>
                <span>{base.note}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="overview-strictness" className="overview-section">
          <h2 id="overview-strictness">
            <span>2</span> · Strictness
          </h2>
          <div role="radiogroup" aria-label="Strictness" className="strictness-levels">
            {STRICTNESS_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                role="radio"
                aria-checked={level.id === strictnessId}
                onClick={() => chooseStrictness(level.id)}
              >
                {level.name}
              </button>
            ))}
          </div>
          <p className="strictness-note">{strictness.note}</p>
        </section>

        <section aria-labelledby="overview-character" className="overview-section">
          <h2 id="overview-character">
            <span>3</span> · Your character
          </h2>
          <div className="character-fields">
            <label>
              Main skill
              <select
                aria-label="Main skill"
                value={weaponId}
                onChange={(e) => chooseWeapon(e.target.value)}
              >
                {WEAPON_CHOICES.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Level
              <input
                aria-label="Level"
                type="number"
                value={characterLevel}
                onChange={(e) => setNumber(e.target.value, setCharacterLevel)}
              />
            </label>
            <label>
              Free pack slots to keep
              <input
                aria-label="Free pack slots to keep"
                type="number"
                value={packSlots}
                onChange={(e) => setNumber(e.target.value, setPackSlots)}
              />
            </label>
          </div>
          <div role="group" aria-label="Also keep" className="trophy-pills">
            {groups.map((group) => {
              const named = group.rules.filter((i) => profile.rules[i]!.name !== '')
              const on = named.filter((i) => !isRuleDisabled(profile.rules[i]!)).length
              const pressed = named.length > 0 && on === named.length
              return (
                <button
                  key={group.name}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => onChange(setGroupEnabled(profile, group, !pressed))}
                >
                  {group.name}
                  <span className="pill-count">
                    {on}/{named.length}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <aside aria-label="Preview" className="overview-aside">
        <h2>What drops look like</h2>
        <ul className="overview-items">
          {ITEMS.map((item, i) => (
            <li key={item.name}>
              <span className={`loot-badge ${actionClass(decisions[i]!.action)}`}>
                {actionName(decisions[i]!.action)}
              </span>
              <span className="item-name">{item.name}</span>
              <span className="item-rule">{decisions[i]!.ruleName}</span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onOpenPreview}>
          Open the full loot preview
        </button>
      </aside>
    </div>
  )
}
