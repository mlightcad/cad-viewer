import { expect, test } from '@playwright/test'

test('landing page shows Aitra branding and keeps the mlightcad credit', async ({
  page,
  request
}) => {
  const missing: string[] = []
  page.on('response', r => {
    if (r.status() === 404) missing.push(r.url())
  })
  await page.goto('/')

  await expect(page).toHaveTitle('Aitra CadViewer')
  await expect(page.locator('.upload-brand')).toContainText('Aitra CadViewer')
  await expect(page.locator('.upload-brand-logo')).toBeVisible()
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Aitra CadViewer'
  )

  const credit = page.locator('.upload-credit a')
  await expect(credit).toBeVisible()
  await expect(credit).toHaveAttribute(
    'href',
    'https://github.com/mlightcad/cad-viewer'
  )
  await expect(credit).toContainText('mlightcad/cad-viewer')

  for (const href of await page
    .locator('link[rel~="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll(els => els.map(e => (e as HTMLLinkElement).href))) {
    expect((await request.get(href)).ok()).toBe(true)
  }
  expect(missing).toEqual([])
})
