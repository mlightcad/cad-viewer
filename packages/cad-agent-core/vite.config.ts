import { resolve } from 'path'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'

const packageName = '@mlightcad/cad-agent-core'
const packageId = 'cad-agent-core'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: packageId,
      formats: ['es', 'umd'],
      fileName: format =>
        format === 'es' ? `${packageId}.js` : `${packageId}.umd.cjs`
    },
    minify: true,
    rollupOptions: {
      external: [packageName]
    }
  },
  plugins: [peerDepsExternal() as PluginOption]
})
