import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'
import { createLibEntryFileName } from '../vite-config/pluginRollupOutput'

const packageId = 'cad-diff-viewer'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/index.ts',
      name: packageId,
      fileName: format => createLibEntryFileName(packageId, format)
    },
    minify: true,
    rollupOptions: {
      output: {
        chunkFileNames: `${packageId}-[name]-[hash].js`
      }
    }
  },
  plugins: [peerDepsExternal() as PluginOption]
})
