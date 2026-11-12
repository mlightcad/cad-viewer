import { resolve } from 'path'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { createLibEntryFileName } from '../vite-config/pluginRollupOutput'
import {
  MTEXT_RENDERER_PACKAGE,
  MTEXT_RENDERER_WORKER_FILE
} from '../../tools/worker-assets.mjs'

const packageId = 'cad-simple-viewer'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'file-open-panel': resolve(__dirname, 'src/file-open-panel.ts')
      },
      name: packageId,
      fileName: (format, entryName) =>
        createLibEntryFileName(packageId, format, entryName)
    },
    minify: true,
    rollupOptions: {
      output: {
        // Keep the light landing entry out of the fat viewer chunk graph.
        chunkFileNames: `${packageId}-[name]-[hash].js`
      }
    }
  },
  plugins: [
    peerDepsExternal() as PluginOption,
    viteStaticCopy({
      targets: [
        {
          src: `./node_modules/${MTEXT_RENDERER_PACKAGE}/dist/${MTEXT_RENDERER_WORKER_FILE}`,
          dest: '',
          rename: { stripBase: true }
        }
      ]
    })
  ]
})
