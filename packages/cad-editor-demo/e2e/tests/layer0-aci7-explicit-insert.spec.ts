import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

/**
 * Regression: a block entity authored on layer `0` with an explicit ACI-7
 * (foreground) colour must keep that colour inside an INSERT on a coloured
 * layer. AutoCAD keeps an explicit ACI-7 white/black; only a ByLayer colour
 * inherits the INSERT layer.
 *
 * The reported drawing holds its title frame on layer `0` as an explicit ACI-7
 * polyline with ByLayer lineweight, and the INSERTs live on a red layer. Three
 * frame edges rendered red instead of white.
 *
 * These assertions read scene material metadata rather than pixel colours, so
 * they do not depend on antialiasing, canvas clear colour, or frame timing.
 *
 * Fixture: block `FRAMEBLK` on layer `0` = four explicit ACI-7 border lines
 * (frame) + one ByLayer diagonal. INSERT on layer `FRAME` (ACI 1 red).
 */
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'layer0-aci7-explicit-insert.dxf'
)

const RED = 0xff0000

type SceneMaterial = {
  hex: number
  key: string | undefined
  isByLayerColor: boolean | undefined
  isForeground: boolean | undefined
  hasColorProvenance: boolean | undefined
}

async function waitForViewer(page: Page) {
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 60_000
  })
  await expect(page.locator('.ml-cad-container canvas').first()).toBeVisible()
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const v = (
            window as Window & {
              AcApDocManager?: {
                instance?: { curView?: { isConvertingEntities?: boolean } }
              }
            }
          ).AcApDocManager?.instance?.curView
          return !!v && v.isConvertingEntities !== true
        }),
      { timeout: 60_000 }
    )
    .toBe(true)
  await page.waitForTimeout(3000)
}

async function readMaterials(page: Page): Promise<SceneMaterial[]> {
  return page.evaluate(() => {
    const view = (
      window as Window & {
        AcApDocManager?: {
          instance?: {
            curView?: {
              cadScene?: {
                layouts?: Map<
                  unknown,
                  {
                    getLayer: (
                      name: string
                    ) =>
                      | {
                          internalObject: {
                            traverse: (cb: (o: unknown) => void) => void
                          }
                        }
                      | undefined
                  }
                >
                modelSpaceBtrId?: unknown
              }
            }
          }
        }
      }
    ).AcApDocManager?.instance?.curView

    const layouts = view?.cadScene?.layouts
    if (!layouts) return []
    const layout = layouts.get(view?.cadScene?.modelSpaceBtrId)
    if (!layout) return []

    const rows: SceneMaterial[] = []
    const seen = new Set<string>()
    layout.internalObject.traverse((obj: unknown) => {
      const material = (obj as { material?: unknown }).material as
        | {
            color?: { getHex?: () => number }
            userData?: Record<string, unknown>
          }
        | Array<{
            color?: { getHex?: () => number }
            userData?: Record<string, unknown>
          }>
        | undefined
      if (!material) return
      for (const mat of Array.isArray(material) ? material : [material]) {
        const key = mat.userData?.materialKey as string | undefined
        if (key == null || seen.has(key)) continue
        seen.add(key)
        const hex = mat.color?.getHex?.()
        if (typeof hex !== 'number') continue
        rows.push({
          hex,
          key,
          isByLayerColor: mat.userData?.isByLayerColor as boolean | undefined,
          isForeground: mat.userData?.isForeground as boolean | undefined,
          hasColorProvenance: mat.userData?.hasColorProvenance as
            | boolean
            | undefined
        })
      }
    })
    return rows
  })
}

test('explicit ACI-7 block colour on layer 0 does not inherit the INSERT layer', async ({
  page
}) => {
  await page.goto('/')
  await uploadFixture(page, fixturePath)
  await waitForViewer(page)

  const materials = await readMaterials(page)
  expect(materials.length).toBeGreaterThan(0)

  // The explicit ACI-7 frame material keeps its own colour: it must not report
  // itself as ByLayer (that is what caused the red frame) and must not be red.
  const frameMaterial = materials.find(
    material =>
      material.isForeground === true && material.isByLayerColor === false
  )
  expect(frameMaterial).toBeDefined()
  expect(frameMaterial!.hex).not.toBe(RED)

  // No ACI-7 foreground material may have been rebound to the red INSERT layer.
  const promoted = materials.filter(
    material => material.isForeground === true && material.hex === RED
  )
  expect(promoted).toEqual([])
})
