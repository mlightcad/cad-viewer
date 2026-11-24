import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

/**
 * TRIM / EXTEND on lines drawn into `empty.dxf` through the command line.
 */
const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'empty.dxf'
)

let viewerModuleUrl: string | undefined

test.beforeEach(async ({ page }) => {
  viewerModuleUrl = undefined
  page.on('request', request => {
    if (
      /cad-simple-viewer\/(src\/index\.ts|dist\/cad-simple-viewer\.js)/.test(
        request.url()
      )
    ) {
      viewerModuleUrl = request.url()
    }
  })
  await page.goto('/')
  await uploadFixture(page, fixture, { accessMode: 'Write' })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })
  await expect.poll(() => viewerModuleUrl).toBeTruthy()
})

async function enterInput(page: Page, value: string) {
  const commandInput = page.locator('input.ml-cli-text')
  await commandInput.fill(value)
  await commandInput.press('Enter')
  await page.waitForTimeout(200)
}

async function drawLine(page: Page, from: string, to: string) {
  await enterInput(page, 'line')
  await enterInput(page, from)
  await enterInput(page, to)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
}

/** Model-space LINE endpoints, sorted for stable comparisons. */
async function lines(page: Page): Promise<number[][]> {
  return page.evaluate(async url => {
    const mod = await import(/* @vite-ignore */ url)
    const db = mod.AcApDocManager.instance.curDocument.database
    const result: number[][] = []
    for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
      if (entity.dxfTypeName !== 'LINE') continue
      const s = entity.startPoint
      const e = entity.endPoint
      result.push([s.x, s.y, e.x, e.y].map(v => Math.round(v * 1000) / 1000))
    }
    return result.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
  }, viewerModuleUrl!)
}

/** Clicks the canvas at a WCS point. */
async function clickWorld(page: Page, x: number, y: number, shift = false) {
  const client = await page.evaluate(
    async ({ url, x, y }) => {
      const mod = await import(/* @vite-ignore */ url)
      const view = mod.AcApDocManager.instance.curView
      return view.canvasToViewport(view.worldToScreen({ x, y }))
    },
    { url: viewerModuleUrl!, x, y }
  )
  if (shift) await page.keyboard.down('Shift')
  await page.mouse.move(client.x, client.y)
  await page.mouse.click(client.x, client.y)
  if (shift) await page.keyboard.up('Shift')
  await page.waitForTimeout(200)
}

test('TRIM removes the picked segment between two cutting edges', async ({
  page
}) => {
  await drawLine(page, '0,0', '10,0')
  await drawLine(page, '3,-5', '3,5')
  await drawLine(page, '7,-5', '7,5')
  await enterInput(page, 'zoom')
  await enterInput(page, 'e')
  await expect.poll(() => lines(page)).toHaveLength(3)

  await enterInput(page, 'tr')
  await clickWorld(page, 5, 0)
  await page.keyboard.press('Escape')

  await expect
    .poll(() => lines(page))
    .toEqual([
      [0, 0, 3, 0],
      [3, -5, 3, 5],
      [7, -5, 7, 5],
      [7, 0, 10, 0]
    ])

  // The whole TRIM run is one undo step.
  await enterInput(page, 'undo')
  await expect.poll(() => lines(page)).toHaveLength(3)
})

test('EXTEND grows a line to the boundary; Shift-pick trims', async ({
  page
}) => {
  await drawLine(page, '0,0', '10,0')
  await drawLine(page, '20,-5', '20,5')
  await drawLine(page, '0,3', '30,3')
  await enterInput(page, 'zoom')
  await enterInput(page, 'e')
  await expect.poll(() => lines(page)).toHaveLength(3)

  await enterInput(page, 'ex')
  await clickWorld(page, 9, 0)
  // Shift-pick inside EXTEND trims the long line beyond the boundary.
  await clickWorld(page, 25, 3, true)
  await page.keyboard.press('Escape')

  await expect
    .poll(() => lines(page))
    .toEqual([
      [0, 0, 20, 0],
      [0, 3, 20, 3],
      [20, -5, 20, 5]
    ])
})

/** Draws a full ellipse from its axis end points and the other half axis. */
async function drawEllipse(page: Page, a: string, b: string, other: string) {
  await enterInput(page, 'ellipse')
  await enterInput(page, a)
  await enterInput(page, b)
  await enterInput(page, other)
  await page.waitForTimeout(200)
}

// Line y = 0 meets the 5 x 2 ellipse along (0.6, 0.8) at x = +-1/sqrt(0.1744).
const ELLIPSE_HIT = Math.round(1000 / Math.sqrt(0.1744)) / 1000

for (const [where, pickX, expected] of [
  ['left of', -8, [[-ELLIPSE_HIT, 0, 10, 0]]],
  [
    'inside',
    0,
    [
      [-10, 0, -ELLIPSE_HIT, 0],
      [ELLIPSE_HIT, 0, 10, 0]
    ]
  ],
  ['right of', 8, [[-10, 0, ELLIPSE_HIT, 0]]]
] as [string, number, number[][]][]) {
  test(`TRIM cuts a line ${where} a rotated ellipse at the ellipse`, async ({
    page
  }) => {
    await drawEllipse(page, '-3,-4', '3,4', '2')
    await drawLine(page, '-10,0', '10,0')
    await enterInput(page, 'zoom')
    await enterInput(page, 'e')
    await expect.poll(() => lines(page)).toHaveLength(1)

    await enterInput(page, 'tr')
    await clickWorld(page, pickX, 0)
    await page.keyboard.press('Escape')

    await expect.poll(() => lines(page)).toEqual(expected)
  })
}

test('TRIM cuts a line at the point where it touches a circle', async ({
  page
}) => {
  await enterInput(page, 'circle')
  await enterInput(page, '0,5')
  await enterInput(page, '5')
  await drawLine(page, '-10,0', '10,0')
  // Zoom to a window around the drawing instead of its extents: the line is
  // the bottom edge of the extents, so after ZOOM E it can sit on the canvas
  // border (under the command line) and the pick misses it.
  await enterInput(page, 'zoom')
  await enterInput(page, '-15,-8')
  await enterInput(page, '15,13')
  await expect.poll(() => lines(page)).toHaveLength(1)

  await enterInput(page, 'tr')
  await clickWorld(page, -8, 0)
  await page.keyboard.press('Escape')

  await expect.poll(() => lines(page)).toEqual([[0, 0, 10, 0]])
})
