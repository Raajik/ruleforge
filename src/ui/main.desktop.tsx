/**
 * The desktop entry (PLAN.md T32). The Tauri build uses this file instead of
 * main.tsx (vite.config.ts). The only difference is the `desktop` prop, which
 * sends File > Open and Save to the native dialogs of src/ui/desktopio.ts.
 */
import { createRoot } from 'react-dom/client'
import { newFile } from '../core/ops/file'
import { App } from './App'

createRoot(document.getElementById('root')!).render(<App initialProfile={newFile().profile} desktop />)
