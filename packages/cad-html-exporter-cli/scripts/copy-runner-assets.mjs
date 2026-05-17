import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const cliPackageRoot = fileURLToPath(new URL('..', import.meta.url))
const outDir = join(cliPackageRoot, 'dist-runner')
const workersDir = join(outDir, 'workers')

function pkgRoot(name) {
  const entry = require.resolve(name)
  let dir = dirname(entry)
  while (true) {
    const pkgPath = join(dir, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(
        require('node:fs').readFileSync(pkgPath, 'utf8')
      )
      if (pkg.name === name) {
        return dir
      }
    }
    const parent = dirname(dir)
    if (parent === dir) {
      throw new Error(`Package root not found: ${name}`)
    }
    dir = parent
  }
}

function copy(from, to) {
  if (!existsSync(from)) {
    throw new Error(`Missing asset: ${from}`)
  }
  copyFileSync(from, to)
}

mkdirSync(workersDir, { recursive: true })

copy(
  join(pkgRoot('@mlightcad/data-model'), 'dist', 'dxf-parser-worker.js'),
  join(workersDir, 'dxf-parser-worker.js')
)
copy(
  join(
    pkgRoot('@mlightcad/libredwg-converter'),
    'dist',
    'libredwg-parser-worker.js'
  ),
  join(workersDir, 'libredwg-parser-worker.js')
)
copy(
  join(pkgRoot('@mlightcad/mtext-renderer'), 'dist', 'mtext-renderer-worker.js'),
  join(workersDir, 'mtext-renderer-worker.js')
)
copy(
  join(cliPackageRoot, '..', 'cad-html-exporter', 'dist', 'viewer-runtime.iife.js'),
  join(outDir, 'viewer-runtime.iife.js')
)

console.log('Copied runner workers and viewer runtime into dist-runner/')
