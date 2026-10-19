/**
 * File operations (T26). The C# is ref/editor/Form1.cs 292-464.
 *
 * New: 292-307. The default VT profile folder: 308-318 (a Windows registry
 * read, out of scope here). Load: 360-387. The unsaved-changes check:
 * 388-428. Save and Save As: 429-464.
 *
 * A load or save needs the file system, which comes in T31. These functions
 * hold the editor state that the C# form keeps in its fields (`FileName`,
 * `FileChanged`, `LastBackup`, `LootRules`) and give the bytes to write.
 * Every function is pure.
 */

import type { LootProfile } from '../format/profile'
import { writeProfile } from '../format/profile'

/** Form1.cs line 45. */
export const APP_NAME = 'Virindi Tank Loot Editor'

/** Form1.cs line 417: a backup is at most one per 5 minutes. */
export const BACKUP_INTERVAL_MINUTES = 5

/** The editor state that a load, a save or a new file changes. */
export interface FileState {
  fileName: string
  profile: LootProfile
  /** The C# `FileChanged`. */
  changed: boolean
  /** The C# `LastBackup`, in milliseconds. */
  lastBackup: number
}

/** Form1.cs 293-306, plus the constructor defaults (46-56). */
export function newFile(): { profile: LootProfile; profileName: string; title: string; changed: boolean } {
  return { profile: { version: 1, rules: [], extraBlocks: [] }, profileName: '', title: untitledTitle(), changed: false }
}

/** Form1.cs 52, 298: the window title without a file name. */
export function untitledTitle(): string {
  return `${APP_NAME} - New File`
}

/** Form1.cs 367, 458: the window title with a file name. */
export function windowTitle(fileName: string): string {
  return `${APP_NAME} - ${fileName}`
}

/**
 * Form1.cs 390-404: the "File not saved. Save now?" box. The caller keeps
 * `ask`, stops on `cancel`, or saves and uses the Save As result (`saveasres`)
 * on `save`.
 */
export function unsavedChangesPrompt(changed: boolean): 'ask' | 'continue' {
  return changed ? 'ask' : 'continue'
}

/**
 * Form1.cs 420: `<file name>.<yyyy-MM-dd-HH-mm>.bak`. The stamp has the
 * fixed digits of the C# format, so this function builds it by hand, not
 * through `toISOString`.
 */
export function backupFileName(fileName: string, at: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}-${pad(at.getHours())}-${pad(at.getMinutes())}`
  return `${fileName}.${stamp}.bak`
}

/**
 * Form1.cs 429-435: `DoSave` clears the change flag and writes the profile.
 * The caller writes `text` to `state.fileName`. `DoSave` does not touch
 * `LastBackup` (445-463 resets it, and LoadFile 368).
 */
export function saveState(state: FileState): { state: FileState; text: string } {
  return { state: { ...state, changed: false }, text: writeProfile(state.profile) }
}

/**
 * Form1.cs 407-427: the `FileChanged` setter. It takes a backup of a named
 * file when the last one is over 5 minutes old. The caller writes `text` to
 * `fileName` when it is not undefined. Compared in crossed multiplication, as
 * the C# compares `TotalMinutes > 5d`.
 */
export function markChanged(
  state: FileState,
  now: number,
): { state: FileState; fileName?: string; text?: string } {
  if (!state.changed) return { state }
  if (state.fileName === '') return { state }
  if ((now - state.lastBackup) / (60 * 1000) <= BACKUP_INTERVAL_MINUTES) return { state }
  return {
    state: { ...state, lastBackup: now },
    fileName: backupFileName(state.fileName, new Date(now)),
    text: writeProfile(state.profile),
  }
}
