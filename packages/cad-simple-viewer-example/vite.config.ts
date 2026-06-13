import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { exampleRollupOutput } from '../vite-config/pluginRollupOutput'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Relative to this package root; works with vite-plugin-static-copy on Windows. */
const VIEWER_RUNTIME_SRC = '../cad-html-plugin/dist/viewer-runtime.iife.js'

function assertViewerRuntimeExists(): void {
  const runtimePath = resolve(__dirname, VIEWER_RUNTIME_SRC)
  if (!existsSync(runtimePath)) {
    throw new Error(
      'viewer-runtime.iife.js was not found. Build @mlightcad/cad-html-plugin first ' +
        '(pnpm --filter @mlightcad/cad-html-plugin build, or nx run-many -t build).'
    )
  }
}

export default defineConfig(() => {
  assertViewerRuntimeExists()

  return {
    base: './',
    build: {
      modulePreload: false,
      minify: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        },
        output: exampleRollupOutput
      }
    },
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: './node_modules/@mlightcad/cad-simple-viewer/dist/*-worker.js',
            dest: 'workers'
          },
          {
            src: VIEWER_RUNTIME_SRC,
            dest: ''
          }
        ]
      })
    ]
  }
})
