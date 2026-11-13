jest.mock('../src/app', () => {
  const { AcApClipboard } = jest.requireActual('../src/app/AcApClipboard')
  return {
    AcApDocManager: {
      instance: {
        clipboard: new AcApClipboard(null),
        editor: {
          getPoint: jest.fn(),
          showMessage: jest.fn()
        },
        withBusyIndicator: async <T>(work: () => T | Promise<T>) => work()
      }
    }
  }
})

jest.mock('../src/editor', () => {
  const { AcApDocManager } = jest.requireMock('../src/app')

  class AcEdCommand {
    mode: unknown
    recordsUndoStack = true

    showMessage(message: string, type: string = 'info') {
      AcApDocManager.instance.editor.showMessage(message, type)
    }

    async withBusyIndicator<T>(work: () => T | Promise<T>) {
      return work()
    }
  }

  class AcEdPromptPointOptions {
    jig: unknown
    constructor(readonly message: string) {}
  }

  return {
    AcEdCommand,
    AcEdOpenMode: { Read: 'Read', Write: 'Write' },
    AcEdPromptPointOptions,
    AcEdPromptStatus: { OK: 'OK', Cancel: 'Cancel' }
  }
})

jest.mock('../src/service', () => ({
  resolveSelectedEntities: jest.fn()
}))

jest.mock('../src/i18n', () => ({
  AcApI18n: { t: (key: string) => key }
}))

import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbEntity,
  acdbHostApplicationServices,
  AcDbLine,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApDocManager } from '../src/app'
import { AcApContext } from '../src/app/AcApContext'
import {
  AcApCopyBaseCmd,
  AcApCopyClipCmd,
  AcApCutClipCmd,
  AcApPasteBlockCmd,
  AcApPasteClipCmd,
  AcApPasteOrigCmd
} from '../src/command/clipboard'
import { resolveSelectedEntities } from '../src/service'

const docManager = AcApDocManager.instance as unknown as {
  clipboard: { clear(): void }
  editor: { getPoint: jest.Mock; showMessage: jest.Mock }
}
const resolveSelected = resolveSelectedEntities as jest.Mock

const createDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  return db
}

const createContext = (database: AcDbDatabase) => {
  const eraseEntities = jest.fn()
  const clearSelection = jest.fn()
  const context = {
    doc: { database, entityService: { eraseEntities } },
    view: { selectionSet: { clear: clearSelection } }
  } as unknown as AcApContext
  return { context, eraseEntities, clearSelection }
}

const modelSpace = (db: AcDbDatabase) =>
  Array.from(db.tables.blockTable.modelSpace.newIterator())

const selectEntities = (entities: AcDbEntity[]) =>
  resolveSelected.mockResolvedValueOnce({
    entities,
    ids: entities.map(entity => entity.objectId)
  })

const pickPoint = (x: number, y: number) =>
  docManager.editor.getPoint.mockResolvedValueOnce({
    status: 'OK',
    value: new AcGePoint3d(x, y, 0)
  })

describe('clipboard commands', () => {
  let source: AcDbDatabase
  let line: AcDbLine

  beforeEach(() => {
    jest.clearAllMocks()
    docManager.clipboard.clear()
    source = createDb()
    acdbHostApplicationServices().workingDatabase = source
    line = new AcDbLine(new AcGePoint3d(2, 3, 0), new AcGePoint3d(6, 8, 0))
    source.tables.blockTable.modelSpace.appendEntity(line)
  })

  it('COPYCLIP copies with the lower-left extents corner as base point and records no undo', async () => {
    const cmd = new AcApCopyClipCmd()
    expect(cmd.recordsUndoStack).toBe(false)
    const { context, clearSelection } = createContext(source)
    selectEntities([line])

    await cmd.execute(context)

    expect(clearSelection).toHaveBeenCalled()
    // Paste so that the base point (2,3) lands on (12,13).
    const target = createDb()
    pickPoint(12, 13)
    await new AcApPasteClipCmd().execute(createContext(target).context)

    const [pasted] = modelSpace(target) as AcDbLine[]
    expect(pasted.startPoint.toArray()).toEqual([12, 13, 0])
    expect(pasted.endPoint.toArray()).toEqual([16, 18, 0])
    expect(modelSpace(source)).toHaveLength(1)
  })

  it('COPYBASE uses the picked base point', async () => {
    const { context } = createContext(source)
    pickPoint(6, 8)
    selectEntities([line])
    await new AcApCopyBaseCmd().execute(context)

    pickPoint(0, 0)
    await new AcApPasteClipCmd().execute(context)

    const pasted = modelSpace(source)[1] as AcDbLine
    expect(pasted.endPoint.toArray()).toEqual([0, 0, 0])
    expect(pasted.startPoint.toArray()).toEqual([-4, -5, 0])
  })

  it('CUTCLIP copies and erases the selection', async () => {
    const { context, eraseEntities } = createContext(source)
    selectEntities([line])

    await new AcApCutClipCmd().execute(context)

    expect(eraseEntities).toHaveBeenCalledWith([line.objectId])
    pickPoint(2, 3)
    await new AcApPasteClipCmd().execute(context)
    expect(modelSpace(source)).toHaveLength(2)
  })

  it('PASTECLIP warns when the clipboard is empty', async () => {
    await new AcApPasteClipCmd().execute(createContext(source).context)

    expect(docManager.editor.showMessage).toHaveBeenCalledWith(
      'jig.pasteclip.empty',
      'warning'
    )
    expect(docManager.editor.getPoint).not.toHaveBeenCalled()
  })

  it('PASTECLIP does nothing when the insertion point is cancelled', async () => {
    const { context } = createContext(source)
    selectEntities([line])
    await new AcApCopyClipCmd().execute(context)
    docManager.editor.getPoint.mockResolvedValueOnce({ status: 'Cancel' })

    await new AcApPasteClipCmd().execute(context)

    expect(modelSpace(source)).toHaveLength(1)
  })

  it('PASTEORIG keeps original coordinates and refuses the source drawing', async () => {
    const { context } = createContext(source)
    selectEntities([line])
    await new AcApCopyClipCmd().execute(context)

    await new AcApPasteOrigCmd().execute(context)
    expect(docManager.editor.showMessage).toHaveBeenCalledWith(
      'jig.pasteorig.sameDrawing',
      'warning'
    )
    expect(modelSpace(source)).toHaveLength(1)

    const target = createDb()
    await new AcApPasteOrigCmd().execute(createContext(target).context)
    const [pasted] = modelSpace(target) as AcDbLine[]
    expect(pasted.startPoint.toArray()).toEqual([2, 3, 0])
  })

  it('PASTEBLOCK inserts one block reference with the base point as block origin', async () => {
    const { context } = createContext(source)
    selectEntities([line])
    await new AcApCopyClipCmd().execute(context)

    pickPoint(100, 100)
    await new AcApPasteBlockCmd().execute(context)

    const insert = modelSpace(source)[1] as AcDbBlockReference
    expect(insert).toBeInstanceOf(AcDbBlockReference)
    expect(insert.blockName).toMatch(/^A\$C[0-9A-F]{8}$/)
    expect(insert.position.toArray()).toEqual([100, 100, 0])
    const block = source.tables.blockTable.getAt(
      insert.blockName
    ) as AcDbBlockTableRecord
    expect(block.origin.toArray()).toEqual([2, 3, 0])
    expect(block.newIterator().count).toBe(1)
  })
})
