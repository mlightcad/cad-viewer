import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

/**
 * BSEARCH (Smart Blocks: Search and Convert) on `bsearch-symbols.dxf`:
 * symbol A (the selection), B (translated), C (rotated 90°), D (label R2
 * instead of R1) and a decoy with a longer leaf.
 */
const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'bsearch-symbols.dxf'
)

let viewerModuleUrl: string | undefined

test.beforeEach(async ({ page }) => {
  viewerModuleUrl = undefined
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

/** Model-space entity counts by type (AcDbLine2 → LINE). */
async function entityTypes(page: Page): Promise<Record<string, number>> {
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const db = mod.AcApDocManager.instance.curDocument.database
    const counts: Record<string, number> = {}
    for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
      const type = entity.constructor.name
        .replace(/^AcDb|\d+$/g, '')
        .toUpperCase()
      counts[type] = (counts[type] ?? 0) + 1
    }
    return counts
  }, viewerModuleUrl!)
}

/** Attribute values of the references to `blockName`, sorted. */
async function attributeValues(page: Page, blockName: string) {
  return page.evaluate(
    async ({ url, blockName }) => {
      const mod = await import(/* @vite-ignore */ url)
      const db = mod.AcApDocManager.instance.curDocument.database
      const values: string[] = []
      for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
        if (entity.blockName !== blockName) continue
        for (const attr of entity.attributeIterator()) {
          values.push(`${attr.tag}=${attr.textString}`)
        }
      }
      return values.sort()
    },
    { url: viewerModuleUrl!, blockName }
  )
}

/** Preselects symbol A (everything inside x, y < 20). */
async function selectSymbolA(page: Page) {
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const manager = mod.AcApDocManager.instance
    const ids: string[] = []
    for (const entity of manager.curDocument.database.tables.blockTable.modelSpace.newIterator()) {
      const ext = entity.geometricExtents
      if (ext.max.x < 20 && ext.max.y < 20 && ext.min.y > -5) {
        ids.push(entity.objectId)
      }
    }
    manager.curView.selectionSet.clear()
    manager.curView.selectionSet.add(ids)
    return ids.length
  }, viewerModuleUrl!)
}

async function runCommand(page: Page, command: string) {
  await page.evaluate(
    async ({ url, command }) => {
      const mod = await import(/* @vite-ignore */ url)
      mod.AcApDocManager.instance.sendStringToExecute(command)
    },
    { url: viewerModuleUrl!, command }
  )
}

test('BSEARCH reviews matches and converts them into a block', async ({
  page
}) => {
  await page.goto('/')
  await uploadFixture(page, fixture, { accessMode: 'Write' })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })
  await expect.poll(() => viewerModuleUrl).toBeTruthy()
  await expect
    .poll(async () => (await entityTypes(page)).LINE ?? 0, { timeout: 30_000 })
    .toBe(10)

  expect(await selectSymbolA(page)).toBe(4)
  await page.getByRole('tab', { name: 'Insert' }).click()
  await page.locator('[data-ribbon-button-id="cmd-bsearch"]:visible').click()

  const bar = page.getByTestId('bsearch-review-bar')
  // B and C match; D differs in its text, the decoy in its geometry.
  await expect(page.getByTestId('bsearch-count')).toHaveText(
    '2 instances found, 2 included'
  )
  await bar.getByText('Text variations').click()
  await expect(page.getByTestId('bsearch-count')).toHaveText(
    '3 instances found, 3 included'
  )

  // Instances are ordered left to right: C (x = 0), B, D. Exclude C.
  await page.getByTestId('bsearch-next').click()
  await page.getByTestId('bsearch-include-current').click()
  await expect(page.getByTestId('bsearch-count')).toHaveText(
    '3 instances found, 2 included'
  )

  await page.getByTestId('bsearch-convert').click()
  const dialog = page.locator('.ml-base-dialog', { hasText: 'Convert to Block' })
  await expect(dialog).toBeVisible()
  await dialog.getByTestId('bconvert-name').fill('DOOR')
  await dialog.locator('.ml-bconvert-dlg__attr input').first().fill('ROOM')
  await dialog.getByRole('button', { name: 'OK' }).click()

  await expect
    .poll(async () => (await entityTypes(page)).BLOCKREFERENCE ?? 0, {
      timeout: 20_000
    })
    .toBe(3)
  await expect(bar).toBeHidden()
  expect(await attributeValues(page, 'DOOR')).toEqual([
    'ROOM=R1',
    'ROOM=R1',
    'ROOM=R2'
  ])
  // C and the decoy stay loose geometry.
  const counts = await entityTypes(page)
  expect(counts.LINE).toBe(4)
  expect(counts.TEXT).toBe(2)

  // The whole conversion is one undo step.
  await runCommand(page, 'undo')
  await expect
    .poll(async () => (await entityTypes(page)).BLOCKREFERENCE ?? 0)
    .toBe(0)
  expect((await entityTypes(page)).LINE).toBe(10)
})
