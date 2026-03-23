import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, PluginOption } from 'vite'

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = []

  if (mode === 'analyze') {
    plugins.push(visualizer())
  }

  return {
    build: {
      emptyOutDir: false,
      outDir: 'dist',
      lib: {
        entry: 'src/AcDbLibreDwgParserWorker.ts',
        fileName: 'libredwg-parser-worker',
        formats: ['es']
      },
      rollupOptions: {
        // Bundle everything into this output (no shared chunks)
        external: [],
        output: {
          inlineDynamicImports: true
        }
      }
    },
    plugins
  }
})
