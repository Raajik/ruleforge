/**
 * The user's own client_portal.dat for the armor preview's exact roll
 * (specs/armor-preview.md items 9-10). The App keeps one for the session.
 * The DAT reader loads only when the user picks a file, so it stays out of
 * the first bundle, and nothing is read before the pick.
 */
import { useState } from 'react'
import type { LookSource } from '../core/gamedata/armorroll'
import { openDesktopDat } from './desktopio'
import { datFromFile, type PickedDat } from './fileio'

export interface GameFiles {
  /** The picked file's name, or null before a good pick. */
  name: string | null
  source: LookSource | null
  /** A short message when the last pick could not be read. */
  error: string
  /** The desktop app picks through the native dialog; the browser through a file input. */
  desktop: boolean
  pickFile(file: File): Promise<void>
  pickDesktop(): Promise<void>
}

export function useGameFiles(desktop: boolean): GameFiles {
  const [state, setState] = useState<{ name: string | null; source: LookSource | null; error: string }>({
    name: null,
    source: null,
    error: '',
  })

  async function use(picked: PickedDat): Promise<void> {
    try {
      const { openPortalLooks } = await import('../core/dat/looks')
      setState({ name: picked.name, source: await openPortalLooks(picked.read, picked.size), error: '' })
    } catch {
      setState({ name: null, source: null, error: `Could not read ${picked.name}. Randomize uses approximate colours.` })
    }
  }

  return {
    ...state,
    desktop,
    pickFile: (file) => use(datFromFile(file)),
    async pickDesktop() {
      let picked: PickedDat | null
      try {
        picked = await openDesktopDat()
      } catch {
        setState({ name: null, source: null, error: 'Could not open the file. Randomize uses approximate colours.' })
        return
      }
      if (picked) await use(picked)
    },
  }
}
