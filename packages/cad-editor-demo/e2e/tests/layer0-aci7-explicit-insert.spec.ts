import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, type Page, test } from '@playwright/test'

import { uploadFixture } from '../helpers/fileUpload'

/**
 * Regression: a block entity authored on layer `0` with an explicit ACI-7
 * (foreground) colour must keep that colour inside an INSERT on a coloured
 * layer — AutoCAD keeps it white/black, it does not inherit the layer colour.
 *
 * The reported drawing has its title frame exactly like this: block `ASD96`
 * holds the frame on layer `0` as an explicit ACI-7 polyline with ByLayer
 * lineweight, and the INSERTs live on layer `1` (red). Three frame edges
 * rendered red. The ByLayer lineweight made the mapper treat the explicit
 * colour as layer-bound and promote it to the INSERT layer's material.
 *
 * Fixture: block `FRAMEBLK` on layer `0` = four explicit ACI-7 border lines
 * (frame) + one ByLayer diagonal. INSERT on layer `FRAME` (ACI 1 red).
 * Assertions read scene material colours, which are independent of AA and the
 * canvas clear colour.
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
  layer: string | undefined
  isByLayerColor: boolean | undefined
  isForeground: boolean | undefined
  key: string | undefined
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
                    getLayer: (name: string) =>
                      | {
                          internalObject: {
                            traverse: (cb: (obj: unknown) => void) => void
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
    const group = layout.getLayer('FRAME') ?? layout.getLayer('0')
    group?.internalObject.traverse((obj: unknown) => {
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
          layer: mat.userData?.layer as string | undefined,
          isByLayerColor: mat.userData?.isByLayerColor as boolean | undefined,
          isForeground: mat.userData?.isForeground as boolean | undefined,
          key
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

  // The explicit ACI-7 frame material survives inside the red-layer INSERT.
  const frameMaterial = materials.find(
    material =>
      material.isForeground === true && material.isByLayerColor === false
  )
  expect(frameMaterial).toBeDefined()
  expect(frameMaterial!.hex).not.toBe(RED)

  // No material carrying the layer-0 ACI-7 key may become red.
  const promoted = materials.filter(
    material => material.key?.includes('_7') === true && material.hex === RED
  )
  expect(promoted).toEqual([])
})
