import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { uploadFixture } from '../helpers/fileUpload'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const sheetFixturePath = path.resolve(
  currentDir,
  '..',
  'fixtures',
  'sheet_0.dxf'
)

async function loadSheet(page: Page) {
  await page.goto('/')
  await uploadFixture(page, sheetFixturePath, { initialView: 'Extents' })
  await expect(page.locator('.ml-cad-container')).toBeVisible({
    timeout: 120_000
  })
  await page.waitForTimeout(5000)
}

async function readPlateSceneState(page: Page) {
  return page.evaluate(() => {
    const mgr = (
      window as Window & {
        AcApDocManager?: {
          instance: {
            curDocument: {
              database: {
                tables: {
                  layerTable: {
                    getAt: (name: string) => { isOff: boolean; name: string } | null
                  }
                }
              }
              layerStore: {
                setLayerOn: (name: string, on: boolean) => boolean
              }
            }
            curView: {
              cadScene: {
                activeLayout: {
                  getLayer: (name: string) => {
                    visible: boolean
                    entityCount: number
                  } | undefined
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

    const plateLayer = mgr.curDocument.database.tables.layerTable.getAt('PLATE')
    const sceneLayer = mgr.curView.cadScene.activeLayout?.getLayer('PLATE')

    return {
      dbIsOff: plateLayer?.isOff,
      sceneVisible: sceneLayer?.visible,
      entityCount: sceneLayer?.entityCount ?? 0
    }
  })
}

test('PLATE layer visibility toggles database and scene layer group', async ({
  page
}) => {
  await loadSheet(page)

  const before = await readPlateSceneState(page)
  expect(before).not.toBeNull()
  expect(before?.entityCount).toBeGreaterThan(0)
  expect(before?.dbIsOff).toBe(false)
  expect(before?.sceneVisible).toBe(true)

  const toggledOff = await page.evaluate(() => {
    const mgr = (
      window as Window & { AcApDocManager?: { instance: unknown } }
    ).AcApDocManager?.instance as {
      curDocument: {
        layerStore: { setLayerOn: (name: string, on: boolean) => boolean }
      }
    }
    return mgr.curDocument.layerStore.setLayerOn('PLATE', false)
  })
  expect(toggledOff).toBe(true)

  await page.waitForTimeout(500)

  const afterOff = await readPlateSceneState(page)
  expect(afterOff?.dbIsOff).toBe(true)
  expect(afterOff?.sceneVisible).toBe(false)

  const toggledOn = await page.evaluate(() => {
    const mgr = (
      window as Window & { AcApDocManager?: { instance: unknown } }
    ).AcApDocManager?.instance as {
      curDocument: {
        layerStore: { setLayerOn: (name: string, on: boolean) => boolean }
      }
    }
    return mgr.curDocument.layerStore.setLayerOn('PLATE', true)
  })
  expect(toggledOn).toBe(true)

  await page.waitForTimeout(500)

  const afterOn = await readPlateSceneState(page)
  expect(afterOn?.dbIsOff).toBe(false)
  expect(afterOn?.sceneVisible).toBe(true)
})
