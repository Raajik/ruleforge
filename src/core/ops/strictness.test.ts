// Tests for the strictness levels and the character choices (PLAN.md H5,
// specs/ruleforge-ui.md "Strictness"). The counts come from the section
// marker rules of LootSnobV4.utl.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { LootProfile, LootRule, Requirement } from '../format/profile'
import { eLootRuleType } from '../format/enums'
import { readProfile } from '../format/profile'
import { categorizeRules } from './categories'
import { isRuleDisabled } from './rules'
import {
  STRICTNESS_LEVELS,
  WEAPON_CHOICES,
  applySettings,
  applyStrictness,
  applyWeaponChoice,
  findLadders,
  ladderKey,
  setGroupEnabled,
  trophyGroups,
} from './strictness'

function fixture(name: string): LootProfile {
  return readProfile(readFileSync(`fixtures/${name}`, 'utf8'))
}

function rule(name: string, requirements: Requirement[] = []): LootRule {
  return { name, customExpression: '', priority: 0, action: 1, lootActionData: 0, requirements }
}

function profile(...rules: LootRule[]): LootProfile {
  return { version: 1, rules, extraBlocks: [] }
}

/** The rules of the section with this plain name, without its stars. */
function section(profile: LootProfile, name: string): number[] {
  const category = categorizeRules(profile).find(
    (c) => c.name.replace(/^\*+/, '').replace(/\*+$/, '').trim() === name,
  )
  if (!category) throw new Error(`No section ${name}`)
  return category.rules
}

/** The rules of the section, without the separators that have no name. */
function namedSection(profile: LootProfile, name: string): number[] {
  return section(profile, name).filter((i) => profile.rules[i]!.name !== '')
}

/** The name of every rule that is on, in file order. */
function onNames(profile: LootProfile): string[] {
  return profile.rules.filter((r) => !isRuleDisabled(r)).map((r) => r.name)
}

describe('the strictness table', () => {
  it('has the four levels of the spec, with the rung depths 2, 4, 6 and all', () => {
    expect(STRICTNESS_LEVELS.map((l) => l.name)).toEqual(['Very strict', 'Strict', 'Regular', 'Soft'])
    expect(STRICTNESS_LEVELS.map((l) => l.rungs)).toEqual([2, 4, 6, null])
  })

  it('keeps the Value and Death Items off at Strict and Very strict', () => {
    expect(STRICTNESS_LEVELS.map((l) => l.valueRungs)).toEqual([0, 0, 6, null])
  })

  it('has the gear tiers of the spec', () => {
    expect(STRICTNESS_LEVELS.map((l) => l.gearTiers)).toEqual([
      ['legendary'],
      ['legendary', 'ward'],
      ['legendary', 'ward', 'epic'],
      ['legendary', 'ward', 'epic', 'major'],
    ])
  })

  it('has the five weapon prefixes of the spec', () => {
    expect(WEAPON_CHOICES.map((w) => w.prefix)).toEqual(['(H)', '(L)', '(F)', '(M)', '(W)'])
  })
})

describe('ladderKey', () => {
  it('makes every digit run a hash', () => {
    expect(ladderKey('(H) Axe (OD +10)')).toBe('(H) Axe (OD +#)')
    expect(ladderKey('(H) Axe (OD +1)')).toBe('(H) Axe (OD +#)')
    expect(ladderKey('(W) No Wield (29MD)')).toBe('(W) No Wield (#MD)')
  })

  it('trims the name, so the indent of a rule does not make a new ladder', () => {
    expect(ladderKey('     (H) Axe (Max 430)')).toBe('(H) Axe (Max #)')
    expect(ladderKey('     (H) Axe (Max 420)')).toBe('(H) Axe (Max #)')
  })

  it('keeps a name that has no digit as it is', () => {
    expect(ladderKey('(H) 430 Insane')).toBe('(H) # Insane')
    expect(ladderKey('(H) Axe (Mods)')).toBe('(H) Axe (Mods)')
  })
})

describe('findLadders', () => {
  it('finds 180 ladders in Melee Weapons, 120 of them with one rung', () => {
    const p = fixture('LootSnobV4.utl')
    const ladders = findLadders(p, section(p, 'Melee Weapons'))
    expect(ladders).toHaveLength(180)
    expect(ladders.filter((l) => l.length === 1)).toHaveLength(120)
  })

  it('makes a run of rules with the same key one ladder, the best rung first', () => {
    const p = fixture('LootSnobV4.utl')
    const ladders = findLadders(p, section(p, 'Melee Weapons'))
    const axe = ladders.find((l) => p.rules[l[0]!]!.name === '(H) Axe (OD +10)')
    expect(axe!.map((i) => p.rules[i]!.name)).toEqual([
      '(H) Axe (OD +10)',
      '(H) Axe (OD +9)',
      '(H) Axe (OD +8)',
      '(H) Axe (OD +7)',
      '(H) Axe (OD +6)',
      '(H) Axe (OD +5)',
      '(H) Axe (OD +4)',
      '(H) Axe (OD +3)',
      '(H) Axe (OD +2)',
      '(H) Axe (OD +1)',
    ])
  })

  it('finds the two rungs of the (ME) 40k ladder of the Value section', () => {
    const p = fixture('LootSnobV4.utl')
    const ladders = findLadders(p, section(p, 'Value'))
    const value = ladders.find((l) => p.rules[l[0]!]!.name === '(ME) 40k')
    expect(value!.map((i) => p.rules[i]!.name)).toEqual(['(ME) 40k', '(ME) 30k'])
  })

  it('leaves a rule with an empty name out of every ladder', () => {
    const p = fixture('LootSnobV4.utl')
    const ladders = findLadders(p, section(p, 'Value'))
    expect(ladders.flat().some((i) => p.rules[i]!.name === '')).toBe(false)
  })
})

describe('applyStrictness', () => {
  const p = fixture('LootSnobV4.utl')

  it('keeps the top two rungs of a ladder at Very strict', () => {
    const next = applyStrictness(p, STRICTNESS_LEVELS[0]!)
    const names = onNames(next)
    expect(names).toContain('(H) Axe (OD +10)')
    expect(names).toContain('(H) Axe (OD +9)')
    expect(names).not.toContain('(H) Axe (OD +8)')
  })

  it('keeps 808 rules on at Very strict, 945 at Strict, 1078 at Regular and 1259 at Soft', () => {
    const counts = STRICTNESS_LEVELS.map((level) => onNames(applyStrictness(p, level)).length)
    expect(counts).toEqual([808, 945, 1078, 1259])
  })

  it('leaves a gear sub-section that is no tier of the table alone', () => {
    const off: Requirement[] = [{ type: eLootRuleType.DisabledRule, b: true }]
    const p = profile(
      rule('***** Armor *****'),
      rule('  ** Legendary **'),
      rule('(A) Epic + 8', [...off]),
      rule('  ** Special **'),
      rule('(A) Special', [...off]),
    )
    const names = onNames(applyStrictness(p, STRICTNESS_LEVELS[0]!))
    // The Legendary tier is on at Very strict.
    expect(names).toContain('(A) Epic + 8')
    // The Special sub-section is no tier, so it keeps its state.
    expect(names).not.toContain('(A) Special')
  })

  it('keeps the rule with an empty name as the file has it', () => {
    const before = p.rules.filter((r) => r.name === '').map((r) => isRuleDisabled(r))
    expect(before).toHaveLength(152)
    for (const level of STRICTNESS_LEVELS) {
      const next = applyStrictness(p, level)
      const after = next.rules.filter((r) => r.name === '').map((r) => isRuleDisabled(r))
      expect(after).toEqual(before)
    }
  })

  it('keeps the Cloaks section as one ladder in file order', () => {
    const next = applyStrictness(p, STRICTNESS_LEVELS[2]!)
    const cloaks = section(next, 'Cloaks')
    expect(cloaks.filter((i) => !isRuleDisabled(next.rules[i]!))).toHaveLength(6)
    expect(next.rules[cloaks[0]!]!.name).toBe('(CL) Cloak (5+ -200 + d3)')
  })

  it('keeps the top four rungs of a ladder at Strict', () => {
    const names = onNames(applyStrictness(p, STRICTNESS_LEVELS[1]!))
    expect(names).toContain('(H) Axe (OD +7)')
    expect(names).not.toContain('(H) Axe (OD +6)')
  })

  it('keeps the top six rungs of a ladder at Regular', () => {
    const names = onNames(applyStrictness(p, STRICTNESS_LEVELS[2]!))
    expect(names).toContain('(H) Axe (OD +5)')
    expect(names).not.toContain('(H) Axe (OD +4)')
  })

  it('keeps every rung of a ladder at Soft', () => {
    const names = onNames(applyStrictness(p, STRICTNESS_LEVELS[3]!))
    expect(names).toContain('(H) Axe (OD +1)')
  })

  it('turns on the gear tiers of the level and turns the other tiers off', () => {
    const veryStrict = applyStrictness(p, STRICTNESS_LEVELS[0]!)
    // The Legendary Sets of Armor are on, the Epic Sets are off.
    const armorSets = namedSection(veryStrict, 'Legendary Sets')
    expect(armorSets.length).toBe(142)
    expect(armorSets.every((i) => !isRuleDisabled(veryStrict.rules[i]!))).toBe(true)
    const epicSets = namedSection(veryStrict, 'Epic Sets')
    expect(epicSets.every((i) => isRuleDisabled(veryStrict.rules[i]!))).toBe(true)

    const soft = applyStrictness(p, STRICTNESS_LEVELS[3]!)
    expect(namedSection(soft, 'Epic Sets').every((i) => !isRuleDisabled(soft.rules[i]!))).toBe(true)
    expect(namedSection(soft, 'Other').every((i) => !isRuleDisabled(soft.rules[i]!))).toBe(true)
  })

  it('keeps the Ward tier off at Very strict and on at Strict', () => {
    const veryStrict = applyStrictness(p, STRICTNESS_LEVELS[0]!)
    expect(
      namedSection(veryStrict, 'Ward/Impen').every((i) => isRuleDisabled(veryStrict.rules[i]!)),
    ).toBe(true)
    const strict = applyStrictness(p, STRICTNESS_LEVELS[1]!)
    expect(namedSection(strict, 'Ward/Impen').every((i) => !isRuleDisabled(strict.rules[i]!))).toBe(true)
  })

  it('keeps the Value and Death Items off at Strict and on at Soft', () => {
    const strict = applyStrictness(p, STRICTNESS_LEVELS[1]!)
    expect(namedSection(strict, 'Value').every((i) => isRuleDisabled(strict.rules[i]!))).toBe(true)
    expect(namedSection(strict, 'Death Items').every((i) => isRuleDisabled(strict.rules[i]!))).toBe(true)
    const soft = applyStrictness(p, STRICTNESS_LEVELS[3]!)
    expect(namedSection(soft, 'Value').some((i) => !isRuleDisabled(soft.rules[i]!))).toBe(true)
  })

  it('keeps the top six rungs of the Value ladders at Regular', () => {
    const regular = applyStrictness(p, STRICTNESS_LEVELS[2]!)
    const names = onNames(regular)
    expect(names).toContain('(A) 90k')
    expect(names).toContain('(A) 60k')
    expect(names).not.toContain('(A) 50k')
  })

  it('leaves the sections that strictness does not touch as the file has them', () => {
    const next = applyStrictness(p, STRICTNESS_LEVELS[2]!)
    // Item Only, Shields and Tailoring keep their state.
    for (const name of ['Item Only', 'Shields', 'Tailoring', 'Tailoring (Special)']) {
      const before = section(p, name)
      const after = section(next, name)
      expect(after.map((i) => isRuleDisabled(next.rules[i]!))).toEqual(
        before.map((i) => isRuleDisabled(p.rules[i]!)),
      )
    }
  })

  it('never changes its input', () => {
    const before = writeRules(p)
    applyStrictness(p, STRICTNESS_LEVELS[0]!)
    expect(writeRules(p)).toBe(before)
  })
})

describe('applyWeaponChoice', () => {
  const p = fixture('LootSnobV4.utl')

  it('turns the rules of the other weapon types off', () => {
    const next = applyWeaponChoice(p, '(H)')
    const names = onNames(next)
    expect(names.some((n) => n.startsWith('(L)'))).toBe(false)
    expect(names.some((n) => n.startsWith('(F)'))).toBe(false)
    expect(names.some((n) => n.startsWith('(M)'))).toBe(false)
    expect(names.some((n) => n.startsWith('(W)'))).toBe(false)
  })

  it('keeps the rules of the chosen weapon type as they are', () => {
    const next = applyWeaponChoice(p, '(H)')
    const before = onNames(p).filter((n) => n.startsWith('(H)'))
    expect(onNames(next).filter((n) => n.startsWith('(H)'))).toEqual(before)
  })

  it('does not touch a name that only starts with the same letter', () => {
    const rules = ['(H) Axe', '(ME) 40k', '(W) 40k', '(M) Bow'].map((name) => rule(name))
    const next = applyWeaponChoice(profile(...rules), '(W)')
    // "(ME) 40k" is a melee value rule, not a missile rule.
    expect(onNames(next)).toEqual(['(ME) 40k', '(W) 40k'])
  })
})

describe('applySettings', () => {
  const p = fixture('LootSnobV4.utl')

  it('runs the level first and the weapon choice after it', () => {
    const next = applySettings(p, STRICTNESS_LEVELS[2]!, '(H)')
    const names = onNames(next)
    // The level turned the best six rungs of every ladder on.
    expect(names).toContain('(H) Axe (OD +5)')
    // The weapon choice turned the light rules off again.
    expect(names.some((n) => n.startsWith('(L)'))).toBe(false)
  })
})

describe('trophyGroups', () => {
  it('gives the sub-sections of the Trophies section of LootSnobV4.utl', () => {
    const groups = trophyGroups(fixture('LootSnobV4.utl'))
    expect(groups).toHaveLength(19)
    expect(groups[0]!.name).toBe('Aetheria')
    expect(groups[0]!.rules).toHaveLength(6)
  })

  it('turns a group on and off', () => {
    const p = fixture('LootSnobV4.utl')
    const group = trophyGroups(p)[0]!
    const named = group.rules.filter((i) => p.rules[i]!.name !== '')
    const off = setGroupEnabled(p, group, false)
    expect(named.every((i) => isRuleDisabled(off.rules[i]!))).toBe(true)
    const on = setGroupEnabled(off, group, true)
    expect(named.every((i) => !isRuleDisabled(on.rules[i]!))).toBe(true)
  })

  it('keeps the rule with an empty name of a group as the file has it', () => {
    const p = fixture('LootSnobV4.utl')
    const group = trophyGroups(p)[0]!
    const blank = group.rules.find((i) => p.rules[i]!.name === '')
    expect(blank).toBeDefined()
    const on = setGroupEnabled(p, group, true)
    expect(isRuleDisabled(on.rules[blank!]!)).toBe(true)
  })
})

/** The on/off state of every rule, as text. */
function writeRules(p: LootProfile): string {
  return p.rules.map((r) => `${isRuleDisabled(r) ? 'off' : 'on'}:${r.name}`).join('\n')
}
