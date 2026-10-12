/**
 * Browser verification of FIND across layouts in cad-simple-ui-plugin, using
 * the fictitious three-layout fixture
 * `cad-viewer-example/e2e/fixtures/find-layouts.dxf` (Model, Planta, Alçados)
 * and the `cad-simple-viewer-example` app.
 *
 * Not part of the jest run (`/e2e/` is ignored). Usage:
 *
 *   pnpm --filter @mlightcad/cad-simple-viewer-example dev --port 5199 &
 *   FIND_E2E_URL=http://127.0.0.1:5199/ node packages/cad-simple-ui-plugin/__tests__/e2e/find-layouts.e2e.mjs
 *
 * Env: FIND_E2E_URL (default http://127.0.0.1:5199/), FIND_E2E_CHROME
 * (chromium executable; defaults to Playwright's own), FIND_E2E_SHOTS
 * (directory for screenshots; default: none).
 *
 * Playwright is resolved from `packages/cad-viewer-example`.
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(
  path.resolve(here, '../../../cad-viewer-example/package.json')
)
const { chromium } = require('@playwright/test')

const URL = process.env.FIND_E2E_URL ?? 'http://127.0.0.1:5199/'
const SHOTS = process.env.FIND_E2E_SHOTS
const FIXTURE = path.resolve(
  here,
  '../../../cad-viewer-example/e2e/fixtures/find-layouts.dxf'
)

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.FIND_E2E_CHROME || undefined,
  args: ['--no-sandbox']
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
let viewerUrl
page.on('request', r => {
  if (/cad-simple-viewer\/(dist\/cad-simple-viewer\.js)/.test(r.url())) {
    viewerUrl = r.url()
  }
})

const shot = async name => {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
}
const step = (name, detail = '') =>
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`)

/** Runs `fn(manager)` inside the page against the live AcApDocManager. */
const inPage = (fn, arg) =>
  page.evaluate(
    async ([src, url, a]) => {
      const mod = await import(url)
      return new Function('m', 'a', `return (${src})(m, a)`)(mod, a)
    },
    [fn.toString(), viewerUrl, arg]
  )

await page.goto(URL)
await page.waitForTimeout(3000)
await page
  .locator('.ml-ui-file-open-input-hidden')
  .first()
  .setInputFiles(FIXTURE)
await page.waitForSelector('[data-toolbar-item-id="find"]')
await page.waitForTimeout(8000)
assert.ok(viewerUrl, 'viewer module url captured')

/** Active layout name, view centre and selection. */
const state = () =>
  inPage(m => {
    const mgr = m.AcApDocManager.instance
    const v = mgr.curView
    let name = ''
    for (const l of mgr.curDocument.database.objects.layout.newIterator()) {
      if (l.blockTableRecordId === v.activeLayoutBtrId) name = l.layoutName
    }
    return {
      layout: name,
      center: [v.center.x, v.center.y],
      selected: [...v.selectionSet.ids]
    }
  })

assert.equal((await state()).layout, 'Model', 'drawing opens in model space')

await page.locator('[data-toolbar-item-id="find"]').click()
const input = page.locator('.ml-ex-ui-find-input')
await input.waitFor({ state: 'visible' })
const layoutOnly = page.locator(
  '.ml-ex-ui-find-option input[data-find-scope="layout"]'
)
const rows = () => page.locator('.ml-ex-ui-find-row')
const results = async () =>
  (
    await rows().evaluateAll(els =>
      els.map(
        el =>
          `${el.querySelector('.ml-ex-ui-find-layout').textContent} | ${
            el.querySelector('.ml-ex-ui-find-text').textContent
          }`
      )
    )
  ).sort()
const search = async query => {
  await input.fill(query)
  await page.locator('.ml-ex-ui-find-btn').click()
}

// --- documented default: the whole drawing -------------------------------
assert.equal(await layoutOnly.isChecked(), false, 'whole drawing by default')
assert.match(
  await page.locator('.ml-ex-ui-find-status').innerText(),
  /whole drawing/
)
await search('sala')
assert.deepEqual(await results(), [
  'Alçados | Sala Técnica 01 (vista lateral)',
  'Model | Sala Técnica 01',
  'Planta | Legenda: Sala Técnica 01'
])
assert.match(
  await page.locator('.ml-ex-ui-find-status').innerText(),
  /3 found in 3 layouts/
)
await shot('find-layouts-1-drawing')
step('default scope searches every layout; hits name their layout', '3 hits')

// --- accents + a term that exists in one non-active layout only ---------
await search('alcado')
assert.deepEqual(await results(), ['Alçados | Alçado Norte - Folha 2'])
step('accent-insensitive hit in a layout that is not active')

// --- explicit current-layout-only ----------------------------------------
await search('sala')
await layoutOnly.check()
assert.deepEqual(await results(), ['Model | Sala Técnica 01'])
await shot('find-layouts-2-current-only')
await layoutOnly.uncheck()
assert.equal(await rows().count(), 3)
step('"Current layout only" restricts to the active layout and toggles back')

// --- cross-layout navigation ---------------------------------------------
const planta = rows().filter({ hasText: 'Planta' })
await planta.click()
await page.waitForTimeout(2500)
let s = await state()
assert.equal(s.layout, 'Planta', 'layout activated')
assert.deepEqual(s.selected, ['C11'], 'hit entity selected')
// "Legenda: Sala Técnica 01" starts at (40, 500) in paper space.
assert.ok(
  s.center[0] > 40 &&
    s.center[0] < 400 &&
    s.center[1] > 495 &&
    s.center[1] < 515,
  `view centred on the paper-space text: ${s.center}`
)
await shot('find-layouts-3-planta')
step('click on a Planta hit activates Planta, pans/zooms and selects')

const alc = rows().filter({ hasText: 'Alçados' })
await alc.click()
await page.waitForTimeout(2500)
s = await state()
assert.equal(s.layout, 'Alçados')
assert.deepEqual(s.selected, ['D11'])
step('click on an Alçados hit activates a never-visited layout')

await rows().filter({ hasText: 'Model' }).click()
await page.waitForTimeout(2000)
s = await state()
assert.equal(s.layout, 'Model')
assert.deepEqual(s.selected, ['B1'])
step('click back to the model-space hit switches layout again')

// --- Enter steps across layouts --------------------------------------------
await search('sala')
await input.press('Enter')
await page.waitForTimeout(1500)
await input.press('Enter')
await page.waitForTimeout(2500)
assert.equal((await state()).layout, 'Planta')
step('Enter steps from one layout to the next')

assert.deepEqual(errors, [], 'no page errors')
console.log('ALL OK')
await browser.close()
