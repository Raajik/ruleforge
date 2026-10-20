import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// The Tauri build sets TAURI_ENV_PLATFORM, and then uses the desktop entry
// (src/ui/main.desktop.tsx) in place of index.html (PLAN.md T32).
export default defineConfig({
  // A relative base works on GitHub Pages (/ruleforge/) and in the Tauri build.
  base: './',
  plugins: [react()],
  test: { include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
  build: {
    rollupOptions: {
      input: process.env.TAURI_ENV_PLATFORM ? 'src/ui/main.desktop.tsx' : 'index.html',
    },
  },
})
