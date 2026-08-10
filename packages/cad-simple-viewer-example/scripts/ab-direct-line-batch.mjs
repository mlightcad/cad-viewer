/**
 * A/B open-performance harness for direct-batch fast path.
 *
 * TODO(direct-batch-prof): delete this script before merge PR.
 *
 * Run:
 *   AB_DWG="C:/path/to.dwg" node packages/cad-simple-viewer-example/scripts/ab-direct-line-batch.mjs
 *
 * Optional env:
 *   AB_BASE_URL=http://127.0.0.1:5174
 *   AB_PORT=5174
 *   AB_SKIP_SERVER=1
 *   AB_REPEATS=1
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
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
const TIMEOUT_MS = 15 * 60 * 1000
const REPEATS = Math.max(1, Number(process.env.AB_REPEATS || 1))

function parseReport(report) {
  const num = re => {
    const m = report.match(re)
    return m ? Number(m[1]) : NaN
  }
  return {
    totalMs: num(/wall clock total:\s+(\d+)/),
    readMs: num(/db\.read:\s+(\d+)/),
    convertMs: num(/scene convert:\s+(\d+)/),
    entityMs: num(/ENTITY flush:\s+(\d+)/),
    parseMs: num(/PARSE:\s+(\d+)/),
    fontMs: num(/FONT:\s+(\d+)/)
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
    [
      'exec',
      'vite',
      '--config',
      'vite.ab.config.ts',
      '--host',
      '127.0.0.1',
      '--port',
      String(PORT)
    ],
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

async function runOnce(dwgPath, directBatch) {
  // Fresh Chromium per open avoids worker OOM / PARSE timeouts after heavy DWGs.
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const flag = directBatch ? '1' : '0'
  const url = `${BASE_URL}/?openprof=1&progressive=0&directbatch=${flag}`
  console.log(`\n=== directbatch=${directBatch ? 'on' : 'off'} ===`)
  console.log(`goto ${url}`)
  try {
    page.on('console', msg => {
      const text = msg.text()
      if (
        text.includes('[openprof]') ||
        text.includes('OPENPROF') ||
        text.includes('directBatch') ||
        msg.type() === 'error'
      ) {
        console.log(`[browser:${msg.type()}] ${text}`)
      }
    })
    page.on('pageerror', err => {
      console.log(`[browser:pageerror] ${err.message}`)
    })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('#fileInputElement', {
      state: 'attached',
      timeout: 60000
    })
    await page.locator('#fileInputElement').setInputFiles(dwgPath)
    // Succeed on full OPENPROF report, or finish when open failed (no report).
    await page.waitForFunction(
      () =>
        window.__OPENPROF_DONE__ === true ||
        window.__OPEN_SUCCESS__ === false,
      null,
      { timeout: TIMEOUT_MS }
    )
    const result = await page.evaluate(() => ({
      report: window.__OPENPROF_REPORT__ || '',
      wallMs: window.__OPEN_WALL_MS__ ?? null,
      success: window.__OPEN_SUCCESS__ ?? null,
      directBatchStats: window.__DIRECT_BATCH_STATS__ ?? null
    }))
    const parsed = parseReport(result.report)
    console.log(result.report)
    if (result.directBatchStats) {
      console.log(
        `[stats] directBatch=${JSON.stringify(result.directBatchStats)}`
      )
    }
    console.log(
      `[wall] openDocument wall=${result.wallMs?.toFixed?.(0) ?? result.wallMs} ms success=${result.success}`
    )
    return {
      directBatch,
      wallMs: result.wallMs,
      success: result.success,
      stats: result.directBatchStats,
      report: result.report,
      parsed
    }
  } finally {
    await browser.close()
  }
}

function avg(values) {
  const nums = values.filter(v => Number.isFinite(v))
  if (nums.length === 0) return NaN
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function printSummary(offRuns, onRuns) {
  const metric = (label, pick) => {
    const off = avg(offRuns.map(pick))
    const on = avg(onRuns.map(pick))
    const delta = on - off
    const pct = off !== 0 && Number.isFinite(off) ? (delta / off) * 100 : NaN
    return [
      label,
      off.toFixed(0),
      on.toFixed(0),
      delta.toFixed(0),
      Number.isFinite(pct) ? `${pct.toFixed(1)}%` : 'n/a'
    ]
  }

  const rows = [
    ['metric', 'legacy (off)', 'direct (on)', 'delta', 'delta%'],
    metric('wall total (ms)', r => r.parsed.totalMs),
    metric('open wall (ms)', r => r.wallMs),
    metric('db.read (ms)', r => r.parsed.readMs),
    metric('ENTITY flush (ms)', r => r.parsed.entityMs),
    metric('scene convert (ms)', r => r.parsed.convertMs),
    metric('PARSE (ms)', r => r.parsed.parseMs),
    metric('FONT (ms)', r => r.parsed.fontMs),
    metric('hit count', r => r.stats?.hitCount ?? NaN),
    metric('miss count', r => r.stats?.missCount ?? NaN),
    metric('candidate count', r => r.stats?.candidateCount ?? NaN),
    metric('hit ms', r => r.stats?.hitMs ?? NaN),
    metric('legacy candidate ms', r => r.stats?.legacyCandidateMs ?? NaN)
  ]

  console.log('\n========== DIRECT-BATCH A/B ==========')
  for (const row of rows) {
    console.log(row.map(c => String(c).padEnd(20)).join(''))
  }
  const offEntity = avg(offRuns.map(r => r.parsed.entityMs))
  const onEntity = avg(onRuns.map(r => r.parsed.entityMs))
  if (offEntity > 0 && Number.isFinite(onEntity)) {
    console.log(
      `\nENTITY flush on/off ratio: ${(onEntity / offEntity).toFixed(2)}x (<1 = faster with direct batch)`
    )
  }
  console.log('===========================================\n')
}

const dwg = process.env.AB_DWG
if (!dwg || !existsSync(dwg)) {
  console.error('Set AB_DWG to an existing DWG path')
  process.exit(1)
}
console.log(`DWG: ${dwg}`)
console.log(`Repeats per mode: ${REPEATS}`)

const SKIP_REVERSE = process.env.AB_SKIP_REVERSE === '1'
const server = await startServer()
try {
  console.log('\n=== warm-up (directbatch on, discarded) ===')
  await runOnce(dwg, true)

  const offRuns = []
  const onRuns = []
  for (let i = 0; i < REPEATS; i++) {
    console.log(`\n--- measured pass ${i + 1}/${REPEATS}: off then on ---`)
    offRuns.push(await runOnce(dwg, false))
    onRuns.push(await runOnce(dwg, true))
  }

  if (!SKIP_REVERSE) {
    // Reverse order to catch residual cache effects.
    console.log('\n=== reverse order ===')
    for (let i = 0; i < REPEATS; i++) {
      console.log(`\n--- reverse pass ${i + 1}/${REPEATS}: on then off ---`)
      onRuns.push(await runOnce(dwg, true))
      offRuns.push(await runOnce(dwg, false))
    }
  } else {
    console.log('\n=== reverse order skipped (AB_SKIP_REVERSE=1) ===')
  }

  const okOff = offRuns.filter(r => r.success !== false && r.parsed.entityMs)
  const okOn = onRuns.filter(r => r.success !== false && r.parsed.entityMs)
  if (okOff.length === 0 || okOn.length === 0) {
    console.error(
      `Insufficient successful runs: off=${okOff.length} on=${okOn.length}`
    )
    process.exitCode = 1
  }
  printSummary(okOff.length ? okOff : offRuns, okOn.length ? okOn : onRuns)
} finally {
  if (server) {
    server.kill('SIGTERM')
  }
}
