// Tests for the file operations (T26). The C# is ref/editor/Form1.cs 292-464.
//
// The file access itself comes in T31. These functions keep the editor state
// (file name, unsaved flag, backup time) and give the bytes to save.

import { describe, expect, it } from 'vitest'
import type { LootProfile } from '../format/profile'
import { readProfile, writeProfile } from '../format/profile'
import {
  APP_NAME,
  BACKUP_INTERVAL_MINUTES,
  backupFileName,
  markChanged,
  newFile,
  saveState,
  unsavedChangesPrompt,
  untitledTitle,
  windowTitle,
  type FileState,
} from './file'

const MINUTE = 60 * 1000

function profile(): LootProfile {
  return { version: 1, rules: [], extraBlocks: [] }
}

function state(overrides: Partial<FileState> = {}): FileState {
  return { fileName: '', profile: profile(), changed: false, lastBackup: 0, ...overrides }
}

describe('newFile', () => {
  it('starts a fresh profile with no file name, no changes and no title', () => {
    const out = newFile()

    expect(out.profileName).toBe('')
    expect(out.title).toBe(`${APP_NAME} - New File`)
    expect(out.changed).toBe(false)
    expect(out.profile).toEqual(profile())
  })
})

describe('titles', () => {
  it('shows the file name after the app name, as LoadFile and Save As do', () => {
    expect(windowTitle('C:\\foo.utl')).toBe(`${APP_NAME} - C:\\foo.utl`)
    expect(untitledTitle()).toBe(`${APP_NAME} - New File`)
  })
})

describe('unsavedChangesPrompt', () => {
  it('asks only when the file has unsaved changes', () => {
    expect(unsavedChangesPrompt(true)).toBe('ask')
    expect(unsavedChangesPrompt(false)).toBe('continue')
  })
})

describe('backupFileName', () => {
  it('appends the minute stamp to the file name, with the .bak extension', () => {
    const at = new Date(2026, 9, 19, 14, 35)
    expect(backupFileName('C:\\profiles\\Loot.utl', at)).toBe('C:\\profiles\\Loot.utl.2026-10-19-14-35.bak')
  })

  it('pads every field to two digits', () => {
    const at = new Date(2026, 0, 2, 3, 4)
    expect(backupFileName('a.utl', at)).toBe('a.utl.2026-01-02-03-04.bak')
  })
})

describe('save', () => {
  it('writes the profile and clears the change flag', () => {
    const before = state({ fileName: 'a.utl', changed: true, lastBackup: 5 })
    const saved = saveState(before)

    expect(saved.state.changed).toBe(false)
    expect(saved.text).toBe(writeProfile(before.profile))
    expect(readProfile(saved.text)).toEqual(before.profile)
    // DoSave does not touch LastBackup (Form1.cs 429-435).
    expect(saved.state.lastBackup).toBe(5)
    expect(before.changed).toBe(true)
  })

  it('keeps the profile unchanged', () => {
    const p: LootProfile = { ...profile(), rules: [], extraBlocks: [] }
    const saved = saveState(state({ profile: p }))
    expect(saved.state.profile).toBe(p)
  })
})

describe('markChanged', () => {
  it('takes a backup of a named file when the last one is over 5 minutes old', () => {
    const now = new Date(2026, 9, 19, 14, 35).getTime()
    const before = state({ fileName: 'a.utl', changed: true, lastBackup: 0 })
    const out = markChanged(before, now)

    expect(out.state.lastBackup).toBe(now)
    expect(out.fileName).toBe('a.utl.2026-10-19-14-35.bak')
    expect(out.text).toBe(writeProfile(before.profile))
    expect(before.lastBackup).toBe(0)
  })

  it('does not back up within 5 minutes, on a change that is already set, or with no file name', () => {
    const now = 10 * MINUTE
    const recent = state({ fileName: 'a.utl', changed: true, lastBackup: now - 5 * MINUTE })
    expect(markChanged(recent, now)).toEqual({ state: recent })

    const same = state({ fileName: 'a.utl', changed: true, lastBackup: 0 })
    const twice = markChanged(same, now)
    expect(markChanged(twice.state, now).fileName).toBeUndefined()

    const unnamed = state({ fileName: '', changed: true, lastBackup: 0 })
    expect(markChanged(unnamed, now).fileName).toBeUndefined()

    const clean = state({ fileName: 'a.utl', changed: false, lastBackup: 0 })
    expect(markChanged(clean, now).fileName).toBeUndefined()
  })
})
