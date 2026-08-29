import { expect, test } from '@playwright/test'

/**
 * Regression: starting a measure command on a narrow viewport used to log
 * `ElementPlusError: [ElForm] unexpected width NaN` because the Measurement
 * ribbon units panel used `label-width="auto"` while overflow groups were hidden.
 */
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
})

test('measure distance does not log ElForm unexpected width NaN', async ({
  page
}) => {
  const formWidthWarnings: string[] = []
  page.on('console', message => {
    const text = message.text()
    if (text.includes('unexpected width NaN')) {
      formWidthWarnings.push(text)
    }
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'New Drawing' }).click()
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })

  await page.getByRole('tab', { name: 'Measurement' }).click()
  const commandInput = page.getByRole('textbox', { name: 'Type command' })
  await expect(commandInput).toBeVisible()
  await commandInput.fill('measuredistance')
  await commandInput.press('Enter')

  await expect(page.locator('.ml-ribbon-measure-units').first()).toBeAttached({
    timeout: 10_000
  })
  await page.waitForTimeout(400)

  expect(formWidthWarnings).toEqual([])
})
