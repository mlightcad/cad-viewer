import { resolve } from 'path'
import { defineConfig } from 'vite'

/**
 * Node-safe ES build of script API constants (no viewer peers).
 * Separate from the main lib build because Vite forbids multi-entry + umd.
 *
 * Always run after the main `vite build` (which empties `dist/`).
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/script-api.ts'),
      name: 'CadAgentCoreScriptApi',
      formats: ['es', 'umd'],
      fileName: format =>
        format === 'es'
          ? 'cad-agent-core-script-api.js'
          : 'cad-agent-core-script-api.umd.cjs'
    },
    minify: true
  }
})
