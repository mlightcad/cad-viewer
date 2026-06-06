import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const shapeFixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'shape-entity.dxf'
)

async function uploadFixture(page: Page, filePath: string) {
  const fileInput = page.locator('input[type="file"]').first()
  await expect(fileInput).toBeAttached()
  await fileInput.setInputFiles(filePath)
}

async function waitForViewer(page: Page) {
  await expect(page.locator('.ml-cad-viewer-container')).toBeVisible({
    timeout: 30000
  })
  await expect(page.locator('.ml-cad-container canvas').first()).toBeVisible()
  // Allow DXF conversion, font loading, and batched rendering to settle.
  await page.waitForTimeout(2500)
}

/**
 * Counts non-background canvas pixels as a coarse signal that linework exists.
 */
async function countNonBackgroundPixels(page: Page) {
  const canvas = page.locator('.ml-cad-container canvas').first()
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

async function countShapeEntities(page: Page) {
  return page.evaluate(() => {
    const docManager = (
      window as Window & {
        AcApDocManager?: {
          instance?: {
            curDocument?: {
              database?: {
                tables: {
                  blockTable: {
                    modelSpace: {
                      newIterator: () => Iterable<{ dxfTypeName?: string }>
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
      docManager?.curDocument?.database?.tables.blockTable.modelSpace
    if (!modelSpace) {
      return 0
    }

    let count = 0
    for (const entity of modelSpace.newIterator()) {
      if (entity.dxfTypeName === 'SHAPE') {
        count++
      }
    }
    return count
  })
}

test('renders SHAPE entities from DXF', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', error => {
    pageErrors.push(error.message)
  })

  await page.goto('/')
  await uploadFixture(page, shapeFixturePath)
  await waitForViewer(page)

  expect(await countShapeEntities(page)).toBe(1)

  const shapePixels = await countNonBackgroundPixels(page)
  expect(shapePixels).toBeGreaterThan(500)
  expect(pageErrors).toEqual([])
})
