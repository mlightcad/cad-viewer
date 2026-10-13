import { expect, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

/**
 * Optional real-drawing FIND check. The DWG is NOT committed (size / license):
 * point `B11L1_DWG` at a local path (e.g. `/path/to/B11L1.dwg`); the spec is
 * skipped when unset. Default CI covers FIND via the committed
 * `find-layouts.dxf` / `find-blocks.dxf` e2e fixtures instead — run this file
 * locally when validating against a production DWG (`B11L1_QUERY` defaults to
 * `PORW`).
 */
const dwg = process.env.B11L1_DWG
const query = process.env.B11L1_QUERY ?? 'PORW'
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

test.skip(!dwg, 'B11L1_DWG not set')
test.setTimeout(300_000)

test('FIND on a real DWG: Ctrl+F, search, click, layouts', async ({ page }) => {
  let viewerUrl: string | undefined
  const problems: string[] = []
  page.on('request', r => {
    if (
      /cad-simple-viewer\/(src\/index\.ts|dist\/cad-simple-viewer\.js)/.test(
        r.url()
      )
    )
      viewerUrl = r.url()
  })
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`))
  page.on('console', m => {
    if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico'))
      problems.push(`console: ${m.text()} @ ${m.location().url}`)
  })

  await page.goto('/')
  await uploadFixture(page, dwg!)
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 120_000
  })
  await expect
    .poll(() => page.locator('.ml-layout-tabs-button').count(), {
      timeout: 120_000
    })
    .toBeGreaterThan(0)
  await page.waitForTimeout(5000)
  const tabs = await page.locator('.ml-layout-tabs-button').allTextContents()
  console.log('TABS', JSON.stringify(tabs))

  await page
    .locator('.ml-cad-container')
    .click({ position: { x: 300, y: 300 } })
  await page.keyboard.press('Control+f')
  await expect(page.getByTestId('find-palette')).toBeVisible()
  await page.locator('input[data-testid="find-input"]').fill(query)
  await page.getByTestId('find-button').click()
  await page.waitForTimeout(1500)
  const rowsText = await page
    .getByTestId('find-row')
    .evaluateAll(els =>
      els.map(
        el =>
          `${el.querySelector('.ml-find-layout')?.textContent?.trim()} | ${el
            .querySelector('.ml-find-text')
            ?.textContent?.trim()}`
      )
    )
  const rowsAll = rowsText
  console.log('STATUS', await page.getByTestId('find-status').textContent())
  console.log('ROWS', rowsText.length, JSON.stringify(rowsText.slice(0, 40)))
  expect(rowsAll.length).toBeGreaterThan(0)
  // The query must hit real text whose row layout label is populated.
  const parsedRows = rowsText.map(r => {
    const [layout, ...text] = r.split(' | ')
    return { layout: layout.trim(), text: text.join(' | ') }
  })
  for (const r of parsedRows) {
    expect(r.layout, 'row layout label').not.toMatch(/^(|undefined)$/)
    expect(r.text.toLowerCase()).toContain(query.toLowerCase())
  }
  await expect(page.getByTestId('find-status')).toHaveText(/\d/)
  expect(viewerUrl).toBeTruthy()

  const state = () =>
    page.evaluate(async url => {
      const mod = await import(/* @vite-ignore */ url)
      const m = mod.AcApDocManager.instance
      const view = m.curView
      let layout = ''
      for (const l of m.curDocument.database.objects.layout.newIterator())
        if (l.blockTableRecordId === view.activeLayoutBtrId)
          layout = l.layoutName
      return {
        layout,
        selected: [...view.selectionSet.ids] as string[]
      }
    }, viewerUrl!)
  const activeTab = async () =>
    (
      await page
        .locator(
          '.ml-layout-tabs-button.active, .ml-layout-tabs-button[aria-selected="true"], .ml-layout-tabs-button.is-active'
        )
        .allTextContents()
    ).map(t => t.trim())
  const expectActiveTab = async (name: string) => {
    await expect
      .poll(activeTab, { timeout: 30000, message: `active tab is ${name}` })
      .toEqual([name])
  }

  // A text that exists in a paper-space layout (and is not in Model).
  const paperText = await page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const db = mod.AcApDocManager.instance.curDocument.database
    for (const l of db.objects.layout.newIterator()) {
      if (l.layoutName === 'Model') continue
      const btr = db.tables.blockTable.getIdAt(l.blockTableRecordId)
      for (const e of btr.newIterator()) {
        const t = (e.type === 'Text' ? e.textString : '') as string
        if (t && /^[A-Za-z]{5,}$/.test(t))
          return { layout: l.layoutName, text: t }
      }
    }
    return undefined
  }, viewerUrl!)
  console.log('PAPERTEXT', JSON.stringify(paperText))
  expect(paperText).toBeTruthy()

  const input = page.locator('input[data-testid="find-input"]')
  await input.fill(paperText!.text)
  await page.getByTestId('find-button').click()
  const paperRow = page
    .getByTestId('find-row')
    .filter({ hasText: paperText!.layout })
    .first()
  await expect(paperRow).toBeVisible()
  // Paper-space proof: result count and text, not only the LAYOUT label.
  const paperHits = await page.getByTestId('find-row').evaluateAll(els =>
    els.map(el => ({
      layout: el.querySelector('.ml-find-layout')?.textContent?.trim() ?? '',
      text: el.querySelector('.ml-find-text')?.textContent?.trim() ?? ''
    }))
  )
  const inPaper = paperHits.filter(h => h.layout === paperText!.layout)
  expect(inPaper.length, 'paper-space hits').toBeGreaterThan(0)
  expect(
    inPaper.every(h =>
      h.text.toLowerCase().includes(paperText!.text.toLowerCase())
    ),
    `paper hits: ${JSON.stringify(paperHits)} for ${paperText!.text}`
  ).toBe(true)
  expect(paperText!.layout).not.toBe('Model')
  await expect(page.getByTestId('find-status')).toHaveText(
    new RegExp(`${paperHits.length}\\b`)
  )
  await paperRow.click()
  await expect
    .poll(async () => (await state()).layout, { timeout: 30000 })
    .toBe(paperText!.layout)
  await page.waitForTimeout(2000)
  const afterPaper = await state()
  console.log(
    'AFTER_PAPER',
    JSON.stringify(afterPaper),
    JSON.stringify(await activeTab())
  )
  expect(afterPaper.selected.length).toBeGreaterThan(0)
  expect(afterPaper.layout).not.toBe('Model')
  await expectActiveTab(paperText!.layout)

  // paper -> Model
  await input.fill(query)
  await page.getByTestId('find-button').click()
  const modelRow = page.getByTestId('find-row').first()
  await expect(modelRow).toBeVisible()
  await modelRow.click()
  await expect
    .poll(async () => (await state()).layout, { timeout: 30000 })
    .toBe('Model')
  await page.waitForTimeout(2000)
  const afterModel = await state()
  console.log(
    'AFTER_MODEL',
    JSON.stringify(afterModel),
    JSON.stringify(await activeTab())
  )
  expect(afterModel.selected.length).toBeGreaterThan(0)
  expect(afterModel.layout).toBe('Model')
  await expectActiveTab('Model')

  // switch through every layout tab
  const n = await page.locator('.ml-layout-tabs-button').count()
  for (const name of [...tabs, 'Model']) {
    await page
      .locator('.ml-layout-tabs-button', {
        hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`)
      })
      .first()
      .click()
    await expect
      .poll(async () => (await state()).layout, { timeout: 30000 })
      .toBe(name)
    await page.waitForTimeout(1500)
    await expectActiveTab(name)
    console.log('TAB', name, JSON.stringify(await activeTab()))
  }
  expect(tabs.length).toBeGreaterThan(0)
  expect(n).toBe(tabs.length)
  expect((await state()).layout).toBe('Model')
  expect(problems, 'no page/console errors').toEqual([])
  await page.screenshot({
    path: process.env.B11L1_SHOT ?? 'test-results/b11l1.png'
  })
})
