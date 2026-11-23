jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        showMessage: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
  }
  return {
    AcEdCommand,
    AcEdOpenMode: { Write: 'Write' }
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => `${key}:{count}`
  }
}))

jest.mock('../src/service', () => ({
  resolveSelectedEntities: jest.fn()
}))

import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbEntity,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbMInsertBlock,
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../src/app'
import {
  AcApExplodeCmd,
  acapExplodeEntities
} from '../src/command/modify/AcApExplodeCmd'
import { resolveSelectedEntities } from '../src/service'

const showMessage = AcApDocManager.instance.editor.showMessage as jest.Mock
const resolveSelected = resolveSelectedEntities as jest.Mock

const createDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

const createContext = (db: AcDbDatabase) => {
  const eraseEntities = jest.fn((ids: string[]) => {
    for (const block of db.tables.blockTable.newIterator()) {
      block.removeEntity(ids)
    }
    return ids.length
  })
  const context = {
    doc: { database: db, entityService: { eraseEntities } },
    view: { selectionSet: { clear: jest.fn() }, addEntity: jest.fn() }
  }
  return context as unknown as AcApContext & {
    doc: { entityService: { eraseEntities: jest.Mock } }
    view: { selectionSet: { clear: jest.Mock }; addEntity: jest.Mock }
  }
}

const createRectangle = () => {
  const pline = new AcDbPolyline()
  pline.addVertexAt(0, new AcGePoint2d(0, 0))
  pline.addVertexAt(1, new AcGePoint2d(10, 0))
  pline.addVertexAt(2, new AcGePoint2d(10, 5))
  pline.addVertexAt(3, new AcGePoint2d(0, 5))
  pline.closed = true
  return pline
}

const modelSpaceEntities = (db: AcDbDatabase) =>
  db.tables.blockTable.modelSpace.newIterator().toArray() as AcDbEntity[]

describe('AcApExplodeCmd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('replaces exploded entities by their parts and reports the rest', async () => {
    const db = createDb()
    const block = new AcDbBlockTableRecord()
    block.name = 'B'
    db.tables.blockTable.add(block)
    block.appendEntity(
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 0, 0))
    )

    const pline = createRectangle()
    const line = new AcDbLine(new AcGePoint3d(), new AcGePoint3d(5, 5, 0))
    const minsert = new AcDbMInsertBlock('B', 2, 2, 3, 3)
    const insert = new AcDbBlockReference('B')
    insert.position = new AcGePoint3d(100, 0, 0)
    db.tables.blockTable.modelSpace.appendEntity([pline, line, minsert, insert])

    const context = createContext(db)
    resolveSelected.mockResolvedValue({
      entities: [pline, line, minsert, insert],
      ids: [pline.objectId, line.objectId, minsert.objectId, insert.objectId]
    })

    await new AcApExplodeCmd().execute(context)

    expect(context.doc.entityService.eraseEntities).toHaveBeenCalledWith([
      pline.objectId,
      insert.objectId
    ])
    const remaining = modelSpaceEntities(db)
    expect(remaining).toContain(line)
    expect(remaining).toContain(minsert)
    expect(remaining).not.toContain(pline)
    expect(remaining).not.toContain(insert)
    // 4 polyline sides + 1 line from the block.
    const created = remaining.filter(e => e !== line && e !== minsert)
    expect(created).toHaveLength(5)
    expect(created.every(e => e instanceof AcDbLine)).toBe(true)
    expect(context.view.addEntity).toHaveBeenCalledWith(created)
    expect(context.view.selectionSet.clear).toHaveBeenCalled()

    expect(showMessage).toHaveBeenCalledWith('jig.explode.minsert:1', 'warning')
    expect(showMessage).toHaveBeenCalledWith(
      'jig.explode.notExplodable:1',
      'warning'
    )
  })

  it('does nothing when the selection is cancelled', async () => {
    const db = createDb()
    const context = createContext(db)
    resolveSelected.mockResolvedValue(undefined)
    await new AcApExplodeCmd().execute(context)
    expect(context.doc.entityService.eraseEntities).not.toHaveBeenCalled()
    expect(showMessage).not.toHaveBeenCalled()
  })

  it('appends parts to the block that owns the source entity', () => {
    const db = createDb()
    const block = new AcDbBlockTableRecord()
    block.name = 'OWNER'
    db.tables.blockTable.add(block)
    const pline = createRectangle()
    block.appendEntity(pline)

    const result = acapExplodeEntities(createContext(db), [pline])
    expect(result.explodedIds).toEqual([pline.objectId])
    expect(result.created).toHaveLength(4)
    const owned = block.newIterator().toArray()
    result.created.forEach(part => expect(owned).toContain(part))
    expect(modelSpaceEntities(db)).toHaveLength(0)
  })
})
