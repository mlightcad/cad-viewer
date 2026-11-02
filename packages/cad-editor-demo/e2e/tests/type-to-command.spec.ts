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

/**
 * Type-to-command: printable keys pressed on the canvas land in the command
 * line, Space confirms like Enter (and repeats the last command when idle),
 * and Esc hands focus back to the view.
 */
test('commands can be typed on the canvas and confirmed with Space', async ({
  page
}) => {
  await page.goto('/')
  const fileInput = page.locator('input[type="file"]').first()
  await expect(fileInput).toBeAttached()
  await fileInput.setInputFiles(fixturePath)
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30000
  })
  await page.waitForTimeout(1500)

  const canvas = page.locator('.ml-cad-container canvas').first()
  const box = await canvas.boundingBox()
  if (!box) {
    throw new Error('Canvas bounding box is unavailable')
  }
  // Click an empty corner so the view takes keyboard focus without picking
  // anything; retried because a cold dev server may still reload the page.
  const viewContainer = page.locator('.ml-cad-container')
  await expect(async () => {
    await page.mouse.click(box.x + box.width * 0.05, box.y + box.height * 0.1)
    await expect(viewContainer).toBeFocused({ timeout: 1000 })
  }).toPass()

  const commandInput = page.getByRole('textbox', { name: 'Type command' })
  const prompt = page.locator('.ml-cli-prompt')
  await expect(commandInput).not.toBeFocused()

  await page.keyboard.type('line')
  await expect(commandInput).toBeFocused()
  await expect(commandInput).toHaveValue('line')

  await page.keyboard.press('Space')
  await expect(prompt).not.toBeEmpty()

  await page.keyboard.press('Escape')
  await expect(prompt).toBeEmpty()
  await expect(commandInput).not.toBeFocused()

  // Space on the idle view repeats LINE.
  await page.keyboard.press('Space')
  await expect(prompt).not.toBeEmpty()
  await page.keyboard.press('Escape')
})
