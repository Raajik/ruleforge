// Character input for the evaluator (PLAN.md H3b). The C# Character types
// read the character through Decal's CharacterFilter.

export interface Character {
  /** Character level, like CharacterFilter.Level. */
  level: number
  /** Base skill value by VTCSkillID number, like skill.Base. */
  baseSkills: Record<number, number>
  /** Buffed skill value by VTCSkillID number, like skill.Buffed. */
  buffedSkills: Record<number, number>
  /** Number of free slots in the main pack, computed as in the C# code. */
  mainPackFreeSlots: number
}
