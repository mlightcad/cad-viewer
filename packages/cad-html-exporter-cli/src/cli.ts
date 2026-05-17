#!/usr/bin/env node
import path from 'node:path'

import { Command } from 'commander'

import { exportToHtml } from './exportToHtml.js'

const program = new Command()

program
  .name('cad-html-exporter')
  .description(
    'Convert a DXF or DWG file to a self-contained offline HTML viewer'
  )
  .argument('<input>', 'Path to the .dxf or .dwg file')
  .option(
    '-o, --output <path>',
    'Output .html path (default: same name as input)'
  )
  .option('--locale <code>', 'UI locale embedded in HTML (e.g. en, zh)', 'en')
  .option('--title <text>', 'Drawing title in exported metadata')
  .action(async (input: string, opts) => {
    try {
      const outputPath = await exportToHtml(path.resolve(input), {
        outputPath: opts.output ? path.resolve(opts.output) : undefined,
        locale: opts.locale,
        title: opts.title
      })
      console.log(`Wrote ${outputPath}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Export failed: ${message}`)
      if (error instanceof Error && error.stack) {
        console.error(error.stack)
      }
      process.exitCode = 1
    }
  })

program.parse()
