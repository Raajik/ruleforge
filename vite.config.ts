import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // A relative base works on GitHub Pages (/ruleforge/) and in the Tauri build.
  base: './',
  plugins: [react()],
  test: { include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
})
