import {
  AcCmColor,
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbLayerTableRecord,
  AcDbLine,
  AcGeMatrix3d,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApClipboard, AcApSystemClipboard } from '../src/app/AcApClipboard'

const createDb = () => {
  const db = new AcDbDatabase()
  db.createDefaultData()
  return db
}

const addLayer = (db: AcDbDatabase, name: string, colorIndex: number) => {
  const color = new AcCmColor()
  color.colorIndex = colorIndex
  db.tables.layerTable.add(
    new AcDbLayerTableRecord({ name, color, linetype: 'Continuous' })
  )
}

class MemorySystemClipboard implements AcApSystemClipboard {
  text = ''
  writes = 0
  async writeText(text: string) {
    this.text = text
    this.writes++
  }
  async readText() {
    return this.text
  }
}

describe('AcApClipboard', () => {
  let source: AcDbDatabase
  let line: AcDbLine

  beforeEach(() => {
    source = createDb()
    acdbHostApplicationServices().workingDatabase = source
    addLayer(source, 'WALLS', 1)
    line = new AcDbLine(new AcGePoint3d(1, 2, 0), new AcGePoint3d(5, 2, 0))
    line.layer = 'WALLS'
    source.tables.blockTable.modelSpace.appendEntity(line)
  })

  it('keeps a wblock copy of the selection in memory', async () => {
    const clipboard = new AcApClipboard(null)
    expect(await clipboard.get()).toBeUndefined()

    await clipboard.set(source, [line.objectId], new AcGePoint3d(1, 2, 0))
    const content = await clipboard.get()

    expect(content?.sourceDatabase).toBe(source)
    expect(content?.basePoint.x).toBe(1)
    const [copy] = Array.from(
      content!.database.tables.blockTable.modelSpace.newIterator()
    )
    expect(copy).toBeInstanceOf(AcDbLine)
    expect(copy).not.toBe(line)
    expect(content!.database.tables.layerTable.has('WALLS')).toBe(true)
  })

  it('pastes into another drawing, creating missing records and keeping existing ones', async () => {
    const block = new AcDbBlockTableRecord()
    block.name = 'DOOR'
    source.tables.blockTable.add(block)
    block.appendEntity(
      new AcDbLine(new AcGePoint3d(), new AcGePoint3d(1, 0, 0))
    )
    const ref = new AcDbBlockReference('DOOR')
    ref.layer = 'WALLS'
    source.tables.blockTable.modelSpace.appendEntity(ref)

    const clipboard = new AcApClipboard(null)
    await clipboard.set(source, [line.objectId, ref.objectId], new AcGePoint3d())
    const content = (await clipboard.get())!

    const target = createDb()
    addLayer(target, 'WALLS', 5)
    const ids = target.insert(
      new AcGeMatrix3d().makeTranslation(10, 0, 0),
      content.database
    )

    expect(ids).toHaveLength(2)
    const pastedLine = target.getObjectById(ids[0]) as AcDbLine
    expect(pastedLine.startPoint.x).toBeCloseTo(11)
    expect(target.tables.layerTable.getAt('WALLS')?.color.colorIndex).toBe(5)
    expect(target.tables.blockTable.getAt('DOOR')?.newIterator().count).toBe(1)
  })

  it('round-trips through the system clipboard as DXF text', async () => {
    const system = new MemorySystemClipboard()
    const writer = new AcApClipboard(system)
    await writer.set(source, [line.objectId], new AcGePoint3d(1, 2, 0))

    expect(system.writes).toBe(1)
    expect(system.text.startsWith('999\nMLIGHTCAD_CLIPBOARD v1 ')).toBe(true)

    // Another tab: same system clipboard, empty in-memory clipboard.
    const reader = new AcApClipboard(system)
    const content = await reader.get()

    expect(content).toBeDefined()
    expect(content!.sourceDatabase).toBeUndefined()
    expect(content!.basePoint.toArray()).toEqual([1, 2, 0])
    const entities = Array.from(
      content!.database.tables.blockTable.modelSpace.newIterator()
    )
    expect(entities).toHaveLength(1)
    expect(entities[0].layer).toBe('WALLS')
    expect((entities[0] as AcDbLine).endPoint.x).toBeCloseTo(5)
    // Reading the DXF must not switch the host's working database.
    expect(acdbHostApplicationServices().workingDatabase).toBe(source)
  })

  it('prefers its own in-memory copy over the same data on the system clipboard', async () => {
    const system = new MemorySystemClipboard()
    const clipboard = new AcApClipboard(system)
    const set = await clipboard.set(source, [line.objectId], new AcGePoint3d())

    expect(await clipboard.get()).toBe(set)
  })

  it('falls back to memory when the system clipboard is unavailable', async () => {
    const clipboard = new AcApClipboard({
      writeText: () => Promise.reject(new Error('denied')),
      readText: () => Promise.reject(new Error('denied'))
    })
    const set = await clipboard.set(source, [line.objectId], new AcGePoint3d())

    expect(await clipboard.get()).toBe(set)
  })

  it('ignores system clipboard text that is not drawing data', async () => {
    const system = new MemorySystemClipboard()
    system.text = 'just some text'
    const clipboard = new AcApClipboard(system)

    expect(await clipboard.get()).toBeUndefined()
    expect(await AcApClipboard.deserialize('0\nSECTION\n')).toBeUndefined()
  })
})
