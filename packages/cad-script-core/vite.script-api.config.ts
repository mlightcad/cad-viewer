import { resolve } from 'path'
import { defineConfig } from 'vite'

/**
 * Node-safe build of the script API constants (no data-model import).
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
      name: 'CadScriptCoreScriptApi',
      formats: ['es', 'umd'],
      fileName: format =>
        format === 'es'
          ? 'cad-script-core-script-api.js'
          : 'cad-script-core-script-api.umd.cjs'
    },
    minify: true
  }
})
