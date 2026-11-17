import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Resolves a ribbon command control by its stable item id.
 *
 * Large buttons expose `data-ribbon-button-id`. Dropdowns (e.g. Recover Text)
 * only put the id on the item host as `data-item-id` with `type-dropdown`.
 * Prefer the button so Playwright strict mode does not see both nodes.
 */
export function ribbonCommand(page: Page, id: string): Locator {
  return page
    .locator(`[data-ribbon-button-id="${id}"]:visible`)
    .or(
      page.locator(
        `.ml-ribbon-item-host.type-dropdown[data-item-id="${id}"]:visible`
      )
    )
}

/**
 * Clicks a ribbon command by its stable item id.
 * At the default Desktop Chrome viewport some Home groups sit in the
 * overflow panel; open that first when the control is not yet visible.
 *
 * For dropdown items, clicks the primary icon so the default action runs
 * (same as choosing Auto on Recover Text) without opening the menu.
 */
export async function clickRibbonButton(page: Page, id: string) {
  const button = page.locator(`[data-ribbon-button-id="${id}"]:visible`)
  const dropdown = page.locator(
    `.ml-ribbon-item-host.type-dropdown[data-item-id="${id}"]:visible`
  )
  await expect(async () => {
    if ((await button.count()) === 0 && (await dropdown.count()) === 0) {
      const overflow = page.locator(
        'button.ml-ribbon-overflow-trigger:visible'
      )
      if ((await overflow.count()) > 0) {
        await overflow.first().click()
      }
    }
    await expect(ribbonCommand(page, id)).toBeVisible({ timeout: 3_000 })
  }).toPass({ timeout: 15_000 })

  if ((await button.count()) > 0) {
    await button.click()
    return
  }
  const dropdownIcon = dropdown.locator('.ml-ribbon-dropdown__icon')
  if ((await dropdownIcon.count()) > 0) {
    await dropdownIcon.click()
    return
  }
  await dropdown.click()
}
