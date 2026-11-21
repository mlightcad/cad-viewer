import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'

import {
  createLibEntryFileName,
  createLibRollupOutput
} from '../vite-config/pluginRollupOutput'

const packageName = '@mlightcad/cad-agent-plugin'
const packageId = 'cad-agent-plugin'

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
        id.replaceAll('\\', '/').endsWith('/cad-agent-plugin/style.css') ||
        id.replaceAll('\\', '/').endsWith('/cad-agent-plugin/dist/style.css'),
      output: {
        ...createLibRollupOutput(packageId),
        // Keep `style.css` so `@mlightcad/cad-agent-plugin/style.css` resolves
        // (Vite 6 lib mode defaults to `{name}.css` instead of `style.css`).
        assetFileNames: 'style[extname]'
      }
    }
  },
  plugins: [vue(), peerDepsExternal() as PluginOption]
})
