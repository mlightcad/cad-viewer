import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import { examplePeerPackageAliases } from '../vite-config/pluginRollupOutput'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: resolve(__dirname, 'runner'),
  base: './',
  resolve: {
    alias: examplePeerPackageAliases(__dirname)
  },
  build: {
    outDir: resolve(__dirname, 'dist-runner'),
    emptyOutDir: true,
    minify: true
  }
})
