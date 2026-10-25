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

function isEnvFlagEnabled(name: string): boolean {
  const flag = process.env[name]
  return flag === '1' || flag?.toLowerCase() === 'true'
}

/** Opt-in only — matches cad-viewer-example. Auto-linking a stale sibling dist breaks builds. */
const useLocalMtextRenderer = isEnvFlagEnabled(
  'CAD_VIEWER_USE_LOCAL_MTEXT_RENDERER'
)

export default defineConfig({
  root: resolve(__dirname, 'runner'),
  base: './',
  resolve: {
    alias: [
      ...(useLocalMtextRenderer && existsSync(LOCAL_MTEXT_RENDERER)
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
