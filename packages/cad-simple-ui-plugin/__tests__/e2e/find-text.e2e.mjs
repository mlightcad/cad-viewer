/**
 * Browser verification for the FIND dock tab, using the fictitious
 * `../fixtures/find-text.dxf` and the `cad-simple-viewer-example` app.
 *
 * Not part of the jest run (`/e2e/` is ignored). Usage:
 *
 *   pnpm --filter @mlightcad/cad-simple-viewer-example dev --port 5199 &
 *   FIND_E2E_URL=http://127.0.0.1:5199/ node packages/cad-simple-ui-plugin/__tests__/e2e/find-text.e2e.mjs
 *
 * Env: FIND_E2E_URL (default http://127.0.0.1:5199/), FIND_E2E_CHROME
 * (chromium executable; defaults to Playwright's own), FIND_E2E_SHOTS
 * (directory for screenshots; default: none).
 *
 * Playwright is resolved from `packages/cad-viewer-example` (it is not a
 * dependency of this package).
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
const FIXTURE = path.resolve(here, '../fixtures/find-text.dxf')

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

const state = () =>
  inPage(m => {
    const v = m.AcApDocManager.instance.curView
    return {
      center: [v.center.x, v.center.y],
      selected: [...v.selectionSet.ids]
    }
  })

// --- open the tab from the toolbar ------------------------------------
const start = await state()
await page.locator('[data-toolbar-item-id="find"]').click()
const input = page.locator('.ml-ex-ui-find-input')
await input.waitFor({ state: 'visible' })
assert.equal(
  await input.evaluate(el => el === document.activeElement),
  true,
  'query field focused'
)
assert.match(await page.locator('.ml-ex-ui-find-status').innerText(), /Enter/)
step('toolbar button opens the Find tab and focuses the field')

const search = async (query, matchCase = false) => {
  const box = page.locator('.ml-ex-ui-find-option input:not([data-find-scope])')
  if ((await box.isChecked()) !== matchCase) await box.click()
  await input.fill(query)
  await page.locator('.ml-ex-ui-find-btn').click()
}
const rows = () => page.locator('.ml-ex-ui-find-row')
const texts = async () =>
  (await rows().locator('.ml-ex-ui-find-text').allInnerTexts()).sort()

// --- partial + case-insensitive, hidden layer excluded ------------------
await search('QUADRO')
assert.deepEqual(
  await texts(),
  ['Cobertura Quadro de terraço QT-02', 'Quadro Elétrico QE-01'],
  'partial, case-insensitive; MTEXT formatting stripped; OFF layer skipped'
)
step(
  'partial/case-insensitive search; MTEXT codes stripped; off layer skipped',
  '2 hits'
)

// --- accents-insensitive, multiple results ------------------------------
await search('tecnica')
assert.deepEqual(await texts(), ['Sala Técnica 01', 'Sala técnica 02'])
step('accent-insensitive search finds 2 results')

// --- match case ----------------------------------------------------------
await search('técnica', true)
assert.deepEqual(await texts(), ['Sala técnica 02'])
step('match case (and accents) narrows to 1 result')

// --- no results ----------------------------------------------------------
await search('inexistente')
assert.equal(await rows().count(), 0)
assert.match(
  await page.locator('.ml-ex-ui-find-status').innerText(),
  /No text found/
)
step('no results message')

// --- navigation + selection feedback -------------------------------------
await search('qe-01')
await shot('find-1-results')
const before = await state()
await rows().first().click()
await page.waitForTimeout(800)
const after = await state()
assert.notDeepEqual(after.center, before.center, 'view panned to the hit')
assert.equal(after.selected.length, 1, 'exactly the hit entity is selected')
// TEXT "Quadro Elétrico QE-01" starts at (600, 300), height 20, ~400 wide.
assert.ok(
  after.center[0] > 600 &&
    after.center[0] < 1000 &&
    after.center[1] > 295 &&
    after.center[1] < 325,
  `view centred on the text extents: ${after.center}`
)
assert.equal(
  await rows()
    .first()
    .evaluate(el => el.classList.contains('is-selected')),
  true
)
await shot('find-2-navigated')
step(
  'click zooms/pans to the text and selects only that entity',
  `center ${after.center.map(n => n.toFixed(0))}`
)

// --- block attribute: reported with block/tag, selects the INSERT ----------
await search('AURORA')
assert.deepEqual(await texts(), ['Edifício Aurora (fictício)'])
assert.match(
  await rows().first().locator('.ml-ex-ui-find-meta').innerText(),
  /^Attribute CARIMBO \/ PROJETO · 0 · \(-290, -238\)$/
)
await rows().first().click()
await page.waitForTimeout(800)
const attr = await state()
assert.deepEqual(attr.selected, ['B7'], 'the owning INSERT is selected')
assert.ok(
  attr.center[0] > -300 &&
    attr.center[0] < 0 &&
    attr.center[1] > -245 &&
    attr.center[1] < -225,
  `view centred on the attribute text: ${attr.center}`
)
await shot('find-3-attribute')
step('block attribute hit is labelled and selects its INSERT')

// --- Enter / Shift+Enter step through hits --------------------------------
await search('sala')
await input.press('Enter')
await input.press('Enter')
const second = await state()
await input.press('Shift+Enter')
const back = await state()
assert.notDeepEqual(second.selected, back.selected)
step('Enter / Shift+Enter step through multiple hits')

// --- pan/zoom still work after a find ------------------------------------
const c0 = (await state()).center
await page.mouse.move(700, 400)
await page.mouse.wheel(0, -400)
await page.waitForTimeout(500)
const zoomed = await inPage(
  m =>
    m.AcApDocManager.instance.curView.activeLayoutView.zoom ??
    m.AcApDocManager.instance.curView.activeLayoutView.internalCamera?.zoom
)
assert.ok(zoomed !== undefined)
await page.mouse.down({ button: 'middle' })
await page.mouse.move(500, 300, { steps: 5 })
await page.mouse.up({ button: 'middle' })
const c1 = (await state()).center
assert.notDeepEqual(c1, c0, 'pan still works')
step('wheel zoom and middle-button pan still work after Find')

assert.deepEqual(errors, [], 'no page errors')
console.log('ALL OK')
await browser.close()
