/**
 * Browser file access (PLAN.md T31).
 *
 * The File System Access API (`showOpenFilePicker`, `showSaveFilePicker`)
 * exists in Chromium only. Where it is missing, open reads a hidden file
 * input. Save downloads the text, the same download that Combine > Export
 * Ranges uses (App.tsx). The C# writes and reads real files
 * (ref/editor/Form1.cs 360-464).
 */

/** The file types of the C# open and save dialogs (Form1.cs 324-325, 450-451). */
const UTL_TYPES = [{ description: 'uTank settings files', accept: { 'application/octet-stream': ['.utl'] } }]

/** A picked profile file: the name, the text and the handle to save back to. */
export interface PickedProfileFile {
  name: string
  text: string
  /** `null` when the browser has no File System Access API. */
  handle: FileSystemFileHandle | null
}

/** The TypeScript DOM lib misses the two pickers, so this file declares them. */
interface PickerWindow {
  showOpenFilePicker?: (options?: {
    multiple?: boolean
    types?: typeof UTL_TYPES
  }) => Promise<FileSystemFileHandle[]>
  showSaveFilePicker?: (options?: {
    suggestedName?: string
    types?: typeof UTL_TYPES
  }) => Promise<FileSystemFileHandle>
}

function pickers(): PickerWindow {
  return globalThis as unknown as PickerWindow
}

export function hasFileSystemAccess(): boolean {
  return 'showOpenFilePicker' in globalThis && 'showSaveFilePicker' in globalThis
}

/**
 * Ask the user for a `.utl` file and read it. A closed picker gives `null`,
 * as an empty file name does in `LoadFile` (Form1.cs 362-363).
 */
export async function pickProfileFile(): Promise<PickedProfileFile | null> {
  if (hasFileSystemAccess()) {
    let handles: FileSystemFileHandle[]
    try {
      handles = await pickers().showOpenFilePicker!({ multiple: false, types: UTL_TYPES })
    } catch {
      return null
    }
    const handle = handles[0]
    if (!handle) return null
    // A file that cannot be read gives null, as a closed picker does.
    try {
      const file = await handle.getFile()
      return { name: file.name, text: await file.text(), handle }
    } catch {
      return null
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.utl'
    input.setAttribute('aria-label', 'Open profile file')
    input.style.display = 'none'
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      input.remove()
      if (!file) {
        resolve(null)
        return
      }
      void file.text().then(
        (text) => resolve({ name: file.name, text, handle: null }),
        // A file that cannot be read gives null, as a closed picker does.
        () => resolve(null),
      )
    })
    // The `cancel` event fires when the user closes the picker (Chrome 113+).
    input.addEventListener('cancel', () => {
      input.remove()
      resolve(null)
    })
    // shortcut: an old browser with neither event leaves this promise pending
    // when the user closes the picker; reload the page to recover.
    document.body.appendChild(input)
    input.click()
  })
}

/** Ask for a new file to save to. A closed picker gives `null`. */
export async function newProfileFile(suggestedName: string): Promise<FileSystemFileHandle | null> {
  try {
    return await pickers().showSaveFilePicker!({ suggestedName, types: UTL_TYPES })
  } catch {
    return null
  }
}

/** Write the profile text through the File System Access API. */
export async function writeProfileHandle(handle: FileSystemFileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
}

/**
 * Without the File System Access API the browser downloads the text. In the
 * DOM, so every browser starts the download (the C# writes a file).
 */
export function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text]))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
