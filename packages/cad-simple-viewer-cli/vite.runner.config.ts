import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import { examplePeerPackageAliases } from '../vite-config/pluginRollupOutput'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOCAL_MTEXT_RENDERER = resolve(
  __dirname,
  '../../../mtext-renderer/packages/mtext-renderer/dist/index.js'
)

export default defineConfig({
  root: resolve(__dirname, 'runner'),
  base: './',
  resolve: {
    alias: [
      ...(existsSync(LOCAL_MTEXT_RENDERER)
        ? [
            {
              find: '@mlightcad/mtext-renderer',
              replacement: LOCAL_MTEXT_RENDERER
            }
          ]
        : []),
      ...examplePeerPackageAliases(__dirname)
    ]
  },
  build: {
    outDir: resolve(__dirname, 'dist-runner'),
    emptyOutDir: true,
    minify: true
  }
})
