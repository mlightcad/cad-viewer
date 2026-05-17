import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Relative to this package root; works with vite-plugin-static-copy on Windows. */
const VIEWER_RUNTIME_SRC = '../cad-html-exporter/dist/viewer-runtime.iife.js'

function assertViewerRuntimeExists(): void {
  const runtimePath = resolve(__dirname, VIEWER_RUNTIME_SRC)
  if (!existsSync(runtimePath)) {
    throw new Error(
      'viewer-runtime.iife.js was not found. Build @mlightcad/cad-html-exporter first ' +
        '(pnpm --filter @mlightcad/cad-html-exporter build, or nx run-many -t build).'
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
        }
      }
    },
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: './node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js',
            dest: 'workers'
          },
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
