import { expect, type Page } from '@playwright/test'

/**
 * Clicks a ribbon command by its stable `data-ribbon-button-id`.
 * At the default Desktop Chrome viewport some Home groups sit in the
 * overflow panel; open that first when the button is not yet visible.
 */
export async function clickRibbonButton(page: Page, id: string) {
  const button = page.locator(`[data-ribbon-button-id="${id}"]:visible`)
  await expect(async () => {
    if ((await button.count()) === 0) {
      const overflow = page.locator(
        'button.ml-ribbon-overflow-trigger:visible'
      )
      if ((await overflow.count()) > 0) {
        await overflow.first().click()
      }
    }
    await expect(button).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout: 15_000 })
  await button.click()
}
