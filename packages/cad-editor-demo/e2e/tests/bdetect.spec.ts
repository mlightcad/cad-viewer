import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

/**
 * BDETECT (Smart Blocks: Detect and Convert) on `bsearch-symbols.dxf`: four
 * copies of a door symbol (one rotated, one labelled R2 instead of R1) and a
 * decoy with a longer leaf. Without any selection, detection finds the four
 * copies as one group; converting it turns the labels into attributes.
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

async function runCommand(page: Page, command: string) {
  await page.evaluate(
    async ({ url, command }) => {
      const mod = await import(/* @vite-ignore */ url)
      mod.AcApDocManager.instance.sendStringToExecute(command)
    },
    { url: viewerModuleUrl!, command }
  )
}

test('BDETECT finds repeated symbols and converts them into a block', async ({
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

  await page.getByRole('tab', { name: 'Insert' }).click()
  await page.locator('[data-ribbon-button-id="cmd-bdetect"]:visible').click()

  const panel = page.getByTestId('bdetect-panel')
  await expect(page.getByTestId('bdetect-count')).toHaveText(
    '1 groups of repeated objects',
    { timeout: 30_000 }
  )
  const group = panel.getByTestId('bdetect-group')
  await expect(group).toHaveCount(1)
  // A, B, C and D (other label); the decoy's longer leaf keeps it out.
  await expect(group).toContainText('4 instances × 4 objects')
  await expect(group).toContainText('Attributes')

  // Selecting the group highlights all of its instances.
  await group.click()
  await expect(group).toHaveClass(/is-selected/)

  // Reviewing a group opens the Search and Convert tab; cancelling returns
  // to the detection list.
  await group.getByTestId('bdetect-review').click()
  const review = page.getByTestId('bsearch-panel')
  await expect(review.getByTestId('bsearch-match')).toHaveCount(3)
  await review.getByTestId('bsearch-cancel').click()
  await expect(review).toBeHidden()
  await expect(panel).toBeVisible()

  // el-input forwards data-testid to its native <input>, not the wrapper.
  await group.getByTestId('bdetect-name').fill('DOOR')
  await page.getByTestId('bdetect-convert').click()

  await expect
    .poll(async () => (await entityTypes(page)).BLOCKREFERENCE ?? 0, {
      timeout: 20_000
    })
    .toBe(4)
  expect(await attributeValues(page, 'DOOR')).toEqual([
    'TEXT1=R1',
    'TEXT1=R1',
    'TEXT1=R1',
    'TEXT1=R2'
  ])
  // The converted group leaves the list; only the decoy stays loose.
  await expect(group).toHaveCount(0)
  const counts = await entityTypes(page)
  expect(counts.LINE).toBe(2)
  expect(counts.TEXT).toBe(1)

  await page.getByTestId('bdetect-close').click()
  await expect(panel).toBeHidden()

  // The whole run is one undo step.
  await runCommand(page, 'undo')
  await expect
    .poll(async () => (await entityTypes(page)).BLOCKREFERENCE ?? 0)
    .toBe(0)
  expect((await entityTypes(page)).LINE).toBe(10)
})
