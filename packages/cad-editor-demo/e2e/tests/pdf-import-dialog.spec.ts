import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

const fixtures = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures'
)
/** One page: a Bezier circle, an arc, an ellipse and a few polylines. */
const pdfFixture = path.join(fixtures, 'pdf-curves.pdf')

let viewerModuleUrl: string | undefined

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
})

/** Circles in model space: `[centerX, centerY, radius]`. */
async function circles(page: Page): Promise<number[][]> {
  expect(viewerModuleUrl, 'viewer module url captured').toBeTruthy()
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const db = mod.AcApDocManager.instance.curDocument.database
    const out: number[][] = []
    for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
      if (!/^AcDbCircle\d*$/.test(entity.constructor.name)) continue
      out.push([entity.center.x, entity.center.y, entity.radius])
    }
    return out.sort((a, b) => a[2] - b[2])
  }, viewerModuleUrl!)
}

/** Opens a Write-mode drawing, runs Import PDF and picks the fixture. */
async function openImportDialog(page: Page) {
  await page.goto('/')
  await uploadFixture(page, path.join(fixtures, 'minimal-line.dxf'), {
    accessMode: 'Write'
  })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })
  await page.getByRole('tab', { name: 'AI' }).click()
  const chooserPromise = page.waitForEvent('filechooser')
  await page.locator('[data-ribbon-button-id="cmd-pdfimport"]:visible').click()
  await (await chooserPromise).setFiles(pdfFixture)
  const dialog = page.locator('.ml-pdf-import-dialog')
  await expect(dialog).toBeVisible({ timeout: 20_000 })
  return dialog
}

test('Import PDF dialog shows the file and its first page', async ({
  page
}) => {
  const dialog = await openImportDialog(page)
  await expect(dialog.locator('.ml-pdf-import-file input')).toHaveValue(
    'pdf-curves.pdf'
  )
  await expect(dialog.locator('.ml-pdf-import-total')).toHaveText('Total: 1')
  await expect(dialog.locator('.ml-pdf-import-page')).toBeDisabled()
  await expect(dialog.locator('.ml-pdf-import-preview canvas')).toBeVisible()
  await expect(dialog.locator('.ml-pdf-import-pagesize')).toContainText(
    'Page size:'
  )

  // The thumbnail grid lists the single page.
  await dialog.getByRole('button', { name: 'Show page thumbnails' }).click()
  await expect(dialog.locator('.ml-pdf-import-thumb')).toHaveCount(1)
})

test('Cancel in the Import PDF dialog imports nothing', async ({ page }) => {
  const dialog = await openImportDialog(page)
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toHaveCount(0)
  await page.waitForTimeout(500)
  expect(await circles(page)).toEqual([])
})

test('Import PDF applies the dialog scale and insertion point', async ({
  page
}) => {
  const dialog = await openImportDialog(page)
  const numbers = dialog.locator('input.ml-pdf-import-number')
  // [page, X, Y, scale]
  await numbers.nth(1).fill('1000')
  await numbers.nth(2).fill('500')
  await numbers.nth(3).fill('2')
  await dialog.locator('.ml-pdf-import-ok').click()
  await expect.poll(async () => (await circles(page)).length).toBe(2)
  const scaled = await circles(page)

  // Same page at scale 1 from the origin: radii halve, centres move.
  const again = await openImportDialog(page)
  await again.locator('.ml-pdf-import-number').nth(3).fill('1')
  await again.locator('input.ml-pdf-import-number').nth(1).fill('0')
  await again.locator('input.ml-pdf-import-number').nth(2).fill('0')
  await again.locator('.ml-pdf-import-ok').click()
  await expect.poll(async () => (await circles(page)).length).toBe(2)
  const plain = await circles(page)
  for (let i = 0; i < plain.length; i++) {
    expect(scaled[i][2]).toBeCloseTo(plain[i][2] * 2, 3)
    expect(scaled[i][0]).toBeCloseTo(1000 + plain[i][0] * 2, 3)
    expect(scaled[i][1]).toBeCloseTo(500 + plain[i][1] * 2, 3)
  }
})

test('Import PDF asks for the insertion point when picked on screen', async ({
  page
}) => {
  const dialog = await openImportDialog(page)
  await dialog.getByLabel('Specify insertion point on-screen').check()
  await expect(
    dialog.locator('input.ml-pdf-import-number').nth(1)
  ).toBeDisabled()
  await dialog.locator('.ml-pdf-import-ok').click()

  await expect(page.locator('.ml-cli-recent')).toContainText(
    'Specify insertion point',
    { timeout: 20_000 }
  )
  const commandLine = page.locator('input.ml-cli-text')
  await commandLine.focus()
  await commandLine.fill('300,200')
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await circles(page)).length).toBe(2)
  for (const [x, y] of await circles(page)) {
    expect(x).toBeGreaterThan(300)
    expect(y).toBeGreaterThan(200)
  }
})

test('-pdfimport imports with command-line prompts and no dialog', async ({
  page
}) => {
  await page.goto('/')
  await uploadFixture(page, path.join(fixtures, 'minimal-line.dxf'), {
    accessMode: 'Write'
  })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })
  const commandLine = page.locator('input.ml-cli-text')
  await commandLine.focus()
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 30_000 })
  await commandLine.fill('-pdfimport')
  await page.keyboard.press('Enter')
  await (await chooserPromise).setFiles(pdfFixture)

  // Insertion point prompt with Scale / Mode options; Enter takes the origin.
  await expect(page.locator('.ml-cli-recent')).toContainText('Scale', {
    timeout: 20_000
  })
  await expect(page.locator('.ml-pdf-import-dialog')).toHaveCount(0)
  await commandLine.focus()
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await circles(page)).length).toBe(2)
})
