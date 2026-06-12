import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'minimal-line.dxf'
)

async function installWorkerSpy(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const OriginalWorker = Worker
    const createdWorkerUrls: string[] = []

    window.Worker = class extends OriginalWorker {
      constructor(scriptURL: string | URL, options?: WorkerOptions) {
        createdWorkerUrls.push(String(scriptURL))
        super(scriptURL, options)
      }
    } as typeof Worker
    ;(
      window as Window & { __createdWorkerUrls?: string[] }
    ).__createdWorkerUrls = createdWorkerUrls
  })
}

async function countMtextRendererWorkers(
  page: import('@playwright/test').Page
) {
  return page.evaluate(() => {
    const urls =
      (window as Window & { __createdWorkerUrls?: string[] })
        .__createdWorkerUrls ?? []
    return urls.filter(url => url.includes('mtext-renderer-worker')).length
  })
}

test('does not create mtext renderer workers when main thread is selected', async ({
  page
}) => {
  await installWorkerSpy(page)
  await page.goto('/')

  await page.getByRole('radio', { name: 'Main thread' }).click()
  await page.locator('input[type="file"]').first().setInputFiles(fixturePath)

  await expect(page.locator('.ml-cad-container')).toBeVisible()
  await page.waitForTimeout(1200)

  expect(await countMtextRendererWorkers(page)).toBe(0)
})

test('creates mtext renderer workers when web worker mode is selected', async ({
  page
}) => {
  await installWorkerSpy(page)
  await page.goto('/')

  await page.getByRole('radio', { name: 'Web worker' }).click()
  await page.locator('input[type="file"]').first().setInputFiles(fixturePath)

  await expect(page.locator('.ml-cad-container')).toBeVisible()
  await page.waitForTimeout(1200)

  expect(await countMtextRendererWorkers(page)).toBeGreaterThan(0)
})

test('web worker mode loads the worker script and renders linework', async ({
  page
}) => {
  const consoleErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await page.goto('/')
  await page.getByRole('radio', { name: 'Web worker' }).click()
  await page.locator('input[type="file"]').first().setInputFiles(fixturePath)

  await expect(page.locator('.ml-cad-container canvas').first()).toBeVisible()
  await page.waitForTimeout(1500)

  const workerScriptErrors = consoleErrors.filter(
    text =>
      text.includes('mtext-renderer-worker') ||
      text.includes('ReferenceError: e is not defined')
  )
  expect(workerScriptErrors, workerScriptErrors.join('; ')).toEqual([])

  const canvas = page.locator('.ml-cad-container canvas').first()
  const pngBase64 = (await canvas.screenshot()).toString('base64')
  const pixelCount = await page.evaluate(async imageBase64 => {
    const image = new Image()
    image.src = `data:image/png;base64,${imageBase64}`
    await image.decode()

    const probe = document.createElement('canvas')
    probe.width = image.naturalWidth
    probe.height = image.naturalHeight
    const ctx = probe.getContext('2d')
    if (!ctx) return 0

    ctx.drawImage(image, 0, 0)
    const { data } = ctx.getImageData(0, 0, probe.width, probe.height)

    let count = 0
    for (let i = 0; i < data.length; i += 8) {
      const alpha = data[i + 3]
      if (alpha < 200) continue
      if (data[i] + data[i + 1] + data[i + 2] > 60) count++
    }
    return count
  }, pngBase64)

  expect(pixelCount).toBeGreaterThan(20)
})
