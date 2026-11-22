import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

/**
 * `locked-layer-line.dxf`: one LINE (0,0)-(100,0) on layer `LOCKED`, which
 * is locked in the file (layer flag 4).
 */
const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'locked-layer-line.dxf'
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

async function enterInput(page: Page, value: string) {
  // Not by role name: the "Type command" placeholder is cleared while a
  // command prompt is active, so the accessible name changes mid-command.
  const commandInput = page.locator('input.ml-cli-text')
  await commandInput.fill(value)
  await commandInput.press('Enter')
  await page.waitForTimeout(300)
}

async function countLines(page: Page): Promise<number> {
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const db = mod.AcApDocManager.instance.curDocument?.database
    let count = 0
    if (!db) return count
    for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
      if (entity.type === 'Line') count++
    }
    return count
  }, viewerModuleUrl!)
}

async function selectionIds(page: Page): Promise<string[]> {
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    return [...mod.AcApDocManager.instance.curView.selectionSet.ids]
  }, viewerModuleUrl!)
}

/** Frames the line and returns the client point of its midpoint. */
async function locateLineMidpoint(page: Page) {
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const view = mod.AcApDocManager.instance.curView
    // Frame (0,-50)..(100,50) synchronously; zoomTo only reads the box size
    // and centre.
    view.zoomTo({
      getSize: (v: { x: number; y: number }) =>
        Object.assign(v, { x: 100, y: 100 }),
      getCenter: (v: { x: number; y: number }) =>
        Object.assign(v, { x: 50, y: 0 })
    })
    await new Promise(resolve => setTimeout(resolve, 500))
    const screen = view.worldToScreen({ x: 50, y: 0 })
    const rect = view.canvas.getBoundingClientRect()
    return { x: rect.left + screen.x, y: rect.top + screen.y }
  }, viewerModuleUrl!)
}

test.describe('Entities on locked layers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await uploadFixture(page, fixture)
    await expect(page.locator('.ml-cad-container canvas').first()).toBeVisible({
      timeout: 60_000
    })
    await expect.poll(() => viewerModuleUrl).toBeTruthy()
    await expect.poll(() => countLines(page), { timeout: 30_000 }).toBe(1)
  })

  test('can be picked and are shown read-only in the properties palette', async ({
    page
  }) => {
    const point = await locateLineMidpoint(page)

    await page.mouse.click(point.x, point.y)

    await expect.poll(() => selectionIds(page)).toHaveLength(1)
    // Opened after picking: the docked palette covers the canvas centre.
    await enterInput(page, 'properties')
    const palette = page.locator('.ml-entity-properties')
    await expect(palette.locator('.ml-entity-properties-table')).toBeVisible()
    await expect(palette).toContainText('LOCKED')
    // Locked entities render values as plain text, never as editors.
    await expect(palette.locator('.ml-readonly-value').first()).toBeVisible()
    await expect(palette.locator('.el-input-number')).toHaveCount(0)
    await expect(palette.locator('.el-select')).toHaveCount(0)
  })

  test('are still excluded from modify commands', async ({ page }) => {
    const point = await locateLineMidpoint(page)
    await page.mouse.click(point.x, point.y)
    await expect.poll(() => selectionIds(page)).toHaveLength(1)

    await enterInput(page, 'erase')

    await expect.poll(() => selectionIds(page)).toHaveLength(0)
    expect(await countLines(page)).toBe(1)
  })
})
