import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { uploadFixture } from '../helpers/fileUpload'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'nested-insert-layers.dxf'
)

type NestedInsertSceneState = {
  insertObjectId: string | null
  wallDb: { isOff: boolean; isFrozen: boolean } | null
  dimDb: { isOff: boolean; isFrozen: boolean } | null
  wallSceneVisible: boolean | undefined
  dimSceneVisible: boolean | undefined
  dimHasInsert: boolean
  dimEntityVisible: boolean | undefined
}

async function loadFixture(page: Page) {
  await page.goto('/')
  await uploadFixture(page, fixturePath, { initialView: 'Extents' })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 30_000
  })
  await page.waitForTimeout(1500)
}

async function readNestedInsertSceneState(
  page: Page
): Promise<NestedInsertSceneState | null> {
  return page.evaluate(() => {
    type LayerRecord = { isOff: boolean; isFrozen: boolean; name: string }
    type SceneLayer = {
      visible: boolean
      hasEntity: (objectId: string) => boolean
      getEntityVisible: (objectId: string) => boolean | undefined
    }

    const mgr = (
      window as Window & {
        AcApDocManager?: {
          instance: {
            curDocument: {
              database: {
                tables: {
                  layerTable: {
                    getAt: (name: string) => LayerRecord | null
                  }
                  blockTable: {
                    modelSpace: {
                      newIterator: () => Iterable<{
                        dxfTypeName?: string
                        objectId: string
                        layer: string
                      }>
                    }
                  }
                }
              }
            }
            curView: {
              cadScene: {
                activeLayout: {
                  getLayer: (name: string) => SceneLayer | undefined
                } | null
              }
            }
          }
        }
      }
    ).AcApDocManager?.instance

    if (!mgr) {
      return null
    }

    const modelSpace = mgr.curDocument.database.tables.blockTable.modelSpace
    let insertObjectId: string | null = null
    for (const entity of modelSpace.newIterator()) {
      if (entity.dxfTypeName === 'INSERT' && entity.layer === 'Wall') {
        insertObjectId = entity.objectId
        break
      }
    }

    const wallDb = mgr.curDocument.database.tables.layerTable.getAt('Wall')
    const dimDb = mgr.curDocument.database.tables.layerTable.getAt('DIM')
    const wallScene = mgr.curView.cadScene.activeLayout?.getLayer('Wall')
    const dimScene = mgr.curView.cadScene.activeLayout?.getLayer('DIM')

    return {
      insertObjectId,
      wallDb: wallDb
        ? { isOff: wallDb.isOff, isFrozen: wallDb.isFrozen }
        : null,
      dimDb: dimDb ? { isOff: dimDb.isOff, isFrozen: dimDb.isFrozen } : null,
      wallSceneVisible: wallScene?.visible,
      dimSceneVisible: dimScene?.visible,
      dimHasInsert: insertObjectId
        ? (dimScene?.hasEntity(insertObjectId) ?? false)
        : false,
      dimEntityVisible:
        insertObjectId != null
          ? dimScene?.getEntityVisible(insertObjectId)
          : undefined
    }
  })
}

async function setLayerOn(page: Page, layerName: string, isOn: boolean) {
  return page.evaluate(
    ({ name, on }) => {
      const mgr = (
        window as Window & {
          AcApDocManager?: {
            instance: {
              curDocument: {
                layerStore: {
                  setLayerOn: (layer: string, value: boolean) => boolean
                }
              }
            }
          }
        }
      ).AcApDocManager?.instance
      return mgr?.curDocument.layerStore.setLayerOn(name, on) ?? false
    },
    { name: layerName, on: isOn }
  )
}

async function setLayerFrozen(
  page: Page,
  layerName: string,
  frozen: boolean
) {
  return page.evaluate(
    ({ name, value }) => {
      const mgr = (
        window as Window & {
          AcApDocManager?: {
            instance: {
              curDocument: {
                layerStore: {
                  setLayerFrozen: (layer: string, value: boolean) => boolean
                }
              }
            }
          }
        }
      ).AcApDocManager?.instance
      return mgr?.curDocument.layerStore.setLayerFrozen(name, value) ?? false
    },
    { name: layerName, value: frozen }
  )
}

test('nested INSERT Off vs Freeze follows AutoCAD layer semantics', async ({
  page
}) => {
  await loadFixture(page)

  const initial = await readNestedInsertSceneState(page)
  expect(initial).not.toBeNull()
  expect(initial?.insertObjectId).toBeTruthy()
  expect(initial?.dimHasInsert).toBe(true)
  expect(initial?.dimEntityVisible).toBe(true)
  expect(initial?.wallDb?.isOff).toBe(false)
  expect(initial?.wallDb?.isFrozen).toBe(false)
  expect(initial?.dimSceneVisible).toBe(true)

  // Off Wall: nested geometry on DIM (layer-0 inherited to DIM) stays visible.
  expect(await setLayerOn(page, 'Wall', false)).toBe(true)
  await page.waitForTimeout(400)

  const afterOff = await readNestedInsertSceneState(page)
  expect(afterOff?.wallDb?.isOff).toBe(true)
  expect(afterOff?.wallDb?.isFrozen).toBe(false)
  expect(afterOff?.dimSceneVisible).toBe(true)
  expect(afterOff?.dimHasInsert).toBe(true)
  expect(afterOff?.dimEntityVisible).toBe(true)

  expect(await setLayerOn(page, 'Wall', true)).toBe(true)
  await page.waitForTimeout(400)

  // Freeze Wall: entire INSERT is hidden, including the DIM-only fragment.
  expect(await setLayerFrozen(page, 'Wall', true)).toBe(true)
  await page.waitForTimeout(400)

  const afterFreeze = await readNestedInsertSceneState(page)
  expect(afterFreeze?.wallDb?.isFrozen).toBe(true)
  expect(afterFreeze?.dimHasInsert).toBe(true)
  expect(afterFreeze?.dimEntityVisible).toBe(false)

  expect(await setLayerFrozen(page, 'Wall', false)).toBe(true)
  await page.waitForTimeout(400)

  const afterThaw = await readNestedInsertSceneState(page)
  expect(afterThaw?.wallDb?.isFrozen).toBe(false)
  expect(afterThaw?.dimEntityVisible).toBe(true)
})
