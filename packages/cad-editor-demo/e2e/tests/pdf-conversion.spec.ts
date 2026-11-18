import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'
import { blockPaddleOcrModelDownloads } from '../helpers/paddleOcr'

const fixtures = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures'
)
const fixture = (name: string) => path.join(fixtures, name)

let viewerModuleUrl: string | undefined
/** Entities of the starter drawing, ignored by counts and selections. */
let baselineIds: string[] = []

test.beforeEach(async ({ page }) => {
  viewerModuleUrl = undefined
  // Import the same viewer module instance the app uses to read its state.
  page.on('request', request => {
    if (
      /cad-simple-viewer\/(src\/index\.ts|dist\/cad-simple-viewer\.js)/.test(
        request.url()
      )
    ) {
      viewerModuleUrl = request.url()
    }
  })
  await blockPaddleOcrModelDownloads(page)
})

async function modelSpaceIds(page: Page): Promise<string[]> {
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const db = mod.AcApDocManager.instance.curDocument.database
    return [...db.tables.blockTable.modelSpace.newIterator()].map(
      (e: { objectId: string }) => e.objectId
    )
  }, viewerModuleUrl!)
}

/**
 * Counts of entities added since the starter drawing, by DXF-like type name
 * (AcDbCircle2 → CIRCLE).
 */
async function entityTypes(page: Page): Promise<Record<string, number>> {
  expect(viewerModuleUrl, 'viewer module url captured').toBeTruthy()
  return page.evaluate(
    async ({ url, skip }) => {
      const mod = await import(/* @vite-ignore */ url)
      const db = mod.AcApDocManager.instance.curDocument.database
      const ignored = new Set(skip)
      const counts: Record<string, number> = {}
      for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
        if (ignored.has(entity.objectId)) continue
        const type = entity.constructor.name
          .replace(/^AcDb|\d+$/g, '')
          .toUpperCase()
        counts[type] = (counts[type] ?? 0) + 1
      }
      return counts
    },
    { url: viewerModuleUrl!, skip: baselineIds }
  )
}

async function textStrings(page: Page): Promise<string[]> {
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const db = mod.AcApDocManager.instance.curDocument.database
    const texts: string[] = []
    for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
      if (typeof entity.textString === 'string') texts.push(entity.textString)
    }
    return texts.sort()
  }, viewerModuleUrl!)
}

/**
 * Preselects model-space entities, optionally only those whose extents lie
 * inside a box (model-space mm).
 */
async function preselect(
  page: Page,
  box?: { maxX: number; maxY: number }
): Promise<number> {
  return page.evaluate(
    async ({ url, box, skip }) => {
      const mod = await import(/* @vite-ignore */ url)
      const manager = mod.AcApDocManager.instance
      const ignored = new Set(skip)
      const ids: string[] = []
      for (const entity of manager.curDocument.database.tables.blockTable.modelSpace.newIterator()) {
        if (ignored.has(entity.objectId)) continue
        const ext = entity.geometricExtents
        if (box && !(ext && ext.max.x < box.maxX && ext.max.y < box.maxY)) {
          continue
        }
        ids.push(entity.objectId)
      }
      manager.curView.selectionSet.clear()
      manager.curView.selectionSet.add(ids)
      return ids.length
    },
    { url: viewerModuleUrl!, box, skip: baselineIds }
  )
}

const ribbonButton = (page: Page, id: string) =>
  page
    .locator(`[data-ribbon-button-id="${id}"]:visible`)
    .or(
      page.locator(
        `.ml-ribbon-item-host.type-dropdown[data-item-id="${id}"]:visible`
      )
    )

/** Starts PDFTEXT via the Recover Text ribbon control (dropdown → Auto). */
async function clickPdfText(page: Page) {
  const host = page.locator(
    '.ml-ribbon-item-host.type-dropdown[data-item-id="cmd-pdftext"]:visible'
  )
  await expect(host).toBeVisible()
  // Icon click runs the default Auto action without opening the menu.
  await host.locator('.ml-ribbon-dropdown__icon').click()
}

/** Opens a drawing in Write mode and imports a PDF fixture at the origin. */
async function importPdf(
  page: Page,
  pdf: string,
  options: { recognizeDimensions?: boolean } = {}
) {
  await page.goto('/')
  await uploadFixture(page, fixture('minimal-line.dxf'), {
    accessMode: 'Write'
  })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })
  baselineIds = await modelSpaceIds(page)

  await page.getByRole('tab', { name: 'AI' }).click()
  const chooserPromise = page.waitForEvent('filechooser')
  await ribbonButton(page, 'cmd-pdfimport').click()
  await (await chooserPromise).setFiles(fixture(pdf))
  // Import PDF dialog: OK imports the first page at the origin.
  const dialog = page.locator('.ml-pdf-import-dialog')
  await expect(dialog).toBeVisible({ timeout: 20_000 })
  if (options.recognizeDimensions !== undefined) {
    await dialog
      .locator('.ml-pdf-import-suboption input[type="checkbox"]')
      .setChecked(options.recognizeDimensions)
  }
  await dialog.locator('.ml-pdf-import-ok').click()
  await expect
    .poll(async () => Object.keys(await entityTypes(page)).length, {
      timeout: 30_000
    })
    .toBeGreaterThan(0)
}

/** Text styles of the texts in model space. */
async function textStyles(page: Page): Promise<string[]> {
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const db = mod.AcApDocManager.instance.curDocument.database
    const styles = new Set<string>()
    for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
      if (typeof entity.textString === 'string') styles.add(entity.styleName)
    }
    return [...styles]
  }, viewerModuleUrl!)
}

/** Text inputs of the lines in the pdftext palette. */
const pdftextLines = (page: Page) => page.locator('.ml-pdftext-text')

test('pdftext converts stroke text in the palette, learning glyphs from one line', async ({
  page
}) => {
  await importPdf(page, 'pdf-stroke-text.pdf')
  await preselect(page)
  await clickPdfText(page)

  // The review panel opens in the palette with one row per line.
  await expect(pdftextLines(page)).toHaveCount(4, { timeout: 20_000 })
  await expect(page.locator('.ml-pdftext-panel')).toContainText('PDF_SHX')

  // Four lines share the glyphs T, H, E, L: typing the first is enough.
  const first = pdftextLines(page).first()
  await first.fill('THE HELL')
  await first.press('Enter')
  await expect(page.locator('.ml-pdftext-counter')).toContainText('4 of 4')
  await page.locator('.ml-pdftext-btn:not(.is-secondary)').click()

  await expect
    .poll(() => textStrings(page), { timeout: 20_000 })
    .toEqual(['HELL THE', 'LET', 'THE', 'THE HELL'])
  // SHX line text stays SHX text.
  expect(await textStyles(page)).toEqual(['PDF_SHX'])
  // Only the frame is left as geometry.
  const counts = await entityTypes(page)
  expect(counts.TEXT).toBe(4)
  expect(counts.POLYLINE).toBe(1)
  expect(counts.LINE ?? 0).toBe(0)
  await expect(page.locator('.ml-pdftext-panel')).toHaveCount(0)
})

test('pdftext changes nothing when the palette is cancelled', async ({
  page
}) => {
  await importPdf(page, 'pdf-stroke-text.pdf')
  const before = await entityTypes(page)
  await preselect(page)
  await clickPdfText(page)

  await expect(pdftextLines(page)).toHaveCount(4, { timeout: 20_000 })
  await pdftextLines(page).first().fill('THE HELL')
  await page.locator('.ml-pdftext-btn.is-secondary').last().click()

  await expect(page.locator('.ml-pdftext-panel')).toHaveCount(0)
  expect(await entityTypes(page)).toEqual(before)
  expect(await textStrings(page)).toEqual([])
})

test('pdfimport rebuilds repeated forms as blocks; BSEARCH converts inline copies', async ({
  page
}) => {
  await importPdf(page, 'pdf-blocks.pdf')
  // The Form XObject painted three times becomes one block with three refs.
  expect((await entityTypes(page)).BLOCKREFERENCE).toBe(3)

  // Inline flags (not forms) stay as loose geometry; Smart Blocks finds them.
  expect(await preselect(page, { maxX: 42, maxY: 130 })).toBe(3)
  await ribbonButton(page, 'cmd-ai-bsearch').click()
  const panel = page.getByTestId('bsearch-panel')
  await expect(panel).toBeVisible({ timeout: 20_000 })
  // PDF layers are by color; turn off Same layer like the old pdfblock default.
  await panel.getByText('Search options').click()
  await panel.getByText('Same layer').click()
  await expect(page.getByTestId('bsearch-count')).toHaveText(
    '2 instances found, 2 included',
    { timeout: 20_000 }
  )
  await page.getByTestId('bsearch-convert').click()
  const dialog = page.locator('.ml-base-dialog', {
    hasText: 'Convert to Block'
  })
  await expect(dialog).toBeVisible()
  await dialog.getByTestId('bconvert-name').fill('FLAG')
  await dialog.getByRole('button', { name: 'OK' }).click()

  await expect
    .poll(async () => (await entityTypes(page)).BLOCKREFERENCE, {
      timeout: 20_000
    })
    .toBe(6)
  const counts = await entityTypes(page)
  expect(Object.keys(counts)).toEqual(['BLOCKREFERENCE'])
})

test('pdfimport recognizes exploded dimensions by default', async ({
  page
}) => {
  await importPdf(page, 'pdf-dimensions.pdf')
  await expect
    .poll(async () => (await entityTypes(page)).ROTATEDDIMENSION ?? 0, {
      timeout: 20_000
    })
    .toBeGreaterThan(0)
})

/** Opens the dimensions fixture and runs PDFDIM over everything. */
async function startPdfDim(page: Page) {
  // Import leaves the dimensions exploded so PDFDIM has them to review.
  await importPdf(page, 'pdf-dimensions.pdf', { recognizeDimensions: false })
  await preselect(page)
  await ribbonButton(page, 'cmd-pdfdim').click()
  await expect(page.locator('.ml-pdfdim-row')).toHaveCount(5, {
    timeout: 20_000
  })
}

test('pdfdim turns exploded dimensions into dimension objects', async ({
  page
}) => {
  await startPdfDim(page)
  // Scope to the footer: the style-name "Create" button shares ml-pdfdim-btn.
  await page
    .locator('.ml-pdfdim-buttons .ml-pdfdim-btn:not(.is-secondary)')
    .click()
  await expect(page.locator('.ml-pdfdim-panel')).toHaveCount(0)

  await expect
    .poll(async () => (await entityTypes(page)).ROTATEDDIMENSION ?? 0, {
      timeout: 20_000
    })
    .toBe(4)
  const counts = await entityTypes(page)
  expect(counts.DIAMETRICDIMENSION).toBe(1)
  // The part outline and the circle stay; every dimension part is gone.
  expect(counts.TEXT ?? 0).toBe(0)
})

test('pdfdim changes nothing when the palette is cancelled', async ({
  page
}) => {
  await startPdfDim(page)
  const before = await entityTypes(page)

  await page.locator('.ml-pdfdim-buttons .ml-pdfdim-btn.is-secondary').click()
  await expect(page.locator('.ml-pdfdim-panel')).toHaveCount(0)

  const after = await entityTypes(page)
  expect(after.ROTATEDDIMENSION ?? 0).toBe(0)
  expect(after.DIAMETRICDIMENSION ?? 0).toBe(0)
  expect(after.TEXT).toBe(before.TEXT)
  expect(after.LINE).toBe(before.LINE)
})

test('pdfimport rebuilds pattern hatches from their strokes', async ({
  page
}) => {
  await importPdf(page, 'pdf-hatches.pdf')

  // 45° lines inside a drawn rectangle, and a 0°/90° grid with no outline:
  // both become hatches and none of their strokes stay as lines.
  await expect
    .poll(async () => (await entityTypes(page)).HATCH ?? 0, {
      timeout: 20_000
    })
    .toBe(2)
  const counts = await entityTypes(page)
  expect(counts.POLYLINE).toBe(1)
  expect(counts.LINE ?? 0).toBe(0)
})

/** Opens the hatch strokes fixture and runs PDFHATCH over everything. */
async function startPdfHatch(page: Page) {
  // ANSI36 strokes (dots dropped) and the walls around them, as PDFIMPORT
  // leaves them for a hatch in cathedral.pdf.
  await page.goto('/')
  await uploadFixture(page, fixture('pdf-hatch-strokes.dxf'), {
    accessMode: 'Write'
  })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })
  await expect
    .poll(async () => (await entityTypes(page)).LINE ?? 0, { timeout: 30_000 })
    .toBeGreaterThan(200)
  const before = await entityTypes(page)

  await page.getByRole('tab', { name: 'AI' }).click()
  await preselect(page)
  await ribbonButton(page, 'cmd-pdfhatch').click()
  // The review panel opens in the palette with one row per hatch.
  await expect(page.locator('.ml-pdfhatch-row')).toHaveCount(1, {
    timeout: 20_000
  })
  return before
}

test('pdfhatch rebuilds a hatch that a PDF left as strokes', async ({
  page
}) => {
  const before = await startPdfHatch(page)
  const row = page.locator('.ml-pdfhatch-row')
  await expect(row).toContainText('ANSI36')
  await expect(row).not.toHaveClass(/is-poor/)

  // Another pattern is refitted and flagged; switching back restores it.
  const pattern = page.locator('.ml-pdfhatch-pattern')
  await pattern.selectOption('predefined:ANSI31')
  await expect(row).toHaveClass(/is-poor/)
  await pattern.selectOption('predefined:ANSI36')
  await expect(row).not.toHaveClass(/is-poor/)

  await page.locator('.ml-pdfhatch-btn:not(.is-secondary)').click()
  await expect(page.locator('.ml-pdfhatch-panel')).toHaveCount(0)

  await expect
    .poll(async () => (await entityTypes(page)).HATCH ?? 0, {
      timeout: 20_000
    })
    .toBe(1)
  const after = await entityTypes(page)
  // About 200 strokes go; the walls and column outlines stay.
  expect(before.LINE - (after.LINE ?? 0)).toBeGreaterThan(150)
  expect(after.LINE ?? 0).toBeGreaterThan(10)
  expect(after.ARC).toBe(before.ARC)
})

test('pdfhatch changes nothing when the palette is cancelled', async ({
  page
}) => {
  const before = await startPdfHatch(page)

  await page
    .locator('.ml-pdfhatch-buttons .ml-pdfhatch-btn.is-secondary')
    .click()
  await expect(page.locator('.ml-pdfhatch-panel')).toHaveCount(0)

  const after = await entityTypes(page)
  expect(after.HATCH ?? 0).toBe(0)
  expect(after.LINE).toBe(before.LINE)
})
