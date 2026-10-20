import { createRoot } from 'react-dom/client'
import { newFile } from '../core/ops/file'
import { App } from './App'

// The editor starts with an empty profile. File > Open loads a .utl (T31).
createRoot(document.getElementById('root')!).render(<App initialProfile={newFile().profile} />)
