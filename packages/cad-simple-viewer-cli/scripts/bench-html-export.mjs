#!/usr/bin/env node
/**
 * Compare multi HTML export wall time across a fixed drawing set.
 *
 * Usage:
 *   node scripts/bench-html-export.mjs <inputDir> <label> [outJson]
 *
 * Drawings are resolved as `<inputDir>/<name>` for each entry in DRAWINGS.
 */
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const cliJs = path.join(packageRoot, 'dist', 'cli.js')
const scriptPath = path.join(
  packageRoot,
  'examples',
  'export-html-multi-preview.scr'
)

const DRAWINGS = [
  'P040100J001A_机架(5秒).DWG',
  '上高县东方星城小区地下车库地形图(6秒).dwg',
  '帅福得- 厂区工程-总图20221022(43秒).dwg'
]

const inputDir = process.argv[2] ? path.resolve(process.argv[2]) : ''
const label = process.argv[3] || 'run'
const outJson = process.argv[4]
  ? path.resolve(process.argv[4])
  : path.join(packageRoot, `bench-${label}.json`)

if (!inputDir) {
  console.error(
    'Usage: node scripts/bench-html-export.mjs <inputDir> <label> [outJson]'
  )
  process.exit(1)
}

function runOne(drawingPath, outputDir) {
  return new Promise((resolve, reject) => {
    const args = [
      cliJs,
      '-i',
      drawingPath,
      '-s',
      scriptPath,
      '-o',
      outputDir,
      '--mode',
      'read'
    ]
    const child = spawn(process.execPath, args, {
      cwd: packageRoot,
      env: process.env
    })
    let stdout = ''
    let stderr = ''
    let exportDoneMs = null
    const t0 = performance.now()
    const onChunk = (chunk, isErr) => {
      const text = String(chunk)
      if (isErr) {
        stderr += text
        process.stderr.write(text)
      } else {
        stdout += text
        process.stdout.write(text)
      }
      const combined = stdout + stderr
      // Prefer in-page total; else first time both outputs are written.
      if (
        exportDoneMs == null &&
        (/timings:.*?total=([\d.]+)ms/.test(combined) ||
          (combined.match(/^Wrote /gm) || []).length >= 1)
      ) {
        exportDoneMs = performance.now() - t0
      }
    }
    child.stdout.on('data', chunk => onChunk(chunk, false))
    child.stderr.on('data', chunk => onChunk(chunk, true))
    child.on('error', reject)
    child.on('exit', code => {
      const wallMs = performance.now() - t0
      const combined = stdout + stderr
      const pick = re => {
        const m = combined.match(re)
        return m ? Number(m[1]) : null
      }
      const cliTotalMs = pick(/timings:.*?total=([\d.]+)ms/)
      resolve({
        code,
        wallMs,
        exportDoneMs: cliTotalMs ?? exportDoneMs ?? wallMs,
        browserLaunchMs: pick(/browser ready:\s*([\d.]+)\s*ms/),
        openIdleMs: pick(/open\+idle:\s*([\d.]+)\s*ms/),
        openProfTotalMs: pick(/OPENPROF total=([\d.]+)ms/),
        openProfConvertMs: pick(
          /OPENPROF total=[\d.]+ms read=[\d.]+ms convert=([\d.]+)ms/
        ),
        addEntityMs: pick(/addEntity=([\d.]+)ms/),
        handleGroupMs: pick(/handleGroup=([\d.]+)ms/),
        chtmlTotalMs: pick(/\[chtml\] chtml total:\s*([\d.]+)\s*ms/),
        scriptMs: pick(/\[cad-simple-viewer-cli\] script:\s*([\d.]+)\s*ms/),
        cliTotalMs
      })
    })
  })
}

async function main() {
  const results = []
  for (const name of DRAWINGS) {
    const drawingPath = path.join(inputDir, name)
    const outputDir = path.join(
      packageRoot,
      '..',
      '..',
      'tmp-export-bench',
      label,
      name.replace(/[^\w.\u4e00-\u9fff()-]+/g, '_')
    )
    await mkdir(outputDir, { recursive: true })
    console.log(`\n======== ${label}: ${name} ========`)
    const result = await runOne(drawingPath, outputDir)
    results.push({ name, ...result })
    if (result.code !== 0) {
      console.error(`FAILED ${name} code=${result.code}`)
    } else {
      console.log(
        `RESULT exportDone=${result.exportDoneMs.toFixed(0)}ms wall=${result.wallMs.toFixed(0)}ms open+idle=${result.openIdleMs ?? '-'} chtml=${result.chtmlTotalMs ?? '-'} addEntity=${result.addEntityMs ?? '-'}`
      )
    }
  }

  const payload = {
    label,
    collectedAt: new Date().toISOString(),
    results
  }
  await writeFile(outJson, JSON.stringify(payload, null, 2), 'utf8')
  console.log(`\nWrote ${outJson}`)
}

await main()
