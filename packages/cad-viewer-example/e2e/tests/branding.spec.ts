import {
  expect,
  test,
  type APIRequestContext,
  type Page
} from '@playwright/test'

const PRODUCTION_SUBPATH = '/cad-viewer/cad-viewer/'

async function expectBranding(page: Page, request: APIRequestContext) {
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
}

function trackMissing(page: Page) {
  const missing: string[] = []
  page.on('response', r => {
    if (r.status() === 404) missing.push(r.url())
  })
  return missing
}

test('landing page shows Aitra branding and keeps the mlightcad credit', async ({
  page,
  request
}) => {
  const missing = trackMissing(page)
  await page.goto('/')
  await expectBranding(page, request)
  expect(missing).toEqual([])
})

test.describe('390px viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('brand and credit stay visible, inside the viewport and tappable', async ({
    page,
    request
  }) => {
    const missing = trackMissing(page)
    await page.goto('/')
    await expectBranding(page, request)

    for (const selector of ['.upload-brand', '.upload-credit a']) {
      const box = await page.locator(selector).boundingBox()
      expect(box, selector).not.toBeNull()
      expect(box!.x, selector).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width, selector).toBeLessThanOrEqual(390)
    }
    // Same 44px touch target the M2 spec promises for the credit link.
    const creditBox = await page.locator('.upload-credit a').boundingBox()
    expect(creditBox!.height).toBeGreaterThanOrEqual(44)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true)
    expect(missing).toEqual([])
  })
})

test.describe('production subpath', () => {
  test(`branding works when served under ${PRODUCTION_SUBPATH}`, async ({
    page,
    request,
    baseURL
  }) => {
    // The dev server only serves the app at "/". Map the production subpath
    // onto it so the page is loaded from the same URL shape as production.
    await page.route(`**${PRODUCTION_SUBPATH}**`, async route => {
      const url = new URL(route.request().url())
      url.pathname = url.pathname.replace(PRODUCTION_SUBPATH, '/')
      await route.fulfill({ response: await route.fetch({ url: url.href }) })
    })
    const missing = trackMissing(page)
    await page.goto(`${baseURL}${PRODUCTION_SUBPATH}`)
    expect(new URL(page.url()).pathname).toBe(PRODUCTION_SUBPATH)
    await expectBranding(page, request)
    expect(missing).toEqual([])
  })
})
