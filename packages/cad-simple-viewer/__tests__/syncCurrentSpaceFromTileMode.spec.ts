import { AcDbBlockTableRecord } from '@mlightcad/data-model'

import {
  resolveActivePaperSpaceBtrId,
  syncCurrentSpaceFromTileMode
} from '../src/app/syncCurrentSpaceFromTileMode'

function createDatabase(options: {
  tilemode: boolean
  layouts: Array<{
    name: string
    btrId: string
    btrName: string
    tabSelected?: boolean
  }>
  currentSpaceId?: string
}) {
  const model = options.layouts.find(
    layout => layout.btrName === AcDbBlockTableRecord.MODEL_SPACE_NAME
  )
  if (!model) {
    throw new Error('test database needs a Model layout')
  }

  const byName = new Map(
    options.layouts.map(layout => [
      layout.btrName,
      { objectId: layout.btrId, name: layout.btrName }
    ])
  )
  const byId = new Map(
    options.layouts.map(layout => [
      layout.btrId,
      { objectId: layout.btrId, name: layout.btrName }
    ])
  )

  let currentSpaceId = options.currentSpaceId ?? model.btrId
  return {
    get tilemode() {
      return options.tilemode
    },
    get currentSpaceId() {
      return currentSpaceId
    },
    set currentSpaceId(value: string) {
      currentSpaceId = value
    },
    tables: {
      blockTable: {
        modelSpace: { objectId: model.btrId },
        getAt(name: string) {
          return byName.get(name)
        },
        getIdAt(id: string) {
          return byId.get(id)
        }
      }
    },
    objects: {
      layout: {
        *newIterator() {
          for (const layout of options.layouts) {
            yield {
              layoutName: layout.name,
              blockTableRecordId: layout.btrId,
              tabSelected: layout.tabSelected === true
            }
          }
        }
      }
    }
  }
}

describe('syncCurrentSpaceFromTileMode', () => {
  test('keeps model space when TILEMODE is on', () => {
    const db = createDatabase({
      tilemode: true,
      layouts: [
        {
          name: 'Model',
          btrId: 'model',
          btrName: '*Model_Space',
          tabSelected: true
        },
        {
          name: 'Sheet A1',
          btrId: 'paper',
          btrName: '*Paper_Space',
          tabSelected: true
        }
      ]
    })

    syncCurrentSpaceFromTileMode(db as never)
    expect(db.currentSpaceId).toBe('model')
  })

  test('opens on *Paper_Space when TILEMODE is off', () => {
    const db = createDatabase({
      tilemode: false,
      layouts: [
        {
          name: 'Model',
          btrId: 'model',
          btrName: '*Model_Space',
          tabSelected: true
        },
        {
          name: 'Sheet A1',
          btrId: 'paper',
          btrName: '*Paper_Space',
          tabSelected: true
        }
      ]
    })

    syncCurrentSpaceFromTileMode(db as never)
    expect(db.currentSpaceId).toBe('paper')
  })

  test('falls back to a tabSelected paper layout when *Paper_Space is absent', () => {
    const db = createDatabase({
      tilemode: false,
      layouts: [
        {
          name: 'Model',
          btrId: 'model',
          btrName: '*Model_Space'
        },
        {
          name: 'Sheet B',
          btrId: 'paper1',
          btrName: '*Paper_Space1',
          tabSelected: true
        }
      ]
    })

    expect(resolveActivePaperSpaceBtrId(db as never)).toBe('paper1')
    syncCurrentSpaceFromTileMode(db as never)
    expect(db.currentSpaceId).toBe('paper1')
  })
})
