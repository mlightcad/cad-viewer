jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcEdOpenMode: { Read: 0, Review: 4, Write: 8 },
  AcApDocManager: {},
  resolveDrawingExtents: () => undefined,
  acapRunDatabaseEdit: (
    db: { runDatabaseEdit: (label: string, fn: () => void) => void },
    label: string,
    fn: () => void
  ) => {
    db.runDatabaseEdit(label, fn)
  }
}))

import {
  AcDbBlockTableRecord,
  AcDbCircle,
  AcDbDatabase,
  AcDbLayerTableRecord,
  AcDbLine,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcEdOpenMode } from '../../cad-simple-viewer/src/editor/view/AcEdOpenMode'
import { executeCadScript } from '../src/script/executeCadScript'
import type { CadSession, CadSessionView } from '../src/session/CadSession'

const COUNT_SCRIPT = `
const counts = {}
for (const e of cad.entities.where(e => e.type === 'Circle')) {
  counts[e.layer] = (counts[e.layer] || 0) + 1
}
let top = ''
let max = -1
for (const [layer, count] of Object.entries(counts)) {
  if (count > max) { max = count; top = layer }
}
const ids = cad.entities.where(e => e.layer === top).map(e => e.id)
cad.selection.replace(ids)
return { counts, highlightLayer: top, count: max }
`

describe('executeCadScript', () => {
  test('stops an infinite loop', () => {
    const { session } = createFixture()
    const result = executeCadScript(
      { code: 'while (true) {}', intent: 'loop' },
      session,
      { limits: { maxTicks: 30, maxMilliseconds: 2_000 } }
    )
    expect(result.success).toBe(false)
    expect(result.error).toBe('script_timeout')
  })

  test('counts circles by layer and highlights the busiest layer', () => {
    const { session, db, selection } = createFixture()
    const walls = [...db.tables.blockTable.modelSpace.newIterator()]
      .filter(entity => entity.type === 'Circle' && entity.layer === 'Walls')
      .map(entity => entity.objectId)
      .sort()

    const result = executeCadScript(
      { code: COUNT_SCRIPT, intent: 'count circles' },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      counts: { '0': 1, Walls: 2 },
      highlightLayer: 'Walls',
      count: 2
    })
    expect([...selection.ids].sort()).toEqual(walls)
    expect([...(result.highlightedIds ?? [])].sort()).toEqual(walls)
  })

  test('copies snapshots only for entities the predicate accepts', () => {
    const { session, db } = createFixture()
    const line = [...db.tables.blockTable.modelSpace.newIterator()].find(
      entity => entity.type === 'Line'
    )
    if (!line) throw new Error('fixture line missing')
    const extents = jest.spyOn(line, 'geometricExtents', 'get')

    const result = executeCadScript(
      {
        code: `
          return cad.entities.where(e => e.type === 'Circle' && e.geometry.radius > 1)
            .map(e => e.geometry.radius)
        `,
        intent: 'large circles'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual([2])
    expect(extents).not.toHaveBeenCalled()
  })

  test('serializes the host without failing on toJSON', () => {
    const { session } = createFixture()
    const result = executeCadScript(
      { code: 'return cad', intent: 'inspect host' },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual(
      expect.objectContaining({
        log: 'function log',
        selection: expect.objectContaining({
          ids: [],
          entities: [],
          replace: 'function replace'
        })
      })
    )
    expect(result.data).not.toHaveProperty('__tick')
  })

  test('returns selection methods instead of an empty object', () => {
    const { session } = createFixture()
    const result = executeCadScript(
      { code: 'return cad.selection', intent: 'inspect selection' },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      ids: [],
      entities: [],
      replace: 'function replace',
      add: 'function add',
      remove: 'function remove',
      clear: 'function clear'
    })
  })

  test('resolves selection ids without scanning model space', () => {
    const { session, db, selection } = createFixture()
    const id = [...db.tables.blockTable.modelSpace.newIterator()][0].objectId
    selection.add(id)
    const iterator = jest.spyOn(db.tables.blockTable.modelSpace, 'newIterator')

    const result = executeCadScript(
      {
        code: `
          return {
            ids: cad.selection.ids,
            entities: cad.selection.entities
          }
        `,
        intent: 'lookup selection'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      ids: [id],
      entities: [expect.objectContaining({ id, type: 'Circle' })]
    })
    expect(iterator).not.toHaveBeenCalled()
  })

  test('rejects a write script on a read-only drawing', () => {
    const { session, db } = createFixture(AcEdOpenMode.Read)
    const spy = jest.spyOn(db, 'runDatabaseEdit')
    const before = countEntities(db)

    const result = executeCadScript(
      {
        code: `
          cad.edit.transaction('add', tx => {
            tx.drawCircle({ center: { x: 0, y: 0 }, radius: 4 })
          })
        `,
        intent: 'draw'
      },
      session
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('read_only')
    expect(spy).not.toHaveBeenCalled()
    expect(countEntities(db)).toBe(before)
  })

  test('groups script draws into one undo mark', () => {
    const { session, db } = createFixture()
    const before = countEntities(db)
    const spy = jest.spyOn(db, 'runDatabaseEdit')

    const result = executeCadScript(
      {
        code: `
          cad.edit.transaction('batch', tx => {
            tx.drawCircle({ center: { x: 1, y: 1 }, radius: 3 })
            tx.drawLine({ start: { x: 0, y: 0 }, end: { x: 5, y: 0 } })
          })
        `,
        intent: 'batch draw'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.entityIds).toHaveLength(2)
    expect(countEntities(db)).toBe(before + 2)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(db.transactionManager.undo()).toBe(true)
    expect(countEntities(db)).toBe(before)
  })

  test('reads every block, symbol table, and entity owner', () => {
    const { session, db } = createFixture()
    const block = new AcDbBlockTableRecord({ name: 'Widget' })
    db.tables.blockTable.add(block)
    const nested = new AcDbCircle(new AcGePoint3d(5, 5, 0), 3)
    nested.layer = '0'
    block.appendEntity(nested)

    const paper = new AcDbBlockTableRecord({ name: '*Paper_Space' })
    db.tables.blockTable.add(paper)
    const paperLine = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(8, 0, 0)
    )
    paper.appendEntity(paperLine)

    const result = executeCadScript(
      {
        code: `
          const widget = cad.blocks.find(block => block.name === 'Widget')
          const model = cad.blocks.find(block => block.isModelSpace)
          const owned = cad.entities.where(entity => entity.ownerId === widget.id)
          const paper = cad.entities.where(entity => {
            const owner = cad.blocks.find(block => block.id === entity.ownerId)
            return owner && owner.isPaperSpace
          })
          return {
            names: cad.blocks.map(block => block.name),
            widgetEntities: widget.entities.map(entity => entity.type),
            owned: owned.map(entity => ({ type: entity.type, ownerId: entity.ownerId })),
            modelCount: model.entities.length,
            allCount: cad.entities.where(() => true).length,
            layers: cad.tables.layerTable.records.map(record => record.name),
            hasPaper: cad.blocks.some(block => block.isPaperSpace),
            paperCount: paper.length
          }
        `,
        intent: 'inspect database'
      },
      session
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual(
      expect.objectContaining({
        widgetEntities: ['Circle'],
        owned: [{ type: 'Circle', ownerId: block.objectId }],
        modelCount: 4,
        hasPaper: true,
        paperCount: 1
      })
    )
    const data = result.data as {
      names: string[]
      allCount: number
      layers: string[]
    }
    expect(data.names).toEqual(
      expect.arrayContaining(['*Model_Space', '*Paper_Space', 'Widget'])
    )
    expect(data.allCount).toBe(6)
    expect(data.layers).toEqual(expect.arrayContaining(['Walls']))
  })
})

function createFixture(openMode = AcEdOpenMode.Write) {
  const db = new AcDbDatabase()
  db.tables.layerTable.add(new AcDbLayerTableRecord({ name: 'Walls' }))

  const origin = new AcDbCircle(new AcGePoint3d(0, 0, 0), 1)
  origin.layer = '0'
  const wallA = new AcDbCircle(new AcGePoint3d(10, 0, 0), 1)
  wallA.layer = 'Walls'
  const wallB = new AcDbCircle(new AcGePoint3d(20, 0, 0), 2)
  wallB.layer = 'Walls'
  const line = new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 0, 0))
  line.layer = '0'
  db.tables.blockTable.modelSpace.appendEntity(origin)
  db.tables.blockTable.modelSpace.appendEntity(wallA)
  db.tables.blockTable.modelSpace.appendEntity(wallB)
  db.tables.blockTable.modelSpace.appendEntity(line)

  const selection = new FakeSelection()
  const view: CadSessionView = {
    selectionSet: selection,
    zoomToFitDrawing() {
      return undefined
    },
    getDrawingExtents() {
      return undefined
    },
    search() {
      return []
    }
  }
  const session: CadSession = {
    getDocument: () => ({
      database: db,
      openMode,
      docTitle: 'fixture',
      layerStore: {
        getLayers: () =>
          [...db.tables.layerTable.newIterator()].map(layer => ({
            name: layer.name,
            isOn: !layer.isOff,
            isFrozen: layer.isFrozen,
            isLocked: false
          })),
        getCurrentLayerName: () => db.clayer
      },
      layerService: {
        setCurrentLayer: () => false,
        createLayers: () => ({ created: 0, existed: [] })
      },
      entityService: {
        eraseEntities: () => 0,
        getEntitiesByIds: () => [],
        translateEntities: () => 0,
        rotateEntities: () => 0
      }
    }),
    getView: () => view
  }
  return { session, db, selection }
}

function countEntities(db: AcDbDatabase): number {
  return [...db.tables.blockTable.modelSpace.newIterator()].length
}

class FakeSelection {
  private readonly selected = new Set<string>()

  get ids(): string[] {
    return [...this.selected]
  }

  add(value: string | readonly string[]): void {
    const ids = typeof value === 'string' ? [value] : value
    for (const id of ids) this.selected.add(id)
  }

  delete(value: string | readonly string[]): void {
    const ids = typeof value === 'string' ? [value] : value
    for (const id of ids) this.selected.delete(id)
  }

  clear(): void {
    this.selected.clear()
  }
}
