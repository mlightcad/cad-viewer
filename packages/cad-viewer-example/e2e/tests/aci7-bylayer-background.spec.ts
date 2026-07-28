import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { uploadFixture } from '../helpers/fileUpload'

/**
 * Regression for https://github.com/mlightcad/cad-viewer/issues/464 —
 * ByLayer entities on ACI-7 layers must invert with `switchbg`. Without the
 * material/cache + layer-sync bridge, content stays white on a light canvas.
 *
 * Fixture: thick ByLayer lines on ACI-7 layer `0`, plus one explicit red line
 * that must remain red across theme flips. Assertions prefer scene material
 * colours (stable across AA/clear-colour) and use canvas pixels as a
 * coarse visibility check for the ByLayer invert.
 *
 * Entity-colour ACI-7 MTEXT foreground recovery is covered by unit tests in
 * `packages/three-renderer/__tests__/AcTrMTextColorUtil.spec.ts` and
 * `AcTrMTextAci7WorkerReconstruct.spec.ts` because headless CI cannot
 * reliably wait for worker/main-thread font rendering in this fixture.
 */
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'aci7-bylayer-background.dxf'
)

type ColorCounts = {
  black: number
  white: number
}

type SceneColorSummary = {
  backgroundColor: number | null
  layer0Colors: number[]
  redLayerColors: number[]
}

async function waitForViewer(page: Page) {
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 60_000
  })
  await expect(page.locator('.ml-cad-container canvas').first()).toBeVisible()
  await page.waitForTimeout(2500)
}

async function getCanvasColorCounts(page: Page): Promise<ColorCounts> {
  const canvas = page.locator('.ml-cad-container canvas').first()
  const pngBase64 = (await canvas.screenshot()).toString('base64')

  return page.evaluate(async imageBase64 => {
    const image = new Image()
    image.src = `data:image/png;base64,${imageBase64}`
    await image.decode()

    const probe = document.createElement('canvas')
    probe.width = image.naturalWidth
    probe.height = image.naturalHeight
    const ctx = probe.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to create 2d context for screenshot probe')
    }

    ctx.drawImage(image, 0, 0)
    const { data } = ctx.getImageData(0, 0, probe.width, probe.height)

    const isNear = (
      r: number,
      g: number,
      b: number,
      tr: number,
      tg: number,
      tb: number,
      tolerance: number
    ) =>
      Math.abs(r - tr) <= tolerance &&
      Math.abs(g - tg) <= tolerance &&
      Math.abs(b - tb) <= tolerance

    const counts: ColorCounts = { black: 0, white: 0 }

    for (let i = 0; i < data.length; i += 8) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (a < 200) continue

      if (isNear(r, g, b, 0, 0, 0, 45)) counts.black++
      else if (isNear(r, g, b, 255, 255, 255, 45)) counts.white++
    }

    return counts
  }, pngBase64)
}

async function readSceneColorSummary(page: Page): Promise<SceneColorSummary> {
  return page.evaluate(() => {
    const mgr = (
      window as Window & {
        AcApDocManager?: {
          instance?: {
            curView?: {
              backgroundColor?: number
              cadScene?: {
                activeLayout?: {
                  getLayer: (name: string) =>
                    | {
                        internalObject: {
                          traverse: (cb: (obj: unknown) => void) => void
                        }
                      }
                    | undefined
                } | null
              }
            }
          }
        }
      }
    ).AcApDocManager?.instance

    const summary: SceneColorSummary = {
      backgroundColor: mgr?.curView?.backgroundColor ?? null,
      layer0Colors: [],
      redLayerColors: []
    }

    const collect = (layerName: string, bucket: number[]) => {
      const layer = mgr?.curView?.cadScene?.activeLayout?.getLayer(layerName)
      if (!layer) return
      layer.internalObject.traverse((obj: unknown) => {
        const material = (
          obj as {
            material?:
              | { color?: { getHex?: () => number } }
              | Array<{ color?: { getHex?: () => number } }>
          }
        ).material
        if (!material) return
        const mats = Array.isArray(material) ? material : [material]
        for (const mat of mats) {
          const hex = mat.color?.getHex?.()
          if (typeof hex === 'number') {
            bucket.push(hex)
          }
        }
      })
    }

    collect('0', summary.layer0Colors)
    collect('RED', summary.redLayerColors)
    return summary
  })
}

async function runSwitchBg(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const mgr = (
      window as Window & {
        AcApDocManager?: {
          instance?: {
            sendStringToExecute?: (cmd: string) => void
          }
        }
      }
    ).AcApDocManager?.instance
    if (!mgr?.sendStringToExecute) {
      return false
    }
    mgr.sendStringToExecute('switchbg')
    return true
  })
}

test('switchbg inverts ACI-7 ByLayer content and leaves explicit colours (#464)', async ({
  page
}) => {
  await page.goto('/')
  await uploadFixture(page, fixturePath)
  await waitForViewer(page)

  const initial = await readSceneColorSummary(page)
  expect(initial.backgroundColor).not.toBeNull()
  expect(initial.layer0Colors.length).toBeGreaterThan(0)
  expect(initial.redLayerColors.length).toBeGreaterThan(0)

  // Dark canvas: ByLayer-on-ACI-7 resolves to white; explicit red stays red.
  expect(initial.layer0Colors.every(hex => hex === 0xffffff)).toBe(true)
  expect(initial.redLayerColors.every(hex => hex === 0xff0000)).toBe(true)

  const darkCounts = await getCanvasColorCounts(page)
  expect(darkCounts.white).toBeGreaterThan(20)

  expect(await runSwitchBg(page)).toBe(true)
  await page.waitForTimeout(1000)

  const light = await readSceneColorSummary(page)
  expect(light.backgroundColor).not.toBe(initial.backgroundColor)
  // Light canvas: ByLayer ACI-7 must flip to black (legible). Explicit red
  // must not be rewritten by the theme.
  expect(light.layer0Colors.every(hex => hex === 0x000000)).toBe(true)
  expect(light.redLayerColors.every(hex => hex === 0xff0000)).toBe(true)

  const lightCounts = await getCanvasColorCounts(page)
  expect(lightCounts.black).toBeGreaterThan(20)

  expect(await runSwitchBg(page)).toBe(true)
  await page.waitForTimeout(1000)

  const restored = await readSceneColorSummary(page)
  expect(restored.backgroundColor).toBe(initial.backgroundColor)
  expect(restored.layer0Colors.every(hex => hex === 0xffffff)).toBe(true)
  expect(restored.redLayerColors.every(hex => hex === 0xff0000)).toBe(true)

  const restoredCounts = await getCanvasColorCounts(page)
  expect(restoredCounts.white).toBeGreaterThan(20)
})
