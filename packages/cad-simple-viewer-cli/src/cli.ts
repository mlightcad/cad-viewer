#!/usr/bin/env node
import path from 'node:path'

import { Command } from 'commander'

import { type CadViewerCliOpenMode,runHeadless } from './runHeadless.js'

const program = new Command()

function parseMode(value: string): CadViewerCliOpenMode {
  if (value === 'read' || value === 'write') {
    return value
  }
  throw new Error(`Invalid --mode "${value}". Expected "read" or "write".`)
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
  .option('--locale <code>', 'UI locale for prompts/keywords (e.g. en, zh)', 'en')
  .option('--logfile <path>', 'Append runtime log lines to this file')
  .action(async opts => {
    try {
      const mode = opts.mode ? parseMode(opts.mode) : undefined
      const result = await runHeadless({
        inputPath: opts.input
          ? /^https?:\/\//i.test(opts.input)
            ? opts.input
            : path.resolve(opts.input)
          : undefined,
        scriptPath: path.resolve(opts.script),
        outputDir: opts.output ? path.resolve(opts.output) : undefined,
        mode,
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
