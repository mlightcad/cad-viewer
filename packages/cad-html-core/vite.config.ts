import { resolve } from 'path'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'

const packageName = '@mlightcad/cad-html-core'
const pluginId = 'cad-html-core'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: pluginId,
      formats: ['es', 'umd'],
      fileName: format =>
        format === 'es' ? `${pluginId}.js` : `${pluginId}.umd.cjs`
    },
    minify: true,
    rollupOptions: {
      external: [packageName]
    }
  },
  plugins: [peerDepsExternal() as PluginOption]
})
