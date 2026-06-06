import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const invisibleFixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'invisible-lwpolylines.dxf'
)
const visibleFixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'visible-lwpolylines.dxf'
)
const emptyFixturePath = path.resolve(currentDir, '..', 'fixtures', 'empty.dxf')
const invisibleInBlockFixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'invisible-lwpolylines-in-block.dxf'
)
const visibleInBlockFixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'visible-lwpolylines-in-block.dxf'
)

test.describe.configure({ mode: 'serial' })

async function uploadFixture(page: Page, filePath: string) {
  const fileInput = page.locator('input[type="file"]').first()
  await expect(fileInput).toBeAttached()
  await fileInput.setInputFiles(filePath)
}

/**
 * Counts non-background canvas pixels (any visible linework/fill).
 */
async function countNonBackgroundPixels(page: Page) {
  const canvas = page.locator('.ml-cad-container canvas').first()
  await expect(canvas).toBeVisible()
  const pngBase64 = (await canvas.screenshot()).toString('base64')

  return page.evaluate(async imageBase64 => {
    const image = new Image()
    image.src = `data:image/png;base64,${imageBase64}`
    await image.decode()

    const probe = document.createElement('canvas')
    probe.width = image.naturalWidth
    probe.height = image.naturalHeight
    const ctx = probe.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to create 2d context for screenshot probe')
    }

    ctx.drawImage(image, 0, 0)
    const { data } = ctx.getImageData(0, 0, probe.width, probe.height)

    let count = 0
    for (let i = 0; i < data.length; i += 8) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (a < 200) continue
      if (r + g + b > 60) count++
    }
    return count
  }, pngBase64)
}

async function loadCadViewer(page: Page, fixturePath: string) {
  await page.goto('/')
  await uploadFixture(page, fixturePath)
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30000
  })
  await page.waitForTimeout(2500)
}

/**
 * Regression: DXF group code 60 (entity invisible) must not render in the batched viewer.
 * Mirrors 1_dxf_4.dxf from currentCAD.com where all LWPOLYLINE entities use 60=1.
 */
async function readModelSpaceEntityVisibility(page: Page) {
  return page.evaluate(() => {
    const mgr = (
      window as Window & {
        AcApDocManager?: {
          instance: {
            curDocument: {
              database: {
                tables: {
                  blockTable: {
                    modelSpace: {
                      newIterator: () => Iterable<{
                        type: string
                        visibility: boolean
                      }>
                    }
                  }
                }
              }
            }
          }
        }
      }
    ).AcApDocManager?.instance
    const modelSpace =
      mgr?.curDocument?.database?.tables?.blockTable?.modelSpace
    if (!modelSpace?.newIterator) {
      return [] as Array<{ type: string; visibility: boolean }>
    }
    return [...modelSpace.newIterator()].map(entity => ({
      type: entity.type,
      visibility: entity.visibility
    }))
  })
}

test('honors DXF group code 60 entity visibility for LWPOLYLINE', async ({
  page
}) => {
  await loadCadViewer(page, emptyFixturePath)
  const emptyPixels = await countNonBackgroundPixels(page)

  await page.goto('/')
  await loadCadViewer(page, invisibleFixturePath)
  const invisibleEntities = await readModelSpaceEntityVisibility(page)
  expect(invisibleEntities.length).toBeGreaterThan(0)
  expect(invisibleEntities.every(entity => entity.visibility === false)).toBe(
    true
  )
  const invisiblePixels = await countNonBackgroundPixels(page)
  expect(invisiblePixels - emptyPixels).toBeLessThan(200)

  await page.goto('/')
  await loadCadViewer(page, visibleFixturePath)
  const visibleEntities = await readModelSpaceEntityVisibility(page)
  expect(visibleEntities.some(entity => entity.visibility === true)).toBe(true)
  const visiblePixels = await countNonBackgroundPixels(page)
  expect(visiblePixels - emptyPixels).toBeGreaterThan(400)
  expect(invisiblePixels).toBeLessThanOrEqual(emptyPixels + 250)
})

async function readBlockDefinitionVisibility(page: Page, blockName: string) {
  return page.evaluate(name => {
    const db = (
      window as Window & {
        AcApDocManager?: {
          instance: {
            curDocument: {
              database: {
                tables: {
                  blockTable: {
                    getAt: (n: string) => {
                      newIterator: () => Iterable<{ visibility: boolean }>
                    } | null
                  }
                }
              }
            }
          }
        }
      }
    ).AcApDocManager?.instance?.curDocument?.database
    const block = db?.tables?.blockTable?.getAt(name)
    if (!block?.newIterator) {
      return [] as boolean[]
    }
    return [...block.newIterator()].map(entity => entity.visibility)
  }, blockName)
}

test('honors DXF group code 60 for entities inside block definitions referenced by INSERT', async ({
  page
}) => {
  await loadCadViewer(page, emptyFixturePath)
  const emptyPixels = await countNonBackgroundPixels(page)

  await page.goto('/')
  await loadCadViewer(page, invisibleInBlockFixturePath)
  const blockVisibilities = await readBlockDefinitionVisibility(
    page,
    'INV_POLY_BLK'
  )
  expect(blockVisibilities).toEqual([false])
  const invisibleInsertPixels = await countNonBackgroundPixels(page)
  expect(invisibleInsertPixels - emptyPixels).toBeLessThan(200)

  await page.goto('/')
  await loadCadViewer(page, visibleInBlockFixturePath)
  expect(await readBlockDefinitionVisibility(page, 'VIS_POLY_BLK')).toEqual([
    true
  ])
  const visibleInsertPixels = await countNonBackgroundPixels(page)
  expect(visibleInsertPixels - emptyPixels).toBeGreaterThan(400)
  expect(invisibleInsertPixels).toBeLessThanOrEqual(emptyPixels + 250)
})
