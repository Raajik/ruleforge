import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeFileHandle, fakeTauri, resetFakeTauri } from '../test/fakeTauri'
import { eLootAction } from '../core/format/enums'
import type { LootProfile } from '../core/format/profile'
import { writeProfile } from '../core/format/profile'
import {
  backupPath,
  hasDesktopAccess,
  openDesktopDat,
  openDesktopProfile,
  saveDesktopProfile,
} from './desktopio'

vi.mock('@tauri-apps/api/core', async () => (await import('../test/fakeTauri')).coreMock)
vi.mock('@tauri-apps/plugin-dialog', async () => (await import('../test/fakeTauri')).dialogMock)
vi.mock('@tauri-apps/plugin-fs', async () => (await import('../test/fakeTauri')).fsMock)

/** The profile text of T26's `writeProfile`, to compare with what lands on disk. */
const PROFILE_TEXT = ((): string => {
  const profile: LootProfile = {
    version: 1,
    extraBlocks: [],
    rules: [
      {
        name: 'Beta',
        customExpression: '',
        priority: 0,
        action: eLootAction.Keep,
        lootActionData: 0,
        requirements: [],
      },
    ],
  }
  return writeProfile(profile)
})()

/** The calls that reached the fs plugin, as paths. */
function writtenPaths(): (string | URL)[] {
  return fakeTauri.writeTextFile.mock.calls.map(([path]) => path)
}

beforeEach(() => {
  resetFakeTauri()
  fakeTauri.readTextFile.mockResolvedValue(PROFILE_TEXT)
  fakeTauri.writeTextFile.mockResolvedValue()
  fakeTauri.open.mockResolvedValue('/profiles/mine.utl')
  fakeTauri.save.mockResolvedValue('/profiles/new.utl')
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('isDesktop and hasDesktopAccess', () => {
  it('hasDesktopAccess follows whether the app runs in a Tauri window', () => {
    expect(hasDesktopAccess()).toBe(true)
  })
})

describe('openDesktopProfile', () => {
  it('reads the .utl file of the native open dialog', async () => {
    expect(await openDesktopProfile()).toEqual({
      name: 'mine.utl',
      text: PROFILE_TEXT,
      path: '/profiles/mine.utl',
    })
    expect(fakeTauri.open).toHaveBeenCalledWith(
      expect.objectContaining({ filters: [{ name: 'uTank settings files', extensions: ['utl'] }] }),
    )
    expect(fakeTauri.readTextFile).toHaveBeenCalledWith('/profiles/mine.utl')
  })

  it('gives null when the user closes the dialog, and does not read', async () => {
    fakeTauri.open.mockResolvedValue(null)
    expect(await openDesktopProfile()).toBeNull()
    expect(fakeTauri.readTextFile).not.toHaveBeenCalled()
  })

  it('gives null when the dialog fails', async () => {
    fakeTauri.open.mockRejectedValue(new Error('no dialog'))
    expect(await openDesktopProfile()).toBeNull()
  })

  it('gives null when the file cannot be read', async () => {
    fakeTauri.readTextFile.mockRejectedValue(new Error('gone'))
    expect(await openDesktopProfile()).toBeNull()
  })
})

describe('saveDesktopProfile', () => {
  it('Save writes the text to the open path and gives it back', async () => {
    expect(await saveDesktopProfile(false, 'mine.utl', PROFILE_TEXT, '/profiles/mine.utl')).toBe(
      '/profiles/mine.utl',
    )
    expect(fakeTauri.save).not.toHaveBeenCalled()
    expect(fakeTauri.writeTextFile).toHaveBeenCalledWith('/profiles/mine.utl', PROFILE_TEXT)
    // Save does not touch a backup: the caller keeps the 5-minute clock.
    expect(fakeTauri.writeTextFile).toHaveBeenCalledTimes(1)
  })

  it('Save As asks for a path with the file name as the default', async () => {
    expect(await saveDesktopProfile(true, 'mine.utl', PROFILE_TEXT, '/profiles/mine.utl')).toBe(
      '/profiles/new.utl',
    )
    expect(fakeTauri.save).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: 'mine.utl' }),
    )
    expect(fakeTauri.writeTextFile).toHaveBeenCalledWith('/profiles/new.utl', PROFILE_TEXT)
  })

  it('Save without a file path asks, as the C# Save runs Save As for FileName ""', async () => {
    expect(await saveDesktopProfile(false, 'New File.utl', PROFILE_TEXT, null)).toBe(
      '/profiles/new.utl',
    )
    expect(fakeTauri.save).toHaveBeenCalledTimes(1)
  })

  it('gives null when the user closes the dialog, and does not write', async () => {
    fakeTauri.save.mockResolvedValue(null)
    expect(await saveDesktopProfile(true, 'mine.utl', PROFILE_TEXT, null)).toBeNull()
    expect(fakeTauri.writeTextFile).not.toHaveBeenCalled()
  })

  it('gives null when the write fails', async () => {
    fakeTauri.writeTextFile.mockRejectedValueOnce(new Error('read only'))
    expect(await saveDesktopProfile(false, 'mine.utl', PROFILE_TEXT, '/profiles/mine.utl')).toBeNull()
  })

  it('writes the .bak backup of `backupAt` before the profile, with its stamp', async () => {
    const at = new Date(2026, 9, 19, 21, 5)
    const result = await saveDesktopProfile(
      false,
      'mine.utl',
      PROFILE_TEXT,
      '/profiles/mine.utl',
      at.getTime(),
    )
    expect(result).toBe('/profiles/mine.utl')
    expect(writtenPaths()).toEqual([
      '/profiles/mine.utl.2026-10-19-21-05.bak',
      '/profiles/mine.utl',
    ])
    // Both files get the same profile text (Form1.cs 420-422).
    expect(fakeTauri.writeTextFile.mock.calls[0]![1]).toBe(PROFILE_TEXT)
  })

  it('uses the save-dialog name for the backup of a save-as', async () => {
    const at = new Date(2026, 9, 19, 21, 5)
    await saveDesktopProfile(true, 'mine.utl', PROFILE_TEXT, '/profiles/mine.utl', at.getTime())
    expect(writtenPaths()).toEqual([
      '/profiles/new.utl.2026-10-19-21-05.bak',
      '/profiles/new.utl',
    ])
  })
})

describe('backupPath', () => {
  it('is the C# file name + stamp + .bak, beside the profile', () => {
    expect(backupPath('/profiles/mine.utl', undefined, new Date(2026, 0, 2, 3, 4))).toBe(
      '/profiles/mine.utl.2026-01-02-03-04.bak',
    )
  })

  it('uses the save-dialog name for a save to a path of another name', () => {
    // The user typed "b.utl" in the dialog; the C# FileName is "b.utl".
    expect(backupPath('/profiles/new.utl', 'b.utl', new Date(2026, 0, 2, 3, 4))).toBe(
      '/profiles/b.utl.2026-01-02-03-04.bak',
    )
  })

  it('keeps the folder of a Windows path', () => {
    expect(backupPath('C:\\VTank\\b.utl', 'c.utl', new Date(2026, 0, 2, 3, 4))).toBe(
      'C:\\VTank\\c.utl.2026-01-02-03-04.bak',
    )
  })
})

describe('openDesktopDat', () => {
  const bytes = Uint8Array.from({ length: 5000 }, (_, i) => i & 0xff)

  it('picks a .dat in the native dialog and reads byte ranges of that path', async () => {
    fakeTauri.open.mockResolvedValue('C:\\AC\\client_portal.dat')
    fakeTauri.openFile.mockResolvedValue(fakeFileHandle(bytes))
    const picked = await openDesktopDat()
    expect(fakeTauri.open).toHaveBeenCalledWith(expect.objectContaining({ filters: [{ name: "Asheron's Call game files", extensions: ['dat'] }] }))
    expect(fakeTauri.openFile).toHaveBeenCalledWith('C:\\AC\\client_portal.dat', { read: true })
    expect(picked?.name).toBe('client_portal.dat')
    expect(picked?.size).toBe(5000)
    // Two reads at once on the one handle, each longer than one fake read gives.
    const [a, b] = await Promise.all([picked!.read(100, 2500), picked!.read(4000, 50)])
    expect(a).toEqual(bytes.slice(100, 2600))
    expect(b).toEqual(bytes.slice(4000, 4050))
    // A read past the end gives the bytes that are there.
    expect(await picked!.read(4990, 100)).toEqual(bytes.slice(4990))
  })

  it('gives null when the dialog is closed, and rejects when the file cannot be opened', async () => {
    fakeTauri.open.mockResolvedValue(null)
    expect(await openDesktopDat()).toBeNull()
    expect(fakeTauri.openFile).not.toHaveBeenCalled()
    fakeTauri.open.mockResolvedValue('/ac/client_portal.dat')
    fakeTauri.openFile.mockRejectedValue(new Error('forbidden path'))
    await expect(openDesktopDat()).rejects.toThrow('forbidden path')
  })
})
