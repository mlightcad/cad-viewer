#!/usr/bin/env node
/**
 * Recursively scan a directory for .dwg / .dxf files and export each to PNG
 * via cad-simple-viewer-cli + export-png.scr.
 *
 * Usage (from packages/cad-simple-viewer-cli after build):
 *   node examples/batch-export-png.mjs <inputDir> [outputDir]
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const cliJs = path.join(packageRoot, 'dist', 'cli.js')
const scriptPath = path.join(__dirname, 'export-png.scr')

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
      [
        cliJs,
        '-i',
        input,
        '-s',
        scriptPath,
        '-o',
        outputDir,
        '--mode',
        'read'
      ],
      { stdio: 'inherit' }
    )
    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`cad-simple-viewer-cli exited with code ${code} for ${input}`))
    })
  })
}

async function main() {
  const inputDir = path.resolve(process.argv[2] ?? '')
  const outputDir = path.resolve(process.argv[3] ?? path.join(inputDir, 'png-out'))

  if (!process.argv[2] || !existsSync(inputDir)) {
    console.error(
      'Usage: node examples/batch-export-png.mjs <inputDir> [outputDir]'
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

  console.log(`Found ${drawings.length} drawing(s). Output: ${outputDir}`)
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
