/**
 * Desktop file access (PLAN.md T32). Under Tauri the native open and save
 * dialogs and the fs plugin replace the browser file access of T31. The web
 * app keeps working: every function here needs the Tauri runtime.
 *
 * The C# is ref/editor/Form1.cs 360-464 (LoadFile, CheckSave, Save and
 * Save As) and the `FileChanged` setter 407-427, which writes the 5-minute
 * `.bak` backup. The plugin calls never throw to the caller: a closed dialog
 * and an unreadable file give null, as the browser path does.
 */

import { isTauri } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { backupFileName } from '../core/ops/file'

/**
 * The file type of the C# open and save dialogs (Form1.cs 324-325, 450-451).
 */
const UTL_FILTERS = [{ name: 'uTank settings files', extensions: ['utl'] }]

/** A picked profile file: the name to show and the text (T31's shape). */
export interface PickedDesktopProfile {
  name: string
  text: string
  /** The full path, for the next Save and for the backup beside it. */
  path: string
}

/**
 * The backup path: the C# `FileName + "." + stamp + ".bak"` (Form1.cs 420),
 * in the folder of the profile. `dialogName` is the name of the save dialog,
 * which is the C# `FileName`.
 */
export function backupPath(path: string, dialogName: string | undefined, at: Date): string {
  const folder = folderOf(path)
  const name = dialogName !== undefined && dialogName !== '' ? dialogName : baseName(path)
  return backupFileName(`${folder}${name}`, at)
}

/** The folder of a path, with its trailing separator. */
function folderOf(path: string): string {
  return path.slice(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
}

/** The last path part, the file name that the window title shows. */
function baseName(path: string): string {
  return path.split(/[/\\]/).pop() ?? path
}

/**
 * The text of ColorSlots.User.xml in the folder of the profile, or null when
 * it is missing or unreadable. The C# reads it from the VTank profile folder
 * (ref/shared/ColorXML.cs 56-87), where VTank keeps its .utl profiles.
 */
export async function readUserColorSlots(profilePath: string): Promise<string | null> {
  try {
    return await readTextFile(`${folderOf(profilePath)}ColorSlots.User.xml`)
  } catch {
    return null
  }
}

/** True inside a Tauri window. The web build has no plugins. */
export function hasDesktopAccess(): boolean {
  return isTauri()
}

/** Form1.cs 319-331, 360-387: the native open dialog, then the file text. */
export async function openDesktopProfile(): Promise<PickedDesktopProfile | null> {
  let path: string | null
  try {
    path = await open({ multiple: false, directory: false, filters: UTL_FILTERS })
  } catch {
    return null
  }
  if (!path) return null
  try {
    return { name: baseName(path), text: await readTextFile(path), path }
  } catch {
    return null
  }
}

/**
 * Form1.cs 429-464: Save writes to the open path, Save As always asks. A save
 * with no path asks, because the C# Save runs Save As for FileName "".
 *
 * `backupAt` is the time of the `.bak` backup of the `FileChanged` setter, or
 * undefined for no backup. The caller keeps the 5-minute clock (App.tsx).
 */
export async function saveDesktopProfile(
  pickNew: boolean,
  suggestedName: string,
  text: string,
  path: string | null,
  backupAt?: number,
): Promise<string | null> {
  let target = pickNew ? null : path
  let dialogName: string | undefined
  if (!target) {
    let picked: string | null
    try {
      picked = await save({ defaultPath: suggestedName, filters: UTL_FILTERS })
    } catch {
      return null
    }
    if (!picked) return null
    target = picked
    dialogName = baseName(picked)
  }
  try {
    if (backupAt !== undefined) {
      await writeTextFile(backupPath(target, dialogName, new Date(backupAt)), text)
    }
    await writeTextFile(target, text)
  } catch {
    return null
  }
  return target
}
