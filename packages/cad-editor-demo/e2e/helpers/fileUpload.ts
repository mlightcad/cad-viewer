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
  // Prefer the landing drop-zone input; other hidden file inputs may exist.
  const fileInput = page
    .locator('.file-open-host input[type="file"], input[type="file"]')
    .first()
  await expect(fileInput).toBeAttached({ timeout: 30_000 })
  await selectAccessMode(page, options?.accessMode ?? 'Write')
  await selectInitialViewMode(page, options?.initialView ?? 'Extents')
  await expect(
    page.getByRole('radio', {
      name: new RegExp(`^${options?.initialView ?? 'Extents'}\\b`)
    })
  ).toBeChecked()
  await fileInput.setInputFiles(filePath)
}
