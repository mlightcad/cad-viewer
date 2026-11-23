import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'
import { clickRibbonButton } from '../helpers/ribbon'

/**
 * EXPLODE on `visible-lwpolylines-in-block.dxf`: one INSERT of a block that
 * holds a closed four-vertex LWPOLYLINE.
 */
const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'visible-lwpolylines-in-block.dxf'
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

/** Counts model-space entities by DXF type. */
async function entityTypes(page: Page): Promise<Record<string, number>> {
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const db = mod.AcApDocManager.instance.curDocument.database
    const counts: Record<string, number> = {}
    for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
      counts[entity.dxfTypeName] = (counts[entity.dxfTypeName] ?? 0) + 1
    }
    return counts
  }, viewerModuleUrl!)
}

/** Preselects every model-space entity, like a window selection. */
async function selectAll(page: Page) {
  await page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const mgr = mod.AcApDocManager.instance
    const ids: string[] = []
    for (const entity of mgr.curDocument.database.tables.blockTable.modelSpace.newIterator()) {
      ids.push(entity.objectId)
    }
    mgr.curView.selectionSet.add(ids)
  }, viewerModuleUrl!)
}

async function enterInput(page: Page, value: string) {
  const commandInput = page.locator('input.ml-cli-text')
  await commandInput.fill(value)
  await commandInput.press('Enter')
  await page.waitForTimeout(300)
}

test('EXPLODE breaks a block reference, then its polyline, and undoes', async ({
  page
}) => {
  await page.goto('/')
  await uploadFixture(page, fixture, { accessMode: 'Write' })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })
  await expect.poll(() => viewerModuleUrl).toBeTruthy()
  await expect
    .poll(() => entityTypes(page), { timeout: 30_000 })
    .toEqual({ INSERT: 1 })

  // Ribbon: Home > Modify > Explode explodes the INSERT one level.
  await page.getByRole('tab', { name: 'Home' }).click()
  await selectAll(page)
  await clickRibbonButton(page, 'cmd-explode')
  await expect.poll(() => entityTypes(page)).toEqual({ LWPOLYLINE: 1 })

  // Command line alias X explodes the polyline into its four sides.
  await selectAll(page)
  await enterInput(page, 'x')
  await expect.poll(() => entityTypes(page)).toEqual({ LINE: 4 })

  // Each EXPLODE is a single undo step.
  await enterInput(page, 'undo')
  await expect.poll(() => entityTypes(page)).toEqual({ LWPOLYLINE: 1 })
})

test('EXPLODE reports objects that cannot be exploded', async ({ page }) => {
  await page.goto('/')
  await uploadFixture(page, fixture, { accessMode: 'Write' })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })
  await expect.poll(() => viewerModuleUrl).toBeTruthy()
  await expect
    .poll(() => entityTypes(page), { timeout: 30_000 })
    .toEqual({ INSERT: 1 })

  await selectAll(page)
  await enterInput(page, 'explode')
  await selectAll(page)
  await enterInput(page, 'explode')
  await selectAll(page)
  await enterInput(page, 'explode')
  // Lines cannot be exploded: they stay and a message is shown.
  await expect.poll(() => entityTypes(page)).toEqual({ LINE: 4 })
  // The message is echoed both in the command line and as a notification.
  await expect(
    page.getByText('4 object(s) could not be exploded').first()
  ).toBeVisible()
})
