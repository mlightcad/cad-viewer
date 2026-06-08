import { resolve } from 'path'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'
import {
  createPluginEntryFileName,
  createPluginLibRollupOutput
} from '../vite-config/pluginRollupOutput'

const packageName = '@mlightcad/cad-html-plugin'
const pluginId = 'cad-html-plugin'

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
        createPluginEntryFileName(pluginId, format, entryName)
    },
    minify: true,
    rollupOptions: {
      external: [packageName],
      output: createPluginLibRollupOutput(pluginId)
    }
  },
  plugins: [peerDepsExternal() as PluginOption]
})
