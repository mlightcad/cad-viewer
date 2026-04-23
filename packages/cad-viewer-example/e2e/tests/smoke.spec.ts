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
const blockColorFixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'block-color.dxf'
)

async function uploadFixture(page: Page, filePath: string = fixturePath) {
  const fileInput = page.locator('input[type="file"]').first()
  await expect(fileInput).toBeAttached()
  await fileInput.setInputFiles(filePath)
}

async function getInsertInheritedColorPixelCounts(page: Page) {
  const canvas = page.locator('.ml-cad-container canvas').first()
  const pngBase64 = (await canvas.screenshot()).toString('base64')

  return await page.evaluate(async imageBase64 => {
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
    const imageData = ctx.getImageData(0, 0, probe.width, probe.height)
    const { data } = imageData
    const width = probe.width
    const height = probe.height

    const isNear = (
      r: number,
      g: number,
      b: number,
      tr: number,
      tg: number,
      tb: number,
      tolerance: number
    ) =>
      Math.abs(r - tr) <= tolerance &&
      Math.abs(g - tg) <= tolerance &&
      Math.abs(b - tb) <= tolerance

    const counts = {
      white: 0,
      yellow: 0,
      blue: 0,
      magenta: 0
    }

    // Sample every other pixel for speed. This still captures enough signal
    // for stable color-presence checks across CI environments.
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const index = (y * width + x) * 4
        const r = data[index]
        const g = data[index + 1]
        const b = data[index + 2]
        const a = data[index + 3]
        if (a < 220) continue

        if (isNear(r, g, b, 255, 255, 255, 30)) counts.white++
        if (isNear(r, g, b, 255, 255, 0, 45)) counts.yellow++
        if (isNear(r, g, b, 0, 128, 255, 70)) counts.blue++
        if (isNear(r, g, b, 255, 0, 255, 45)) counts.magenta++
      }
    }

    return counts
  }, pngBase64)
}

test('shows upload screen on first load', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.upload-screen')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Select CAD File to View' })
  ).toBeVisible()
})

test('loads local DXF and renders viewer shell', async ({ page }) => {
  await page.goto('/')
  await uploadFixture(page)

  await expect(page.locator('.ml-cad-viewer-container')).toBeVisible()
  await expect(page.locator('.ml-cad-container')).toBeVisible()

  const hasCanvas = await page
    .locator('.ml-cad-container canvas')
    .count()
    .then(count => count > 0)
  expect(hasCanvas).toBeTruthy()
})

test('supports basic mouse interactions without runtime errors', async ({
  page
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', error => {
    pageErrors.push(error.message)
  })

  await page.goto('/')
  await uploadFixture(page)
  await expect(page.locator('.ml-cad-container')).toBeVisible()

  const container = page.locator('.ml-cad-container')
  await container.hover()
  await page.mouse.wheel(0, -800)
  await page.waitForTimeout(250)
  await page.mouse.wheel(0, 700)
  await page.waitForTimeout(250)

  await page.mouse.move(640, 420)
  await page.mouse.down()
  await page.mouse.move(740, 470, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(250)

  await expect(page.locator('.ml-cad-viewer-container')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('keeps block layer-0 ByLayer entities inheriting INSERT layer colors', async ({
  page
}) => {
  await page.goto('/')
  await uploadFixture(page, blockColorFixturePath)

  const container = page.locator('.ml-cad-container')
  await expect(container).toBeVisible()
  await page.waitForTimeout(1200)

  const canvas = page.locator('.ml-cad-container canvas').first()
  await expect(canvas).toBeVisible()

  const colorCounts = await getInsertInheritedColorPixelCounts(page)
  expect(colorCounts.white).toBeGreaterThan(20)
  expect(colorCounts.yellow).toBeGreaterThan(20)
  expect(colorCounts.blue).toBeGreaterThan(20)
  expect(colorCounts.magenta).toBeGreaterThan(10)
})
