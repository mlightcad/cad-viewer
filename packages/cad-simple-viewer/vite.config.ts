import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import { defineConfig, PluginOption } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { createLibEntryFileName } from '../vite-config/pluginRollupOutput'
import {
  LIBREDWG_CONVERTER_PACKAGE,
  LIBREDWG_PARSER_WORKER_FILE,
  MTEXT_RENDERER_PACKAGE,
  MTEXT_RENDERER_WORKER_FILE
} from '../../tools/worker-assets.mjs'

const packageId = 'cad-simple-viewer'

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
  plugins: [
    peerDepsExternal() as PluginOption,
    viteStaticCopy({
      targets: [
        {
          src: `./node_modules/${LIBREDWG_CONVERTER_PACKAGE}/dist/${LIBREDWG_PARSER_WORKER_FILE}`,
          dest: '',
          rename: { stripBase: true }
        },
        {
          src: `./node_modules/${MTEXT_RENDERER_PACKAGE}/dist/${MTEXT_RENDERER_WORKER_FILE}`,
          dest: '',
          rename: { stripBase: true }
        }
      ]
    })
  ]
})
