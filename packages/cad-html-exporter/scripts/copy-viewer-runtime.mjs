import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(
  here,
  '../../cad-html-plugin/dist/viewer-runtime.iife.js'
)
const destDir = resolve(here, '../runtime')
const dest = resolve(destDir, 'viewer-runtime.iife.js')

if (!existsSync(src)) {
  console.error(
    `[cad-html-exporter] Missing ${src}. Build @mlightcad/cad-html-plugin first.`
  )
  process.exit(1)
}

mkdirSync(destDir, { recursive: true })
copyFileSync(src, dest)
console.log(`[cad-html-exporter] Copied viewer-runtime.iife.js → runtime/`)
