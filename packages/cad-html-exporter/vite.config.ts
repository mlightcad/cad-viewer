import { resolve } from 'path'
import { defineConfig } from 'vite'

const packageId = 'cad-html-exporter'

const nodeBuiltins = [
  /^node:/,
  'fs',
  'fs/promises',
  'path',
  'url',
  'zlib',
  'crypto',
  'worker_threads',
  'os',
  'module',
  'buffer',
  'stream',
  'util',
  'events',
  'assert',
  'tty',
  'http',
  'https',
  'net',
  'child_process',
  'perf_hooks',
  // Keep as runtime deps so WASM / Worker resolve via package import.meta.url.
  'web-worker',
  '@mlightcad/libredwg-web'
]

/**
 * Node library build. Bundles data-model / libredwg / three-renderer so the
 * published package does not hit data-model's broken native ESM directory
 * imports under plain Node.
 *
 * `ssr.noExternal: true` forces Vite to inline workspace/npm deps that SSR
 * would otherwise leave as bare imports (e.g. `three/examples/...`).
 */
export default defineConfig({
  ssr: {
    noExternal: true,
    external: nodeBuiltins
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node20',
    ssr: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: packageId,
      formats: ['es', 'cjs'],
      fileName: format => (format === 'es' ? 'index.js' : 'index.cjs')
    },
    minify: false,
    rollupOptions: {
      external: nodeBuiltins
    }
  }
})
