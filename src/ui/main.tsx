import { createRoot } from 'react-dom/client'
import { newFile } from '../core/ops/file'
import { App } from './App'

// T31 adds open and save; for now the editor starts with an empty profile.
createRoot(document.getElementById('root')!).render(<App profile={newFile().profile} />)
