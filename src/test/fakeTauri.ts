/**
 * One fake for the Tauri modules that Ruleforge uses. Every test that mocks
 * Tauri imports this file, so a changed call name, sync or async shape or
 * return type fails `npm run typecheck` here and in no place else.
 *
 * The call names and shapes come from the installed packages:
 * `@tauri-apps/api/core`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`.
 */

import { vi } from 'vitest'
import type * as CoreModule from '@tauri-apps/api/core'
import type * as DialogModule from '@tauri-apps/plugin-dialog'
import type * as FsModule from '@tauri-apps/plugin-fs'

type CoreApi = typeof CoreModule
type DialogApi = typeof DialogModule
type FsApi = typeof FsModule

/**
 * The fake calls. The compiler types each one as the real function: `isTauri`
 * returns a boolean, the dialog and fs calls return promises.
 */
export const fakeTauri = {
  isTauri: vi.fn<CoreApi['isTauri']>(() => true),
  open: vi.fn<DialogApi['open']>(),
  save: vi.fn<DialogApi['save']>(),
  readTextFile: vi.fn<FsApi['readTextFile']>(),
  writeTextFile: vi.fn<FsApi['writeTextFile']>(),
  /** The fs plugin's `open`; the dialog plugin's is `open` above. */
  openFile: vi.fn<FsApi['open']>(),
}

/**
 * Clear the calls and the answers, and put `isTauri` back to true. Call it in
 * `beforeEach`, then set the answers the test needs.
 */
export function resetFakeTauri(): void {
  fakeTauri.isTauri.mockReset().mockReturnValue(true)
  fakeTauri.open.mockReset()
  fakeTauri.save.mockReset()
  fakeTauri.readTextFile.mockReset()
  fakeTauri.writeTextFile.mockReset()
  fakeTauri.openFile.mockReset()
}

type Handle = Awaited<ReturnType<FsApi['open']>>

/**
 * A file handle over bytes in memory, for `openFile`. It has the calls the
 * app uses, typed as the real ones; `read` gives at most 1000 bytes at a time,
 * as a real read may give fewer bytes than asked.
 */
export function fakeFileHandle(bytes: Uint8Array): Handle {
  let at = 0
  const handle = {
    seek: async (offset: number) => (at = offset),
    read: async (buffer: Uint8Array) => {
      if (at >= bytes.length) return null
      const n = Math.min(buffer.length, 1000, bytes.length - at)
      buffer.set(bytes.subarray(at, at + n))
      at += n
      return n
    },
    stat: async () => ({ size: bytes.length }),
  } satisfies { [K in 'seek' | 'read']: Handle[K] } & { stat: () => Promise<Pick<Awaited<ReturnType<Handle['stat']>>, 'size'>> }
  return handle as unknown as Handle
}

/** The `@tauri-apps/api/core` module object, for a `vi.mock` factory. */
export const coreMock: Pick<CoreApi, 'isTauri'> = { isTauri: fakeTauri.isTauri }

/** The `@tauri-apps/plugin-dialog` module object, for a `vi.mock` factory. */
export const dialogMock: Pick<DialogApi, 'open' | 'save'> = {
  open: fakeTauri.open,
  save: fakeTauri.save,
}

/** The `@tauri-apps/plugin-fs` module object, for a `vi.mock` factory. */
export const fsMock: Pick<FsApi, 'readTextFile' | 'writeTextFile' | 'open'> = {
  readTextFile: fakeTauri.readTextFile,
  writeTextFile: fakeTauri.writeTextFile,
  open: fakeTauri.openFile,
}
