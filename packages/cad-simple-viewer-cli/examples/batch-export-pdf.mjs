#!/usr/bin/env node
/**
 * Recursively scan a directory for .dwg / .dxf files and export each to PDF
 * via cad-simple-viewer-cli + export-pdf.scr (or export-pdf-monochrome.scr).
 *
 * Usage (from packages/cad-simple-viewer-cli after build):
 *   node examples/batch-export-pdf.mjs <inputDir> [outputDir] [--color-mode color|monochrome]
 *
 * --color-mode monochrome writes white paper with black linework and text.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const cliJs = path.join(packageRoot, 'dist', 'cli.js')
const args = process.argv.slice(2)
const colorModeIndex = args.indexOf('--color-mode')
const colorMode = colorModeIndex >= 0 ? args[colorModeIndex + 1] : 'color'
if (colorModeIndex >= 0) args.splice(colorModeIndex, 2)
const scriptPath = path.join(
  __dirname,
  colorMode === 'monochrome' ? 'export-pdf-monochrome.scr' : 'export-pdf.scr'
)

const DRAWING_EXT = new Set(['.dwg', '.dxf'])

async function collectDrawings(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectDrawings(full, out)
    } else if (DRAWING_EXT.has(path.extname(entry.name).toLowerCase())) {
      out.push(full)
    }
  }
  return out
}

function runCli(input, outputDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [cliJs, '-i', input, '-s', scriptPath, '-o', outputDir, '--mode', 'read'],
      { stdio: 'inherit' }
    )
    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) resolve()
      else
        reject(
          new Error(
            `cad-simple-viewer-cli exited with code ${code} for ${input}`
          )
        )
    })
  })
}

async function main() {
  const inputDir = path.resolve(args[0] ?? '')
  const outputDir = path.resolve(args[1] ?? path.join(inputDir, 'pdf-out'))

  if (colorMode !== 'color' && colorMode !== 'monochrome') {
    console.error(`Invalid --color-mode: ${colorMode} (color | monochrome)`)
    process.exitCode = 1
    return
  }
  if (!args[0] || !existsSync(inputDir)) {
    console.error(
      'Usage: node examples/batch-export-pdf.mjs <inputDir> [outputDir] [--color-mode color|monochrome]'
    )
    process.exitCode = 1
    return
  }
  if (!existsSync(cliJs)) {
    console.error(
      'CLI not built. Run: pnpm --filter @mlightcad/cad-simple-viewer-cli build'
    )
    process.exitCode = 1
    return
  }

  await mkdir(outputDir, { recursive: true })
  const drawings = await collectDrawings(inputDir)
  if (!drawings.length) {
    console.error(`No .dwg/.dxf files found under ${inputDir}`)
    process.exitCode = 1
    return
  }

  console.log(
    `Found ${drawings.length} drawing(s). Color mode: ${colorMode}. Output: ${outputDir}`
  )
  let failed = 0
  for (const drawing of drawings) {
    console.log(`\n=== ${drawing} ===`)
    try {
      await runCli(drawing, outputDir)
    } catch (error) {
      failed++
      console.error(error instanceof Error ? error.message : String(error))
    }
  }

  console.log(`\nDone. success=${drawings.length - failed} failed=${failed}`)
  if (failed) process.exitCode = 1
}

await main()
