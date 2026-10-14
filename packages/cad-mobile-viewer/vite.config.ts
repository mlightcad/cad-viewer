// SPDX-License-Identifier: GPL-3.0-or-later
//
// Bundle offline do viewer móvel (arquitectura §6.3; card M4-I6). Saída em
// `dist/` com caminhos relativos (`./assets/…`): o `LocalAssetServer` serve-a
// em `/s/<token>/`. Os pacotes do monorepo entram pela fonte (não há `dist/`
// construído deles); o worker/wasm LibreDWG são copiados para `assets/`.

import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, type Plugin } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const packages = resolve(here, '..')
const require = createRequire(resolve(here, 'package.json'))
// `three` e afins só existem nas dependências do `cad-simple-viewer` (pnpm)
const viewerRequire = createRequire(
  resolve(packages, 'cad-simple-viewer/package.json')
)
const threeDir = resolve(dirname(viewerRequire.resolve('three')), '..')

function copyLibreDwgAssets(): Plugin {
  return {
    name: 'copy-libredwg-assets',
    apply: 'build',
    writeBundle() {
      const dist = dirname(require.resolve('@mlightcad/libredwg-converter'))
      const out = resolve(here, 'dist/assets')
      mkdirSync(out, { recursive: true })
      for (const file of ['libredwg-parser-worker.js', 'libredwg-web.wasm']) {
        copyFileSync(resolve(dist, file), resolve(out, file))
      }
    }
  }
}

export default defineConfig({
  root: resolve(here, 'web'),
  base: './',
  resolve: {
    alias: [
      {
        find: '@mlightcad/cad-simple-viewer/find',
        replacement: resolve(packages, 'cad-simple-viewer/src/find/index.ts')
      },
      {
        find: /^@mlightcad\/cad-simple-viewer$/,
        replacement: resolve(packages, 'cad-simple-viewer/src/index.ts')
      },
      {
        find: /^@mlightcad\/three-renderer$/,
        replacement: resolve(packages, 'three-renderer/src/index.ts')
      },
      {
        find: /^three$/,
        replacement: resolve(threeDir, 'build/three.module.js')
      },
      { find: /^three\/(.*)$/, replacement: `${threeDir}/$1` }
    ]
  },
  build: {
    outDir: resolve(here, 'dist'),
    emptyOutDir: true,
    assetsDir: 'assets',
    modulePreload: false,
    sourcemap: false,
    chunkSizeWarningLimit: 8192
  },
  plugins: [copyLibreDwgAssets()]
})
