/**
 * The base profiles of the Overview page (PLAN.md H5,
 * design/A2-overview.html). They are the three sample files of the
 * `fixtures` folder, read as text at build time, and a new empty profile.
 *
 * The rule counts of the notes are the counts of those files.
 */

import type { LootProfile } from '../format/profile'
import { readProfile } from '../format/profile'
import { newFile } from './file'
import iacText from '../../../fixtures/IAC_Level_NoCash.utl?raw'
import iltText from '../../../fixtures/ILT_Legendary.utl?raw'
import snobText from '../../../fixtures/LootSnobV4.utl?raw'

/** One card of the "Start from a base profile" part of the Overview page. */
export interface BaseProfile {
  id: string
  name: string
  note: string
  /** The name of the file. Empty for a new profile. */
  fileName: string
  /** The text of the .utl file. Empty for a new profile. */
  text: string
}

export const BASE_PROFILES: BaseProfile[] = [
  {
    id: 'lootsnob',
    name: 'LootSnob v4',
    note: '1,627 rules, endgame',
    fileName: 'LootSnobV4.utl',
    text: snobText,
  },
  {
    id: 'ilt',
    name: 'ILT Legendary',
    note: '1,632 rules, legendary gear',
    fileName: 'ILT_Legendary.utl',
    text: iltText,
  },
  {
    id: 'iac',
    name: 'IAC Leveling',
    note: '56 rules, levels 1 to 275',
    fileName: 'IAC_Level_NoCash.utl',
    text: iacText,
  },
  { id: 'empty', name: 'Empty profile', note: 'Build your own', fileName: '', text: '' },
]

/** The profile of a base profile card. */
export function readBaseProfile(base: BaseProfile): LootProfile {
  return base.text === '' ? newFile().profile : readProfile(base.text)
}
