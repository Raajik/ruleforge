// Tests for the base profiles of the Overview page (PLAN.md H5). The rule
// counts are the counts of the three sample files of the `fixtures` folder.

import { describe, expect, it } from 'vitest'
import { BASE_PROFILES, readBaseProfile } from './baseprofiles'

describe('the base profiles', () => {
  it('has the three sample files and the empty profile', () => {
    expect(BASE_PROFILES.map((b) => b.name)).toEqual([
      'LootSnob v4',
      'ILT Legendary',
      'IAC Leveling',
      'Empty profile',
    ])
  })

  it('reads the rules of each file', () => {
    expect(readBaseProfile(BASE_PROFILES[0]!).rules).toHaveLength(1627)
    expect(readBaseProfile(BASE_PROFILES[1]!).rules).toHaveLength(1632)
    expect(readBaseProfile(BASE_PROFILES[2]!).rules).toHaveLength(56)
  })

  it('gives an empty profile for the card of a new profile', () => {
    const profile = readBaseProfile(BASE_PROFILES[3]!)
    expect(profile.rules).toHaveLength(0)
    expect(profile.version).toBe(1)
  })
})
