import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
/** Blocks and layers with explicit ACI colours (red/green/…). */
const fixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'block-color.dxf'
)

/** Decodes every Flate stream in a PDF and returns the concatenated text. */
function pdfContentText(bytes: Buffer): string {
  const text = bytes.toString('latin1')
  const parts: string[] = []
  const streamRe = /stream\r?\n/g
  let match: RegExpExecArray | null
  while ((match = streamRe.exec(text))) {
    const start = match.index + match[0].length
    const end = text.indexOf('endstream', start)
    if (end < 0) break
    const raw = bytes.subarray(start, end)
    try {
      parts.push(inflateSync(raw).toString('latin1'))
    } catch {
      parts.push(raw.toString('latin1'))
    }
    streamRe.lastIndex = end + 'endstream'.length
  }
  return parts.join('\n')
}

/** Stroke colour operators (`r g b RG`) found in the page content. */
function strokeColors(content: string): string[] {
  return [...content.matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) RG\b/g)].map(
    m => `${m[1]} ${m[2]} ${m[3]}`
  )
}

async function exportPdfFromDialog(
  page: Page,
  colorLabel: RegExp
): Promise<Buffer> {
  const commandLine = page.locator('input[placeholder="Type command"]')
  await commandLine.click()
  await commandLine.fill('cpdf')
  await page.keyboard.press('Enter')

  const dialog = page.locator('.ml-export-pdf-dlg')
  await expect(dialog).toBeVisible()
  await dialog
    .locator('.ml-export-pdf-dlg__card', { hasText: colorLabel })
    .click()
  await expect(
    dialog.locator('.ml-export-pdf-dlg__card.is-selected', {
      hasText: colorLabel
    })
  ).toBeVisible()

  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 })
  await page.getByRole('button', { name: 'OK', exact: true }).click()
  const download = await downloadPromise
  const file = await download.path()
  return readFile(file)
}

test.describe('Export PDF dialog colour mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await uploadFixture(page, fixturePath)
    await expect(page.locator('.ml-cad-container')).toBeVisible({
      timeout: 30_000
    })
    await page.waitForTimeout(2000)
  })

  test('Color keeps entity colours', async ({ page }) => {
    const bytes = await exportPdfFromDialog(page, /^Color/)
    const colors = strokeColors(pdfContentText(bytes))
    expect(colors.length).toBeGreaterThan(0)
    expect(colors.some(c => c !== '0 0 0' && c !== '1 1 1')).toBe(true)
  })

  test('Monochrome paints all linework black', async ({ page }) => {
    const bytes = await exportPdfFromDialog(page, /^Monochrome/)
    const colors = strokeColors(pdfContentText(bytes))
    expect(colors.length).toBeGreaterThan(0)
    expect(colors.every(c => c === '0 0 0')).toBe(true)
  })
})
