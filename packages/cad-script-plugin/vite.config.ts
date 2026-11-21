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
      // The register entry loads styles at runtime via this package's own
      // `style.css` export. Bundling that specifier would inline the previous
      // dist file and its rules would override the CSS just emitted.
      external: (id: string) =>
        id === packageName ||
        id.replaceAll('\\', '/').endsWith('/cad-script-plugin/style.css') ||
        id.replaceAll('\\', '/').endsWith('/cad-script-plugin/dist/style.css'),
      output: {
        ...createLibRollupOutput(packageId),
        // Keep `style.css` so `@mlightcad/cad-script-plugin/style.css` resolves.
        assetFileNames: 'style[extname]'
      }
    }
  },
  plugins: [peerDepsExternal() as PluginOption]
})
