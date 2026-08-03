/**
 * A/B open-performance harness for progressive rendering.
 *
 * Prerequisites:
 *   - `pnpm --filter @mlightcad/cad-html-plugin build` (viewer-runtime)
 *   - Target DWG at AB_DWG (default: 14.1 MiB water/drainage fixture)
 *
 * Run:
 *   node packages/cad-simple-viewer-example/scripts/ab-progressive-open.mjs
 *
 * Optional env:
 *   AB_DWG=D:/path/to.dwg
 *   AB_BASE_URL=http://127.0.0.1:5174
 *   AB_PORT=5174
 *   AB_SKIP_SERVER=1   # reuse an already-running simple example
 */
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')
const EXAMPLE = join(ROOT, 'packages/cad-simple-viewer-example')
const PLAYWRIGHT_EXAMPLE = join(ROOT, 'packages/cad-viewer-example')
const require = createRequire(join(PLAYWRIGHT_EXAMPLE, 'package.json'))
const { chromium } = require('@playwright/test')
const PORT = Number(process.env.AB_PORT || 5174)
const BASE_URL = process.env.AB_BASE_URL || `http://127.0.0.1:${PORT}`
const DATA_DIR = 'D:/Data/dwg'
const TARGET_BYTES = 14147769
const TIMEOUT_MS = 15 * 60 * 1000

function findDefaultDwg() {
  if (process.env.AB_DWG && existsSync(process.env.AB_DWG)) {
    return process.env.AB_DWG
  }
  try {
    const name = readdirSync(DATA_DIR).find(file => {
      try {
        return (
          file.toLowerCase().endsWith('.dwg') &&
          readFileSync(join(DATA_DIR, file)).byteLength === TARGET_BYTES
        )
      } catch {
        return false
      }
    })
    return name ? join(DATA_DIR, name) : undefined
  } catch {
    return undefined
  }
}

function parseReport(report) {
  const num = (re) => {
    const m = report.match(re)
    return m ? Number(m[1]) : NaN
  }
  return {
    progressive: /progressive:\s+(on|off)/.exec(report)?.[1],
    paints: num(/mid-open paints=(\d+)/),
    yields: num(/yields=(\d+)/),
    totalMs: num(/wall clock total:\s+(\d+)/),
    readMs: num(/db\.read:\s+(\d+)/),
    convertMs: num(/scene convert:\s+(\d+)/),
    entityMs: num(/ENTITY flush:\s+(\d+)/),
    compactMs: num(/compact (\d+)/)
  }
}

async function waitForServer(url, timeoutMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 404) return
    } catch {
      // retry
    }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Server not ready at ${url}`)
}

async function startServer() {
  if (process.env.AB_SKIP_SERVER === '1') {
    await waitForServer(BASE_URL)
    return null
  }
  const child = spawn(
    'pnpm',
    ['exec', 'vite', '--host', '127.0.0.1', '--port', String(PORT)],
    {
      cwd: EXAMPLE,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    }
  )
  child.stdout.on('data', d => process.stdout.write(`[vite] ${d}`))
  child.stderr.on('data', d => process.stderr.write(`[vite] ${d}`))
  await waitForServer(BASE_URL)
  return child
}

async function runOnce(browser, dwgPath, progressive) {
  const page = await browser.newPage()
  const url = `${BASE_URL}/?openprof=1&progressive=${progressive ? '1' : '0'}`
  console.log(`\n=== progressive=${progressive ? 'on' : 'off'} ===`)
  console.log(`goto ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  // The file input is visually hidden; attach is enough for setInputFiles.
  await page.waitForSelector('#fileInputElement', {
    state: 'attached',
    timeout: 60000
  })
  await page.locator('#fileInputElement').setInputFiles(dwgPath)
  await page.waitForFunction(() => window.__OPENPROF_DONE__ === true, null, {
    timeout: TIMEOUT_MS
  })
  const report = await page.evaluate(() => window.__OPENPROF_REPORT__ || '')
  const wallMs = await page.evaluate(() => window.__OPEN_WALL_MS__ ?? null)
  await page.close()
  const parsed = parseReport(report)
  console.log(report)
  return { progressive, wallMs, report, parsed }
}

function printSummary(off, on) {
  const rows = [
    ['metric', 'progressive off', 'progressive on', 'delta'],
    [
      'wall total (ms)',
      String(off.parsed.totalMs),
      String(on.parsed.totalMs),
      String(on.parsed.totalMs - off.parsed.totalMs)
    ],
    [
      'db.read (ms)',
      String(off.parsed.readMs),
      String(on.parsed.readMs),
      String(on.parsed.readMs - off.parsed.readMs)
    ],
    [
      'scene convert (ms)',
      String(off.parsed.convertMs),
      String(on.parsed.convertMs),
      String(on.parsed.convertMs - off.parsed.convertMs)
    ],
    [
      'ENTITY flush (ms)',
      String(off.parsed.entityMs),
      String(on.parsed.entityMs),
      String(on.parsed.entityMs - off.parsed.entityMs)
    ],
    [
      'mid-open paints',
      String(off.parsed.paints || 0),
      String(on.parsed.paints || 0),
      String((on.parsed.paints || 0) - (off.parsed.paints || 0))
    ],
    [
      'yields',
      String(off.parsed.yields || 0),
      String(on.parsed.yields || 0),
      String((on.parsed.yields || 0) - (off.parsed.yields || 0))
    ]
  ]
  console.log('\n========== A/B SUMMARY ==========')
  for (const row of rows) {
    console.log(row.map(c => String(c).padEnd(20)).join(''))
  }
  if (off.parsed.totalMs > 0) {
    const ratio = on.parsed.totalMs / off.parsed.totalMs
    console.log(
      `\nprogressive/off ratio: ${ratio.toFixed(2)}x (1.0 = no regression)`
    )
  }
  console.log('=================================\n')
}

const dwg = findDefaultDwg()
if (!dwg) {
  console.error(
    'Target DWG not found. Set AB_DWG or place the 14147769-byte fixture under D:/Data/dwg'
  )
  process.exit(1)
}
console.log(`DWG: ${dwg}`)

const server = await startServer()
const browser = await chromium.launch({ headless: true })
try {
  // Warm fonts / WASM once so cold-start CDN I/O does not dominate A/B.
  console.log('\n=== warm-up (progressive off, discarded) ===')
  await runOnce(browser, dwg, false)

  const off = await runOnce(browser, dwg, false)
  const on = await runOnce(browser, dwg, true)
  printSummary(off, on)

  // Reverse order to catch residual cache effects.
  console.log('\n=== reverse order ===')
  const on2 = await runOnce(browser, dwg, true)
  const off2 = await runOnce(browser, dwg, false)
  printSummary(off2, on2)
} finally {
  await browser.close()
  if (server) {
    server.kill('SIGTERM')
  }
}
