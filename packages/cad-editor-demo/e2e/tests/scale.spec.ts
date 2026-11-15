import { expect, type Page, test } from '@playwright/test'

import { selectAccessMode } from '../helpers/fileUpload'

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

type LineEnds = { start: number[]; end: number[] }

/** Reads the endpoints of every model-space line. */
async function readLines(page: Page): Promise<LineEnds[]> {
  expect(viewerModuleUrl, 'viewer module url captured').toBeTruthy()
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const db = mod.AcApDocManager.instance.curDocument.database
    const lines: LineEnds[] = []
    for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
      if (!entity.startPoint || !entity.endPoint) continue
      lines.push({
        start: [entity.startPoint.x, entity.startPoint.y],
        end: [entity.endPoint.x, entity.endPoint.y]
      })
    }
    return lines
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
  // Not by role name: the "Type command" placeholder is cleared while a
  // command prompt is active, so the accessible name changes mid-command.
  const commandInput = page.locator('input.ml-cli-text')
  await commandInput.fill(value)
  await commandInput.press('Enter')
  await page.waitForTimeout(300)
}

test.describe('SCALE command', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await selectAccessMode(page, 'Write')
    // Retried: on a cold dev server the first click can land before the
    // page has hydrated and is lost.
    await expect(async () => {
      await page.getByRole('button', { name: 'New Drawing' }).click()
      await expect(page.locator('.ml-cad-container')).toBeVisible({
        timeout: 10_000
      })
    }).toPass({ timeout: 60_000 })
    // A single LINE from (0,0) to (100,0).
    await enterInput(page, 'line')
    await enterInput(page, '0,0')
    await enterInput(page, '100,0')
    await enterInput(page, '')
    await expect
      .poll(() => readLines(page))
      .toEqual([{ start: [0, 0], end: [100, 0] }])
  })

  test('Home > Modify > Scale scales the selection about the base point', async ({
    page
  }) => {
    await page.getByRole('tab', { name: 'Home' }).click()
    const scaleButton = page.locator(
      '[data-ribbon-button-id="cmd-scale"]:visible'
    )
    await expect(scaleButton).toBeVisible()
    await expect(scaleButton).toContainText('Scale')
    // Copy lives in the Clipboard panel; Scale took its slot in Modify.
    await expect(
      page.locator('[data-ribbon-button-id="cmd-copy"]')
    ).toHaveCount(0)
    await expect(scaleButton).toHaveCount(1)

    await selectAll(page)
    await scaleButton.click()
    await page.waitForTimeout(300)
    // Base point at the line's end, factor 2: the start moves away from it.
    await enterInput(page, '100,0')
    await enterInput(page, '2')

    await expect
      .poll(() => readLines(page))
      .toEqual([{ start: [-100, 0], end: [100, 0] }])
  })

  test('Copy and Reference options keep the original and use new/ref length', async ({
    page
  }) => {
    await selectAll(page)
    await enterInput(page, 'sc')
    await enterInput(page, '0,0')
    await enterInput(page, 'C')
    await enterInput(page, 'R')
    // Reference length 100 -> new length 50: factor 0.5.
    await enterInput(page, '100')
    await enterInput(page, '50')

    await expect.poll(() => readLines(page)).toHaveLength(2)
    const lines = await readLines(page)
    expect(lines).toContainEqual({ start: [0, 0], end: [100, 0] })
    expect(lines).toContainEqual({ start: [0, 0], end: [50, 0] })
  })
})
