// Tests for the generated game data (T16). The counts and values come from the
// C# source in ref/: the enums in ref/decompiled/VTClassic/*.cs and the
// GameInfo tables in ref/shared/Constants.cs.

import { describe, expect, it } from 'vitest'
import {
  doubleValueKey,
  intValueKey,
  materialGroups,
  materialIds,
  materialNames,
  masteryInfo,
  objectClass,
  setInfo,
  skillInfo,
  stringValueKey,
  vtcSkillID,
} from './generated'

describe('generated enums', () => {
  it('has the entry count of IntValueKey', () => {
    expect(Object.keys(intValueKey)).toHaveLength(114)
  })

  it('checks IntValueKey Workmanship, Material and StackCount', () => {
    expect(intValueKey.Workmanship).toBe(105)
    expect(intValueKey.Material).toBe(131)
    expect(intValueKey.StackCount).toBe(218103814)
  })

  it('has the entry count of DoubleValueKey', () => {
    expect(Object.keys(doubleValueKey)).toHaveLength(24)
  })

  it('checks DoubleValueKey SlashProt, MeleeDefenseBonus and DamageBonus', () => {
    expect(doubleValueKey.MeleeDefenseBonus).toBe(29)
    expect(doubleValueKey.SlashProt).toBe(167772160)
    expect(doubleValueKey.DamageBonus).toBe(167772174)
  })

  it('has the entry count of StringValueKey', () => {
    expect(Object.keys(stringValueKey)).toHaveLength(16)
  })

  it('checks StringValueKey Name, DateBorn and SecondaryName', () => {
    expect(stringValueKey.Name).toBe(1)
    expect(stringValueKey.DateBorn).toBe(43)
    expect(stringValueKey.SecondaryName).toBe(184549376)
  })

  it('numbers ObjectClass from 0 in declaration order', () => {
    expect(Object.keys(objectClass)).toHaveLength(43)
    expect(objectClass.Unknown).toBe(0)
    expect(objectClass.MeleeWeapon).toBe(1)
    expect(objectClass.Scroll).toBe(42)
  })

  it('has the entry count of VTCSkillID', () => {
    expect(Object.keys(vtcSkillID)).toHaveLength(49)
  })

  it('checks VTCSkillID Axe, MeleeDefense and Summoning', () => {
    expect(vtcSkillID.Axe).toBe(1)
    expect(vtcSkillID.MeleeDefense).toBe(6)
    expect(vtcSkillID.Summoning).toBe(54)
  })
})

describe('generated GameInfo tables', () => {
  it('has the entry count of getSetInfo', () => {
    expect(setInfo).toHaveLength(28)
  })

  it("checks set info Protective Clothing, Soldier's and Noble Relic", () => {
    const map = new Map(setInfo)
    expect(map.get('Protective Clothing')).toBe(32)
    expect(map.get("Soldier's")).toBe(13)
    expect(map.get('Noble Relic')).toBe(5)
  })

  it('has the entry count of getSkillInfo', () => {
    expect(skillInfo).toHaveLength(30)
  })

  it('checks skill info rows', () => {
    const map = new Map(skillInfo)
    expect(map.get('Axe (DEPRECEATED)')).toBe(1)
    expect(map.get('MeleeD')).toBe(6)
    expect(map.get('Summoning')).toBe(54)
  })

  it('has the entry count of getMasteryInfo', () => {
    expect(masteryInfo).toHaveLength(11)
  })

  it('checks mastery info rows', () => {
    const map = new Map(masteryInfo)
    expect(map.get('Unarmed Weapon')).toBe(1)
    expect(map.get('Bow')).toBe(8)
    expect(map.get('Two Handed Combat')).toBe(11)
  })

  it('has the entry count of getMaterialInfo', () => {
    expect(materialIds).toHaveLength(72)
  })

  it('checks material ids Ceramic, Agate and Zircon', () => {
    const map = new Map(materialIds)
    expect(map.get('Ceramic')).toBe(1)
    expect(map.get('Agate')).toBe(10)
    expect(map.get('Zircon')).toBe(50)
  })

  it('maps each material id back to its name', () => {
    expect(materialNames).toHaveLength(72)
    const map = new Map(materialNames)
    expect(map.get(1)).toBe('Ceramic')
    expect(map.get(10)).toBe('Agate')
    expect(map.get(50)).toBe('Zircon')
  })

  it('has the entry count of getMaterialGroups', () => {
    expect(materialGroups).toHaveLength(11)
  })

  it('checks material group contents', () => {
    const map = new Map(materialGroups)
    expect(map.get('Basic Tinkering')).toEqual([51, 52])
    expect(map.get('Armor Tinkering')).toEqual([66, 53, 58, 1, 68, 34, 55, 64, 8, 49, 50])
    expect(map.get('RG/BG/Jet')).toEqual([35, 15, 27])
  })

  it('uses only real material ids in the groups', () => {
    const ids = new Set(materialIds.map(([, id]) => id))
    for (const [, group] of materialGroups) for (const id of group) expect(ids.has(id)).toBe(true)
  })
})
