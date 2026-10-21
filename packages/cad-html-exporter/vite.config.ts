import { createRequire } from 'module'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const packageId = 'cad-html-exporter'
const packageRoot = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

/** Force one physical @mlightcad/data-model when linking a local converter. */
function resolvePackageRoot(name: string): string {
  let dir = dirname(require.resolve(name, { paths: [packageRoot] }))
  for (let i = 0; i < 6; i++) {
    try {
      require.resolve('./package.json', { paths: [dir] })
      const pkg = require(resolve(dir, 'package.json')) as { name?: string }
      if (pkg.name === name) return dir
    } catch {
      // keep walking
    }
    dir = dirname(dir)
  }
  throw new Error(`Could not resolve package root for ${name}`)
}
const dataModelRoot = resolvePackageRoot('@mlightcad/data-model')

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
  '@mlightcad/libredwg-web',
  // Optional peer: dynamic import + sibling dwg-parser-main.js via import.meta.url.
  '@mlightcad/dwg-converter'
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
  resolve: {
    alias: {
      '@mlightcad/data-model': dataModelRoot
    },
    dedupe: ['@mlightcad/data-model']
  },
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
      entry: resolve(packageRoot, 'src/index.ts'),
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
