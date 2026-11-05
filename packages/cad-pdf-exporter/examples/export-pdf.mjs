#!/usr/bin/env node
/**
 * Export a DXF/DWG to PDF without a browser.
 *
 * Run from this package after `pnpm build`:
 *
 *   node examples/export-pdf.mjs drawing.dwg drawing.pdf
 *   node examples/export-pdf.mjs drawing.dwg drawing.pdf --color-mode monochrome
 *   node examples/export-pdf.mjs drawing.dwg drawing.pdf --text-mode vector --no-layouts
 *   node examples/export-pdf.mjs drawing.dwg drawing.pdf --fonts-dir D:/cad-data
 *
 * In a published install, import `@mlightcad/cad-pdf-exporter` instead of
 * `../dist/index.js`.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { exportFileToPdf } from '../dist/index.js'

const here = path.dirname(fileURLToPath(import.meta.url))

function usage() {
  return `Usage: node ${path.relative(process.cwd(), path.join(here, 'export-pdf.mjs'))} <input.dwg|dxf> <output.pdf> [options]

Options:
  --color-mode color|monochrome  Default: color.
                       monochrome = white paper, all drawing content black
  --text-mode text|vector   Default: text (selectable text, smaller file)
  --layouts                 Export model space and every layout (default)
  --no-layouts              Export the current space only
  --title <title>           PDF title. Default: input file name
  --fonts-dir <path>        Local font library (folder, fonts.json, or cad-data root)
  --fonts-url <url>         Remote font library base URL (ignored when --fonts-dir is set)
  --dwg-parser libredwg|dwg Default: libredwg (dwg needs optional @mlightcad/dwg-converter)
  --dwg-license-key <key>   License for --dwg-parser dwg (omit to use trial if active)
  --draw-no-plot-layers     Include non-plottable layers (default: omit them)
`
}

const CHOICES = {
  colorMode: ['color', 'monochrome'],
  textMode: ['text', 'vector'],
  dwgParser: ['libredwg', 'dwg']
}

function parseArgs(argv) {
  const positional = []
  const options = { exportLayouts: true }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--color-mode') {
      options.colorMode = argv[++i]
    } else if (arg === '--text-mode') {
      options.textMode = argv[++i]
    } else if (arg === '--layouts') {
      options.exportLayouts = true
    } else if (arg === '--no-layouts') {
      options.exportLayouts = false
    } else if (arg === '--title') {
      options.title = argv[++i]
    } else if (arg === '--fonts-dir') {
      options.fontsDir = argv[++i]
    } else if (arg === '--fonts-url') {
      options.fontsUrl = argv[++i]
    } else if (arg === '--dwg-parser') {
      options.dwgParser = argv[++i]
    } else if (arg === '--dwg-license-key') {
      options.dwgLicenseKey = argv[++i]
    } else if (arg === '--draw-no-plot-layers') {
      options.drawNoPlotLayers = true
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    } else {
      positional.push(arg)
    }
  }
  for (const [key, allowed] of Object.entries(CHOICES)) {
    if (options[key] !== undefined && !allowed.includes(options[key])) {
      throw new Error(
        `Invalid value for ${key}: ${options[key]} (expected ${allowed.join(' | ')})`
      )
    }
  }
  return { positional, options }
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2))
  if (options.help || positional.length < 2) {
    console.log(usage())
    process.exit(options.help ? 0 : 1)
  }
  const [input, output] = positional.map(p => path.resolve(p))
  const { help: _help, ...exportOptions } = options

  const started = performance.now()
  const result = await exportFileToPdf(input, output, exportOptions)
  console.log(
    `Wrote ${output} (${result.bytes.byteLength} bytes) in ${(
      (performance.now() - started) /
      1000
    ).toFixed(1)}s`
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
