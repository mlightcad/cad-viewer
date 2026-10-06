#!/usr/bin/env node
import path from 'node:path'

import { Command } from 'commander'

import {
  type CadViewerCliOpenMode,
  type CadViewerCliOpenViewMode,
  runHeadless
} from './runHeadless.js'

const program = new Command()

function parseMode(value: string): CadViewerCliOpenMode {
  if (value === 'read' || value === 'write') {
    return value
  }
  throw new Error(`Invalid --mode "${value}". Expected "read" or "write".`)
}

function parseOpenViewMode(value: string): CadViewerCliOpenViewMode {
  if (value === 'extents' || value === 'saved') {
    return value
  }
  throw new Error(
    `Invalid --open-view-mode "${value}". Expected "extents" or "saved".`
  )
}

function parseBooleanFlag(flag: string, value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false
  }
  throw new Error(
    `Invalid ${flag} "${value}". Expected "true" or "false".`
  )
}

function parseBaseUrl(value: string): string {
  const trimmed = value.trim()
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error(`Invalid --base-url "${value}". Expected an http(s) URL.`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Invalid --base-url "${value}". Expected an http(s) URL.`)
  }
  return trimmed
}

function parseCircleSides(value: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    throw new Error(
      `Invalid --circle-sides "${value}". Expected a positive integer.`
    )
  }
  return n
}

program
  .name('cad-simple-viewer-cli')
  .description(
    'AcCoreConsole-style headless CAD CLI: open a DXF/DWG (or blank drawing) and run a .scr command script'
  )
  .option(
    '-i, --input <file-or-url>',
    'Input .dxf/.dwg path or http(s) URL (like AcCoreConsole /i). Omit to start from a blank ISO template'
  )
  .requiredOption(
    '-s, --script <file>',
    'Command script .scr to execute (like AcCoreConsole /s)'
  )
  .option(
    '-o, --output <dir>',
    'Directory for downloaded export files (default: input dir, or cwd when no input)'
  )
  .option(
    '--mode <read|write>',
    'Document open mode (default: read with -i, write without -i)'
  )
  .option(
    '--open-view-mode <extents|saved>',
    'Frame view after open: extents (full drawing) or saved (AutoCAD VPORT). Default: extents in read, saved in write'
  )
  .option(
    '--draw-no-plot-layers <true|false>',
    'Draw entities on non-plottable layers (default: false)'
  )
  .option(
    '--circle-sides <n>',
    'Max segments for circle tessellation (default: 50 draft)',
    parseCircleSides
  )
  .option('--locale <code>', 'UI locale for prompts/keywords (e.g. en, zh)', 'en')
  .option(
    '--base-url <url>',
    'Resource base URL for fonts and templates (default: CDN cad-data). Fonts load from <url>/fonts/',
    parseBaseUrl
  )
  .option('--logfile <path>', 'Append runtime log lines to this file')
  .action(async opts => {
    try {
      const mode = opts.mode ? parseMode(opts.mode) : undefined
      const openViewMode = opts.openViewMode
        ? parseOpenViewMode(opts.openViewMode)
        : undefined
      const drawNoPlotLayers =
        opts.drawNoPlotLayers != null
          ? parseBooleanFlag('--draw-no-plot-layers', opts.drawNoPlotLayers)
          : undefined
      const result = await runHeadless({
        inputPath: opts.input
          ? /^https?:\/\//i.test(opts.input)
            ? opts.input
            : path.resolve(opts.input)
          : undefined,
        scriptPath: path.resolve(opts.script),
        outputDir: opts.output ? path.resolve(opts.output) : undefined,
        mode,
        openViewMode,
        drawNoPlotLayers,
        circleSides: opts.circleSides,
        baseUrl: opts.baseUrl,
        locale: opts.locale,
        logfile: opts.logfile ? path.resolve(opts.logfile) : undefined
      })

      if (result.savedFiles.length === 0) {
        console.log(
          `Script finished. No downloads were captured (output dir: ${result.outputDir}).`
        )
      } else {
        for (const file of result.savedFiles) {
          console.log(`Wrote ${file}`)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`cad-simple-viewer-cli failed: ${message}`)
      if (error instanceof Error && error.stack) {
        console.error(error.stack)
      }
      process.exitCode = 1
    }
  })

program.parse()
