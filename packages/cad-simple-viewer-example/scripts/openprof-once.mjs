/**
 * One-shot OPENPROF for a DWG (warmup + one measure).
 *
 *   AB_DWG=C:/path/to.dwg node packages/cad-simple-viewer-example/scripts/openprof-once.mjs
 * Optional: AB_PORT=5177 AB_WORKER=1 AB_PROGRESSIVE=0 AB_SKIP_SERVER=1 AB_BASE_URL=...
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')
const EXAMPLE = join(ROOT, 'packages/cad-simple-viewer-example')
// This package has no @playwright/test; share the e2e example's install.
const PLAYWRIGHT_EXAMPLE = join(ROOT, 'packages/cad-viewer-example')
const require = createRequire(join(PLAYWRIGHT_EXAMPLE, 'package.json'))
const { chromium } = require('@playwright/test')

const PORT = Number(process.env.AB_PORT || 5177)
const BASE_URL = process.env.AB_BASE_URL || `http://127.0.0.1:${PORT}`
const DWG = process.env.AB_DWG
const WORKER = process.env.AB_WORKER !== '0'
const PROGRESSIVE = process.env.AB_PROGRESSIVE === '1'
const TIMEOUT_MS = Number(process.env.AB_TIMEOUT_MS || 10 * 60 * 1000)

if (!DWG || !existsSync(DWG)) {
  console.error('Set AB_DWG to an existing .dwg path')
  process.exit(1)
}

async function waitForServer(url, timeoutMs = 180000) {
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
    ['exec', 'vite', '--host', '127.0.0.1', '--port', String(PORT), '--force'],
    { cwd: EXAMPLE, shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  child.stdout.on('data', d => process.stdout.write(`[vite] ${d}`))
  child.stderr.on('data', d => process.stderr.write(`[vite] ${d}`))
  await waitForServer(BASE_URL)
  return child
}

async function runOnce(browser, label) {
  const page = await browser.newPage()
  page.on('pageerror', err => console.error(`[pageerror] ${err.message}`))
  page.on('console', msg => {
    const text = msg.text()
    const t = msg.type()
    if (text.includes('OPENPROF (open-file profile)')) {
      // Backup capture if page monkey-patch missed the log.
      void page.evaluate(report => {
        const w = window
        w.__OPENPROF_REPORT__ = report
        w.__OPENPROF_DONE__ = true
      }, text)
      console.log('[capture] OPENPROF console message seen')
    }
    if (text.includes('[fontPreload]') || text.includes('awaitFonts:')) {
      console.log(`[console.log] ${text.slice(0, 500)}`)
    }
    if (t === 'error' || t === 'warning') {
      console.log(`[console.${t}] ${text.slice(0, 300)}`)
    }
  })
  const qs = new URLSearchParams({
    openprof: '1',
    progressive: PROGRESSIVE ? '1' : '0',
    ...(WORKER ? { worker: '1' } : {})
  })
  const url = `${BASE_URL}/?${qs}`
  console.log(`\n=== ${label} ===`)
  console.log(`goto ${url}`)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForSelector('#fileInputElement', {
    state: 'attached',
    timeout: 120000
  })
  console.log(`setInputFiles ${DWG}`)
  await page.locator('#fileInputElement').setInputFiles(DWG)
  console.log('waiting for OPENPROF…')
  const started = Date.now()
  const diagTimer = setInterval(async () => {
    try {
      const diag = await page.evaluate(() => {
        const w = window
        return {
          openDone: w.__OPENPROF_DONE__ === true,
          openWall: w.__OPEN_WALL_MS__ ?? null,
          openSuccess: w.__OPEN_SUCCESS__ ?? null,
          mode: w.__OPEN_MODE__ ?? null,
          hasReport: typeof w.__OPENPROF_REPORT__ === 'string',
          reportLen: w.__OPENPROF_REPORT__?.length ?? 0
        }
      })
      console.log(
        `[diag +${((Date.now() - started) / 1000).toFixed(0)}s]`,
        JSON.stringify(diag)
      )
    } catch (e) {
      console.log(`[diag] ${e instanceof Error ? e.message : e}`)
    }
  }, 15000)
  try {
    await page.waitForFunction(() => window.__OPENPROF_DONE__ === true, null, {
      timeout: TIMEOUT_MS
    })
  } finally {
    clearInterval(diagTimer)
  }
  console.log(`OPENPROF done in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  const report = await page.evaluate(() => window.__OPENPROF_REPORT__ || '')
  const wallMs = await page.evaluate(() => window.__OPEN_WALL_MS__ ?? null)
  const mode = await page.evaluate(() => window.__OPEN_MODE__ ?? null)
  await page.close()
  console.log(report)
  console.log(`[open wall ms] ${wallMs} mode=${mode}`)
  return { report, wallMs, mode }
}

console.log(`DWG: ${DWG}`)
const server = await startServer()
const browser = await chromium.launch({ headless: true })
try {
  if (process.env.AB_SKIP_WARMUP !== '1') {
    await runOnce(browser, 'warm-up (discard)')
  }
  const measure = await runOnce(browser, 'measure')
  if (!measure.report.includes('fontPreload critical')) {
    console.error('FAIL: no fontPreload lines — rebuild dist / hard-refresh needed')
    process.exitCode = 2
  }
} finally {
  await browser.close()
  if (server) server.kill('SIGTERM')
}
