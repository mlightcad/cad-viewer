import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'minimal-line.dxf'
)

/**
 * Commands of lazily loaded plugins (here `ipdf` from the PDF plugin) exist
 * only after their plugin loads. Typing them on the command line must load
 * the plugin and run the command instead of reporting an unknown command,
 * and auto-completion must offer them before they are loaded.
 */
test('lazy plugin commands can be typed on the command line', async ({
  page
}) => {
  await page.goto('/')
  await uploadFixture(page, fixturePath, { accessMode: 'Write' })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })

  const commandLine = page.locator('input.ml-cli-text')
  await commandLine.focus()
  await commandLine.fill('ipd')
  await expect(
    page.locator('.ml-cli-cmd-popup .item[data-value="IPDF"]')
  ).toBeVisible()

  const chooserPromise = page.waitForEvent('filechooser', { timeout: 30_000 })
  await commandLine.fill('ipdf')
  await page.keyboard.press('Enter')
  // The PDF plugin loaded and `ipdf` opened its file picker.
  const chooser = await chooserPromise
  expect(chooser.isMultiple()).toBe(false)
  await expect(page.locator('.ml-cli-recent')).not.toContainText(
    'Unknown command'
  )
})
