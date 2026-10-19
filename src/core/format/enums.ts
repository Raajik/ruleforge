// Enum values from ref/shared/Constants.cs line 314 and ref/shared/LootRules.cs line 130.
// .NET writes them via Convert.ToString(x, InvariantCulture) which gives base 10.

export const eLootAction = {
  NoLoot: 0,
  Keep: 1,
  Salvage: 2,
  Sell: 3,
  Read: 4,
  User1: 5,
  User2: 6,
  User3: 7,
  User4: 8,
  User5: 9,
  KeepUpTo: 10,
} as const

export const eLootRuleType = {
  UnsupportedRequirement: -1,
  SpellNameMatch: 0,
  StringValueMatch: 1,
  LongValKeyLE: 2,
  LongValKeyGE: 3,
  DoubleValKeyLE: 4,
  DoubleValKeyGE: 5,
  DamagePercentGE: 6,
  ObjectClass: 7,
  SpellCountGE: 8,
  SpellMatch: 9,
  MinDamageGE: 10,
  LongValKeyFlagExists: 11,
  LongValKeyE: 12,
  LongValKeyNE: 13,
  AnySimilarColor: 14,
  SimilarColorArmorType: 15,
  SlotSimilarColor: 16,
  SlotExactPalette: 17,
  CharacterSkillGE: 1000,
  CharacterMainPackEmptySlotsGE: 1001,
  CharacterLevelGE: 1002,
  CharacterLevelLE: 1003,
  CharacterBaseSkill: 1004,
  BuffedMedianDamageGE: 2000,
  BuffedMissileDamageGE: 2001,
  BuffedLongValKeyGE: 2003,
  BuffedDoubleValKeyGE: 2005,
  CalcdBuffedTinkedDamageGE: 2006,
  TotalRatingsGE: 2007,
  CalcedBuffedTinkedTargetMeleeGE: 2008,
  DisabledRule: 9999,
} as const

export type LootAction = (typeof eLootAction)[keyof typeof eLootAction]
export type LootRuleType = (typeof eLootRuleType)[keyof typeof eLootRuleType]
