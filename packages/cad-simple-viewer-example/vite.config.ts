import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { exampleRollupOutput } from '../vite-config/pluginRollupOutput'
import {
  LIBREDWG_CONVERTER_PACKAGE,
  LIBREDWG_PARSER_WASM_FILE,
  LIBREDWG_PARSER_WORKER_FILE,
  MTEXT_RENDERER_WORKER_FILE
} from '../../tools/worker-assets.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Relative to this package root; works with vite-plugin-static-copy on Windows. */
const VIEWER_RUNTIME_SRC = '../cad-html-plugin/dist/viewer-runtime.iife.js'

export default defineConfig(() => {
  const runtimePath = resolve(__dirname, VIEWER_RUNTIME_SRC)
  const hasViewerRuntime = existsSync(runtimePath)
  if (!hasViewerRuntime) {
    console.warn(
      '[cad-simple-viewer-example] viewer-runtime.iife.js not found — HTML export (chtml) will be unavailable. ' +
        'Build @mlightcad/cad-html-plugin to enable it. Opening DXF/DWG does not require this file.'
    )
  }

  const realdwgRoot = resolve(__dirname, '../../../realdwg-web')
  const libredwgDist = `./node_modules/${LIBREDWG_CONVERTER_PACKAGE}/dist`
  const libredwgWasmSrc = resolve(
    __dirname,
    'node_modules',
    LIBREDWG_CONVERTER_PACKAGE,
    'dist',
    LIBREDWG_PARSER_WASM_FILE
  )

  return {
    base: './',
    server: {
      // Local pnpm overrides point at sibling realdwg-web packages.
      fs: {
        allow: [resolve(__dirname, '../..'), realdwgRoot]
      },
      watch: {
        // Avoid HMR reloads when realdwg-web rebuilds mid OPENPROF run.
        ignored: ['**/realdwg-web/**']
      }
    },
    build: {
      modulePreload: false,
      minify: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          htmlConverter: resolve(__dirname, 'html-converter.html')
        },
        output: exampleRollupOutput
      }
    },
    plugins: [
      vue(),
      viteStaticCopy({
        targets: [
          {
            src: `./node_modules/@mlightcad/cad-simple-viewer/dist/${MTEXT_RENDERER_WORKER_FILE}`,
            dest: 'workers',
            rename: { stripBase: true }
          },
          {
            src: `${libredwgDist}/${LIBREDWG_PARSER_WORKER_FILE}`,
            dest: 'workers',
            rename: { stripBase: true }
          },
          ...(existsSync(libredwgWasmSrc)
            ? [
                {
                  src: `${libredwgDist}/${LIBREDWG_PARSER_WASM_FILE}`,
                  dest: 'workers',
                  rename: { stripBase: true }
                }
              ]
            : []),
          ...(hasViewerRuntime
            ? [
                {
                  src: VIEWER_RUNTIME_SRC,
                  dest: '',
                  rename: { stripBase: true }
                }
              ]
            : [])
        ]
      })
    ]
  }
})
