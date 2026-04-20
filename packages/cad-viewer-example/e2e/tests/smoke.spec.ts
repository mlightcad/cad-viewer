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
