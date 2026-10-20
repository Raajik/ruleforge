// @vitest-environment jsdom
// T31: browser file access. The File System Access API when the browser has
// it (Chromium), a hidden file input and a download else (PLAN.md T31).

import { fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  downloadText,
  hasFileSystemAccess,
  newProfileFile,
  pickProfileFile,
  writeProfileHandle,
} from './fileio'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

/** The two pickers exist, as in Chromium. */
function stubPickers(
  open: ReturnType<typeof vi.fn>,
  save: ReturnType<typeof vi.fn>,
): void {
  vi.stubGlobal('showOpenFilePicker', open)
  vi.stubGlobal('showSaveFilePicker', save)
}

function cancelledPicker(): ReturnType<typeof vi.fn> {
  return vi.fn(async () => {
    throw new DOMException('aborted', 'AbortError')
  })
}

describe('hasFileSystemAccess', () => {
  it('is false without the pickers and true with them', () => {
    expect(hasFileSystemAccess()).toBe(false)
    stubPickers(vi.fn(), vi.fn())
    expect(hasFileSystemAccess()).toBe(true)
  })
})

describe('pickProfileFile without the File System Access API', () => {
  it('reads the picked file through a hidden input', async () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    const promise = pickProfileFile()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.getAttribute('aria-label')).toBe('Open profile file')
    fireEvent.change(input, { target: { files: [new File(['UTL\n1\n0'], 'p.utl')] } })
    expect(await promise).toEqual({ name: 'p.utl', text: 'UTL\n1\n0', handle: null })
    expect(document.contains(input)).toBe(false)
  })

  it('gives null and removes the input when the picker is cancelled', async () => {
    const click = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {})
    const promise = pickProfileFile()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent(input, new Event('cancel'))
    expect(await promise).toBeNull()
    expect(document.contains(input)).toBe(false)
  })
})

describe('pickProfileFile with the File System Access API', () => {
  it('reads the file of the picked handle', async () => {
    const handle = {
      name: 'x.utl',
      getFile: async () => new File(['2\n'], 'x.utl'),
    } as unknown as FileSystemFileHandle
    const showOpenFilePicker = vi.fn(async () => [handle])
    stubPickers(showOpenFilePicker, vi.fn())
    const picked = await pickProfileFile()
    expect(showOpenFilePicker).toHaveBeenCalledTimes(1)
    expect(picked).toEqual({ name: 'x.utl', text: '2\n', handle })
  })

  it('gives null when the user closes the picker', async () => {
    stubPickers(cancelledPicker(), vi.fn())
    expect(await pickProfileFile()).toBeNull()
  })

  it('gives null when the picked file cannot be read', async () => {
    const handle = {
      name: 'gone.utl',
      getFile: async () => {
        throw new DOMException('gone', 'NotFoundError')
      },
    } as unknown as FileSystemFileHandle
    stubPickers(vi.fn(async () => [handle]), vi.fn())
    expect(await pickProfileFile()).toBeNull()
  })
})

describe('newProfileFile', () => {
  it('gives the picked handle with the suggested name', async () => {
    const handle = { name: 'a.utl' } as FileSystemFileHandle
    const showSaveFilePicker = vi.fn(async () => handle)
    stubPickers(vi.fn(), showSaveFilePicker)
    expect(await newProfileFile('New File.utl')).toBe(handle)
    expect(showSaveFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: 'New File.utl' }),
    )
  })

  it('gives null when the user closes the picker', async () => {
    stubPickers(vi.fn(), cancelledPicker())
    expect(await newProfileFile('New File.utl')).toBeNull()
  })
})

describe('writeProfileHandle', () => {
  it('writes the text and closes the stream', async () => {
    const write = vi.fn(async () => {})
    const close = vi.fn(async () => {})
    const handle = {
      createWritable: async () => ({ write, close }),
    } as unknown as FileSystemFileHandle
    await writeProfileHandle(handle, 'UTL\n')
    expect(write).toHaveBeenCalledWith('UTL\n')
    expect(close).toHaveBeenCalledTimes(1)
  })
})

describe('downloadText', () => {
  it('downloads the text with the given name', () => {
    const createObjectURL = vi.fn(() => 'blob:x')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
    const downloads: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download)
    })
    downloadText('p.utl', 'UTL\n')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(downloads).toEqual(['p.utl'])
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x')
  })
})
