import { expect, type Page } from '@playwright/test'

export async function selectAccessMode(
  page: Page,
  mode: 'Read' | 'Review' | 'Write'
) {
  await page.getByRole('radio', { name: new RegExp(`^${mode}\\b`) }).click()
}

export async function selectInitialViewMode(
  page: Page,
  mode: 'Auto' | 'Extents' | 'Saved'
) {
  await page.getByRole('radio', { name: new RegExp(`^${mode}\\b`) }).click()
}

/**
 * Uploads a fixture through the example app's open-options UI.
 *
 * Pixel-based e2e checks need {@link AcApOpenViewMode.Extents} so the full
 * drawing is framed; Write access mode alone defaults to Saved (VPORT) view.
 */
export async function uploadFixture(
  page: Page,
  filePath: string,
  options?: {
    accessMode?: 'Read' | 'Review' | 'Write'
    initialView?: 'Auto' | 'Extents' | 'Saved'
  }
) {
  const fileInput = page.locator('input[type="file"]').first()
  await expect(fileInput).toBeAttached()
  await selectAccessMode(page, options?.accessMode ?? 'Write')
  await selectInitialViewMode(page, options?.initialView ?? 'Extents')
  await fileInput.setInputFiles(filePath)
}
