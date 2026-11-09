import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
/**
 * One page with a Bezier circle, a 135° arc, a 2:1 ellipse, a 48-segment
 * flattened circle, a slot, a filled + stroked rectangle and an octagon.
 */
const dxfFixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'minimal-line.dxf'
)
const pdfFixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'pdf-curves.pdf'
)

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

async function entityTypeCounts(page: Page): Promise<Record<string, number>> {
  expect(viewerModuleUrl, 'viewer module url captured').toBeTruthy()
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const db = mod.AcApDocManager.instance.curDocument.database
    const counts: Record<string, number> = {}
    for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
      // Dev builds suffix class names (AcDbCircle2); normalize to DXF names.
      const type = entity.constructor.name
        .replace(/^AcDb|\d+$/g, '')
        .toUpperCase()
      counts[type] = (counts[type] ?? 0) + 1
    }
    return counts
  }, viewerModuleUrl!)
}

test('AI tab hosts the CAD Agent and the PDF tools', async ({ page }) => {
  await page.goto('/')
  // The PDF tools need Write mode, like every Write-only ribbon tab.
  await uploadFixture(page, dxfFixturePath, { accessMode: 'Write' })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })
  const baseline = await entityTypeCounts(page)

  // Ribbon buttons take their tooltip as accessible name, so address them
  // by their stable item id instead of the visible label.
  const ribbonButton = (id: string) =>
    page.locator(`[data-ribbon-button-id="${id}"]:visible`)

  // The agent button moved out of Home > Utilities.
  await page.getByRole('tab', { name: 'Home' }).click()
  await expect(ribbonButton('cmd-agent')).toHaveCount(0)

  await page.getByRole('tab', { name: 'AI' }).click()
  for (const id of ['cmd-ipdf', 'cmd-pdfscale', 'cmd-pdftext']) {
    await expect(ribbonButton(id)).toBeVisible()
  }
  await expect(ribbonButton('cmd-ipdf')).toContainText(/Import\s*PDF/)

  // Import PDF runs `ipdf` (lazy-loading the PDF plugin) and opens the picker.
  const chooserPromise = page.waitForEvent('filechooser')
  await ribbonButton('cmd-ipdf').click()
  const chooser = await chooserPromise
  await chooser.setFiles(pdfFixturePath)

  // Insertion point prompt: Enter accepts the origin.
  // The command line clears its placeholder while a prompt is active, so
  // address the input by class.
  const commandLine = page.locator('input.ml-cli-text')
  await expect(page.locator('.ml-cli-recent')).toContainText('Scale', {
    timeout: 20_000
  })
  await commandLine.focus()
  await page.keyboard.press('Enter')

  await expect
    .poll(
      async () =>
        ((await entityTypeCounts(page)).CIRCLE ?? 0) - (baseline.CIRCLE ?? 0),
      { timeout: 20_000 }
    )
    .toBe(2)
  const counts = await entityTypeCounts(page)
  expect((counts.ARC ?? 0) - (baseline.ARC ?? 0)).toBe(1)
  expect((counts.ELLIPSE ?? 0) - (baseline.ELLIPSE ?? 0)).toBe(1)
})
