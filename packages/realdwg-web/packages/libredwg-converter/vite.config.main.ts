import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, PluginOption } from 'vite'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'

export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = []

  if (mode === 'analyze') {
    plugins.push(visualizer())
  }
  plugins.push(peerDepsExternal() as PluginOption)

  return {
    build: {
      emptyOutDir: false,
      outDir: 'dist',
      lib: {
        entry: 'src/index.ts',
        name: 'libredwg-converter',
        fileName: 'libredwg-converter'
      }
    },
    plugins
  }
})
