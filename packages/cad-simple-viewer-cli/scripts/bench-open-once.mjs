#!/usr/bin/env node
/**
 * One-shot open+idle bench for a single drawing.
 * Usage: node scripts/bench-open-once.mjs <drawingPath> <label>
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, '..')
const cliJs = path.join(packageRoot, 'dist', 'cli.js')
const scriptPath = path.join(packageRoot, 'examples', 'open-quit.scr')

const drawingPath = process.argv[2] ? path.resolve(process.argv[2]) : ''
const label = process.argv[3] || 'run'
if (!drawingPath) {
  console.error('Usage: node scripts/bench-open-once.mjs <drawingPath> <label>')
  process.exit(1)
}

const outDir = path.join(packageRoot, '.bench-out', label)
const args = [
  cliJs,
  '-i',
  drawingPath,
  '-s',
  scriptPath,
  '-o',
  outDir,
  '--mode',
  'read'
]

const child = spawn(process.execPath, args, {
  cwd: packageRoot,
  env: process.env
})

let stdout = ''
let stderr = ''
const t0 = performance.now()
child.stdout.on('data', c => {
  const t = String(c)
  stdout += t
  process.stdout.write(t)
})
child.stderr.on('data', c => {
  const t = String(c)
  stderr += t
  process.stderr.write(t)
})

child.on('exit', code => {
  const wallMs = performance.now() - t0
  const combined = stdout + stderr
  const pick = re => {
    const m = combined.match(re)
    return m ? Number(m[1]) : null
  }
  const result = {
    label,
    code,
    wallMs: Math.round(wallMs),
    webgl: (combined.match(/webgl:\s*(.+)/) || [])[1] || null,
    browserReadyMs: pick(/browser ready:\s*([\d.]+)\s*ms/),
    openIdleMs: pick(/open\+idle:\s*([\d.]+)\s*ms/),
    openProfTotalMs: pick(/OPENPROF total=([\d.]+)ms/),
    openProfReadMs: pick(/OPENPROF total=[\d.]+ms read=([\d.]+)ms/),
    openProfConvertMs: pick(
      /OPENPROF total=[\d.]+ms read=[\d.]+ms convert=([\d.]+)ms/
    ),
    finishGeometryMs: pick(/finishGeometry=([\d.]+)ms/),
    handleGroupMs: pick(/handleGroup=([\d.]+)ms/),
    addEntityMs: pick(/addEntity=([\d.]+)ms/),
    awaitFontsMs: pick(/awaitFonts=([\d.]+)ms/),
    paintCount: pick(/OPENPROF paints=(\d+)/) ?? pick(/mid-open paints=(\d+)/),
    yieldCount: pick(/OPENPROF paints=\d+ yields=(\d+)/),
    scriptMs: pick(/\[cad-simple-viewer-cli\] script:\s*([\d.]+)\s*ms/)
  }
  console.log('\n--- BENCH_JSON ---')
  console.log(JSON.stringify(result, null, 2))
  process.exit(code === 0 ? 0 : code ?? 1)
})
