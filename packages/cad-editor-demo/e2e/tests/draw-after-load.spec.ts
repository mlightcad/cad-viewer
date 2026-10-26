import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'minimal-line.dxf'
)

async function uploadFixture(page: Page) {
  const fileInput = page.locator('input[type="file"]').first()
  await expect(fileInput).toBeAttached()
  await fileInput.setInputFiles(fixturePath)
}

/**
 * Counts non-background canvas pixels. Used as a coarse signal that newly
 * committed linework is actually rendered, not only present in the scene graph.
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

/**
 * Regression for https://github.com/mlightcad/cad-viewer/issues/286
 *
 * Entities committed after the initial load must render without requiring a
 * camera change (pan/resize) to refresh the batched renderer.
 */
test('drawn lines appear immediately without panning the view', async ({
  page
}) => {
  await page.goto('/')
  await uploadFixture(page)
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30000
  })
  await page.waitForTimeout(1500)

  const beforeDraw = await countNonBackgroundPixels(page)

  const canvas = page.locator('.ml-cad-container canvas').first()
  const box = await canvas.boundingBox()
  if (!box) {
    throw new Error('Canvas bounding box is unavailable')
  }

  const commandInput = page.getByRole('textbox', { name: 'Type command' })
  await commandInput.click()
  await commandInput.fill('line')
  await commandInput.press('Enter')
  await page.waitForTimeout(300)

  const clickPoint = async (xRatio: number, yRatio: number) => {
    await page.mouse.click(
      box.x + box.width * xRatio,
      box.y + box.height * yRatio
    )
    await page.waitForTimeout(200)
  }

  await clickPoint(0.35, 0.55)
  await clickPoint(0.45, 0.45)
  await clickPoint(0.55, 0.55)
  await clickPoint(0.65, 0.45)
  await clickPoint(0.75, 0.55)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800)

  const afterDrawNoPan = await countNonBackgroundPixels(page)
  const gainWithoutPan = afterDrawNoPan - beforeDraw

  expect(gainWithoutPan).toBeGreaterThan(1000)
})
