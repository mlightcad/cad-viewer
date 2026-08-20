jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApI18n: { currentLocale: 'en' }
}))

jest.mock('../src/AcExOsnapPrimitiveBuilder', () => ({
  buildOsnapCatalog: jest.fn(() => undefined)
}))

import type { AcTrScene } from '@mlightcad/cad-simple-viewer'
import type { AcDbDatabase } from '@mlightcad/data-model'

import {
  AcApHtmlSnapshotBuilder,
  listDatabaseLayouts
} from '../src/AcApHtmlSnapshotBuilder'

function fakeDatabase(
  layouts: Array<{
    layoutName: string
    tabOrder: number
    blockTableRecordId: string
  }>
) {
  return {
    objects: {
      layout: {
        newIterator: () => layouts[Symbol.iterator]()
      }
    },
    tables: {
      blockTable: {
        newIterator: () => [][Symbol.iterator]()
      }
    },
    extmin: { x: 0, y: 0 },
    extmax: { x: 10, y: 10 },
    insunits: 0,
    lunits: 2,
    luprec: 2,
    aunits: 0,
    auprec: 0,
    measurement: 1,
    ltscale: 1,
    angbase: 0,
    angdir: 0
  } as unknown as AcDbDatabase
}

function emptySceneLayout() {
  return { layers: new Map() }
}

function fakeScene(
  layoutIds: string[],
  activeLayoutBtrId: string,
  modelSpaceBtrId: string
) {
  const layouts = new Map(
    layoutIds.map(id => [id, emptySceneLayout()] as const)
  )
  return {
    layouts,
    layers: new Map(),
    activeLayoutBtrId,
    modelSpaceBtrId
  } as unknown as AcTrScene
}

describe('listDatabaseLayouts', () => {
  it('sorts layouts by tab order and keeps display names', () => {
    const database = fakeDatabase([
      { layoutName: 'Layout1', tabOrder: 2, blockTableRecordId: 'ps1' },
      { layoutName: 'Model', tabOrder: 1, blockTableRecordId: 'ms' },
      { layoutName: 'Layout2', tabOrder: 3, blockTableRecordId: 'ps2' }
    ])

    expect(listDatabaseLayouts(database).map(layout => layout.name)).toEqual([
      'Model',
      'Layout1',
      'Layout2'
    ])
  })
})

describe('AcApHtmlSnapshotBuilder', () => {
  it('exports every layout-table tab even when the scene is missing one', () => {
    const database = fakeDatabase([
      { layoutName: 'Layout1', tabOrder: 2, blockTableRecordId: 'ps1' },
      { layoutName: 'Model', tabOrder: 1, blockTableRecordId: 'ms' },
      { layoutName: 'Layout2', tabOrder: 3, blockTableRecordId: 'ps2' }
    ])
    const scene = fakeScene(['ms', 'ps1'], 'ms', 'ms')
    const snapshot = new AcApHtmlSnapshotBuilder().build(scene, database, {
      viewerMode: 'view'
    })

    expect(snapshot.layouts.map(layout => layout.btrId)).toEqual([
      'ms',
      'ps1',
      'ps2'
    ])
    expect(snapshot.layouts.map(layout => layout.name)).toEqual([
      'Model',
      'Layout1',
      'Layout2'
    ])
    expect(snapshot.layouts[0]?.isModelSpace).toBe(true)
    expect(snapshot.layouts[2]?.lineBatches).toEqual([])
    expect(snapshot.activeLayoutBtrId).toBe('ms')
  })
})
