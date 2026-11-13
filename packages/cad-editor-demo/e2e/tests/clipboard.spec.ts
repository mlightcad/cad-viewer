import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'minimal-line.dxf'
)

type DocManagerWindow = Window & {
  AcApDocManager: {
    instance: {
      curDocument: {
        database: {
          tables: {
            blockTable: {
              modelSpace: {
                newIterator: () => Iterable<{ objectId: string }>
              }
            }
          }
        }
      }
      curView: {
        selectionSet: { add: (ids: string[]) => void; count: number }
        waitUntilIdle: (ms?: number) => Promise<boolean>
      }
      editor: { isActive: boolean }
    }
  }
}

async function loadFixture(page: Page) {
  await page.goto('/')
  await uploadFixture(page, fixturePath, { initialView: 'Extents' })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })
  await page.waitForFunction(
    () =>
      Boolean(
        (window as Window & { AcApDocManager?: { instance?: unknown } })
          .AcApDocManager?.instance
      ),
    undefined,
    { timeout: 30_000 }
  )
  await page.evaluate(() =>
    (
      window as unknown as DocManagerWindow
    ).AcApDocManager.instance.curView.waitUntilIdle(30_000)
  )
}

function modelSpaceCount(page: Page) {
  return page.evaluate(
    () =>
      Array.from(
        (
          window as unknown as DocManagerWindow
        ).AcApDocManager.instance.curDocument.database.tables.blockTable.modelSpace.newIterator()
      ).length
  )
}

/** Preselects every model space entity, as a user selection would. */
async function selectAll(page: Page) {
  await page.evaluate(() => {
    const mgr = (window as unknown as DocManagerWindow).AcApDocManager.instance
    const ids = Array.from(
      mgr.curDocument.database.tables.blockTable.modelSpace.newIterator()
    ).map(entity => entity.objectId)
    mgr.curView.selectionSet.add(ids)
  })
}

async function waitForCommandEnd(page: Page) {
  await page.waitForFunction(
    () =>
      !(window as unknown as DocManagerWindow).AcApDocManager.instance.editor
        .isActive,
    undefined,
    { timeout: 10_000 }
  )
}

test.describe('clipboard commands', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  })

  test('Ctrl+C / Ctrl+V pastes a copy, and undo removes it', async ({
    page
  }) => {
    await loadFixture(page)
    const initial = await modelSpaceCount(page)
    expect(initial).toBeGreaterThan(0)

    const commandInput = page.getByRole('textbox', { name: 'Type command' })
    await selectAll(page)
    await commandInput.focus()
    await page.keyboard.press('Control+C')
    await waitForCommandEnd(page)
    expect(await modelSpaceCount(page)).toBe(initial)

    await commandInput.focus()
    await page.keyboard.press('Control+V')
    const canvas = page.locator('.ml-cad-container canvas').first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas bounding box is unavailable')
    await page.waitForFunction(
      () =>
        (window as unknown as DocManagerWindow).AcApDocManager.instance.editor
          .isActive,
      undefined,
      { timeout: 10_000 }
    )
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
    await waitForCommandEnd(page)

    expect(await modelSpaceCount(page)).toBe(initial * 2)

    await commandInput.focus()
    await page.keyboard.press('Control+Z')
    await expect.poll(() => modelSpaceCount(page)).toBe(initial)
  })

  test('CUTCLIP removes the selection and PASTEORIG is refused in the source drawing', async ({
    page
  }) => {
    await loadFixture(page)
    const initial = await modelSpaceCount(page)

    const commandInput = page.getByRole('textbox', { name: 'Type command' })
    await selectAll(page)
    await commandInput.focus()
    await page.keyboard.press('Control+X')
    await waitForCommandEnd(page)
    await expect.poll(() => modelSpaceCount(page)).toBe(0)

    await commandInput.fill('pasteorig')
    await commandInput.press('Enter')
    await waitForCommandEnd(page)
    expect(await modelSpaceCount(page)).toBe(0)

    await commandInput.focus()
    await page.keyboard.press('Control+Z')
    await expect.poll(() => modelSpaceCount(page)).toBe(initial)
  })
})
