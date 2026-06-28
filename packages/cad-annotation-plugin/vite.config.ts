import { resolve } from 'path'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'
import {
  createLibEntryFileName,
  createLibRollupOutput
} from '../vite-config/pluginRollupOutput'

const packageName = '@mlightcad/cad-annotation-plugin'
const pluginId = 'cad-annotation-plugin'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        register: resolve(__dirname, 'src/register.ts')
      },
      name: pluginId,
      fileName: (format, entryName) =>
        createLibEntryFileName(pluginId, format, entryName)
    },
    minify: true,
    rollupOptions: {
      external: [packageName],
      output: createLibRollupOutput(pluginId)
    }
  },
  plugins: [peerDepsExternal() as PluginOption]
})