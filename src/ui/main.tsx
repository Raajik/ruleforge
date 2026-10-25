import { createRoot } from 'react-dom/client'
import { newFile } from '../core/ops/file'
import { App } from './App'
import { DEFAULT_COLOR_SLOTS } from './colorSlots'

// The editor starts with an empty profile. File > Open loads a .utl (T31).
// The desktop build swaps this file for main.desktop.tsx (PLAN.md T32).
createRoot(document.getElementById('root')!).render(<App initialProfile={newFile().profile} colorSlots={DEFAULT_COLOR_SLOTS} />)
