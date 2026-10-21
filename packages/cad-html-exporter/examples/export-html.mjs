#!/usr/bin/env node
/**
 * Export a DXF/DWG to offline HTML.
 *
 * Run from this package after `pnpm build`:
 *
 *   node examples/export-html.mjs drawing.dwg drawing.html
 *   node examples/export-html.mjs drawing.dwg drawing.zip --format multi
 *   node examples/export-html.mjs drawing.dwg ./out --format multi --no-zip --fonts-dir D:/cad-data
 *
 * In a published install, import `@mlightcad/cad-html-exporter` instead of
 * `../dist/index.js`.
 */
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { exportFileToHtml } from '../dist/index.js'

const here = path.dirname(fileURLToPath(import.meta.url))

function usage() {
  return `Usage: node ${path.relative(process.cwd(), path.join(here, 'export-html.mjs'))} <input.dwg|dxf> <output> [options]

  <output>   .html for --format single, .zip for multi, or a folder with --no-zip

Options:
  --format single|multi     Default: single
  --zip                     Multi-file: write one .zip (default)
  --no-zip                  Multi-file: write package files into <output>
  --fonts-dir <path>        Local font library (folder, fonts.json, or cad-data root)
  --fonts-url <url>         Remote font library base URL (ignored when --fonts-dir is set)
  --viewer-mode view|measure   Default: measure (view omits snap and measure)
  --max-chunk-mib <n>       Multi-file chunk budget, 1–64 (default 2)
  --no-compress-chunks      Write raw chunk bytes instead of .acex.gz
  --dwg-parser libredwg|dwg Default: libredwg (dwg needs optional @mlightcad/dwg-converter)
  --dwg-license-key <key>   License for --dwg-parser dwg (omit to use trial if active)
`
}

function parseArgs(argv) {
  const positional = []
  const options = {
    format: 'single',
    zipPackage: true,
    viewerMode: 'measure',
    compressChunks: true
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--format') {
      options.format = argv[++i]
    } else if (arg === '--no-zip') {
      options.zipPackage = false
    } else if (arg === '--zip') {
      options.zipPackage = true
    } else if (arg === '--fonts-dir') {
      options.fontsDir = argv[++i]
    } else if (arg === '--fonts-url') {
      options.fontsUrl = argv[++i]
    } else if (arg === '--viewer-mode') {
      options.viewerMode = argv[++i]
    } else if (arg === '--max-chunk-mib') {
      options.maxChunkBytes = Number(argv[++i]) * 1024 * 1024
    } else if (arg === '--no-compress-chunks') {
      options.compressChunks = false
    } else if (arg === '--dwg-parser') {
      options.dwgParser = argv[++i]
    } else if (arg === '--dwg-license-key') {
      options.dwgLicenseKey = argv[++i]
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    } else {
      positional.push(arg)
    }
  }
  return { positional, options }
}

async function directoryStats(dir) {
  let bytes = 0
  let files = 0
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await directoryStats(full)
      bytes += nested.bytes
      files += nested.files
    } else {
      bytes += (await stat(full)).size
      files += 1
    }
  }
  return { bytes, files }
}

const { positional, options } = parseArgs(process.argv.slice(2))
if (options.help || positional.length !== 2) {
  console.log(usage())
  process.exit(options.help ? 0 : 1)
}
if (options.format !== 'single' && options.format !== 'multi') {
  throw new Error(`--format must be single or multi, got ${options.format}`)
}
if (options.format === 'single' && options.zipPackage === false) {
  throw new Error('--no-zip applies only to --format multi')
}
if (
  options.dwgParser != null &&
  options.dwgParser !== 'libredwg' &&
  options.dwgParser !== 'dwg'
) {
  throw new Error(
    `--dwg-parser must be libredwg or dwg, got ${options.dwgParser}`
  )
}

const [input, output] = positional
console.log('[export] start', new Date().toISOString())
console.log('[export] input', input)
console.log('[export] output', output)

const started = performance.now()
const result = await exportFileToHtml(input, output, {
  exportFormat: options.format,
  zipPackage: options.zipPackage,
  viewerMode: options.viewerMode,
  fontsDir: options.fontsDir,
  fontsUrl: options.fontsUrl,
  maxChunkBytes: options.maxChunkBytes,
  compressChunks: options.compressChunks,
  dwgParser: options.dwgParser,
  dwgLicenseKey: options.dwgLicenseKey
})
const elapsedMs = performance.now() - started

const summary = {
  kind: result.kind,
  fileName: result.fileName,
  elapsedMs: Math.round(elapsedMs),
  elapsedSec: +(elapsedMs / 1000).toFixed(1)
}
if (result.kind === 'directory') {
  const stats = await directoryStats(output)
  summary.fileCount = stats.files
  summary.fileSizeBytes = stats.bytes
  summary.fileSizeMiB = +(stats.bytes / 1024 / 1024).toFixed(2)
} else {
  const size = (await stat(output)).size
  summary.fileSizeBytes = size
  summary.fileSizeMiB = +(size / 1024 / 1024).toFixed(2)
  if (result.kind === 'html') summary.htmlChars = result.html?.length ?? 0
  if (result.kind === 'zip') summary.zipBytes = result.zipBytes?.byteLength ?? 0
}
console.log(JSON.stringify(summary, null, 2))
