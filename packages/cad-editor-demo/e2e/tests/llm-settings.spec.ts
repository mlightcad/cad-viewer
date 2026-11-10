import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const dxfFixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'minimal-line.dxf'
)

/** `localStorage` key of the shared AI model settings. */
const LLM_CONFIG_KEY = 'cad-agent-plugin.llm-config'

test('AI > Model Settings opens the shared LLM settings dialog', async ({
  page
}) => {
  await page.goto('/')
  await uploadFixture(page, dxfFixturePath, { accessMode: 'Write' })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })

  await page.getByRole('tab', { name: 'AI' }).click()
  const settingsButton = page.locator(
    '[data-ribbon-button-id="cmd-llmsettings"]:visible'
  )
  await expect(settingsButton).toBeVisible()
  await settingsButton.click()

  // `llmsettings` lazy-loads the plugin, then shows the framework-free dialog.
  const dialog = page.locator('.ml-llm-settings-dialog')
  await expect(dialog).toBeVisible({ timeout: 20_000 })
  await expect(dialog.locator('.ml-ui-dialog-title')).toHaveText(
    'AI Model Settings'
  )

  // Saving a key for the default built-in provider persists the config and
  // keeps the dialog open with a confirmation.
  await dialog.locator('input[type="password"]').fill('sk-e2e-test')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog.locator('.ml-llm-status')).toHaveText('Settings saved.')
  const stored = await page.evaluate(
    key => localStorage.getItem(key),
    LLM_CONFIG_KEY
  )
  expect(stored).toContain('"activeProviderId":"deepseek"')
  // The key is stored encrypted, never in plain text.
  expect(stored).not.toContain('sk-e2e-test')

  await dialog
    .locator('.ml-ui-dialog-footer')
    .getByRole('button', { name: 'Close', exact: true })
    .click()
  await expect(dialog).toHaveCount(0)
})
