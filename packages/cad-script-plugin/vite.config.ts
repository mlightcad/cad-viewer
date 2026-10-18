import { resolve } from 'path'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'

import {
  createLibEntryFileName,
  createLibRollupOutput
} from '../vite-config/pluginRollupOutput'

const packageName = '@mlightcad/cad-script-plugin'
const packageId = 'cad-script-plugin'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        register: resolve(__dirname, 'src/register.ts')
      },
      name: packageId,
      fileName: (format, entryName) =>
        createLibEntryFileName(packageId, format, entryName)
    },
    minify: true,
    rollupOptions: {
      external: [packageName],
      output: {
        ...createLibRollupOutput(packageId),
        // Keep `style.css` so `@mlightcad/cad-script-plugin/style.css` resolves.
        assetFileNames: 'style[extname]'
      }
    }
  },
  plugins: [peerDepsExternal() as PluginOption]
})
