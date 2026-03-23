import { AcGePoint3d } from '@mlightcad/geometry-engine'

import { acdbHostApplicationServices } from '../src/base/AcDbHostApplicationServices'
import { AcDbDxfParser } from '../src/converter/AcDbDxfParser'
import { AcDbDatabase } from '../src/database/AcDbDatabase'
import { AcDbBlockTableRecord } from '../src/database/AcDbBlockTableRecord'
import { AcDbAttribute } from '../src/entity/AcDbAttribute'
import { AcDbAttributeDefinition } from '../src/entity/AcDbAttributeDefinition'
import { AcDbBlockReference } from '../src/entity/AcDbBlockReference'
import { AcDbLine } from '../src/entity/AcDbLine'
import { AcDbText } from '../src/entity/AcDbText'
import { AcDbLayout } from '../src/object/layout/AcDbLayout'

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer
}

function encodeUtf8(text: string) {
  return toArrayBuffer(new TextEncoder().encode(text))
}

function encodeAsciiWithReplacement(
  text: string,
  marker: string,
  replacement: number[]
) {
  const parts = text.split(marker)

  expect(parts).toHaveLength(2)

  const encoder = new TextEncoder()
  const before = encoder.encode(parts[0])
  const after = encoder.encode(parts[1])
  const output = new Uint8Array(
    before.length + replacement.length + after.length
  )

  output.set(before, 0)
  output.set(replacement, before.length)
  output.set(after, before.length + replacement.length)

  return toArrayBuffer(output)
}

function setWorkingDatabase(db: AcDbDatabase) {
  acdbHostApplicationServices().workingDatabase = db
  return db
}

async function readDxf(dxf: string) {
  const db = setWorkingDatabase(new AcDbDatabase())
  await db.read(encodeUtf8(dxf), {
    readOnly: true,
    minimumChunkSize: 1
  })
  return db
}

function addHeaderVariable(
  dxf: string,
  afterName: string,
  name: string,
  code: string,
  value: string
) {
  const anchor = `9\n${afterName}\n`
  const index = dxf.indexOf(anchor)

  expect(index).toBeGreaterThanOrEqual(0)

  const nextVariableIndex = dxf.indexOf('\n9\n$', index + anchor.length)
  expect(nextVariableIndex).toBeGreaterThan(index)

  const insertion = `9\n${name}\n${code}\n${value}\n`
  return `${dxf.slice(0, nextVariableIndex + 1)}${insertion}${dxf.slice(nextVariableIndex + 1)}`
}

function replaceHeaderDouble(dxf: string, name: string, value: number) {
  return dxf.replace(
    new RegExp(`9\\n\\${name}\\n40\\n[^\\n]+\\n`),
    `9\n${name}\n40\n${value}\n`
  )
}

function getBlockEntities(block: AcDbBlockTableRecord) {
  return block.newIterator().toArray()
}

describe('DXF read and parse regressions', () => {
  it('parses GBK encoded DXF text when $DWGCODEPAGE is ANSI_936', () => {
    const sourceDb = setWorkingDatabase(new AcDbDatabase())
    sourceDb.createDefaultData()

    const text = new AcDbText()
    text.position = new AcGePoint3d(2, 3, 0)
    text.textString = 'GBK_TEXT_PLACEHOLDER'
    text.height = 2.5
    text.styleName = 'Standard'
    sourceDb.tables.blockTable.modelSpace.appendEntity(text)

    let dxf = sourceDb.dxfOut(undefined, 6)
    dxf = addHeaderVariable(
      dxf,
      '$ACADVER',
      '$DWGCODEPAGE',
      '3',
      'ANSI_936'
    )

    const parser = new AcDbDxfParser()
    const parsed = parser.parse(
      encodeAsciiWithReplacement(dxf, 'GBK_TEXT_PLACEHOLDER', [
        0xd6, 0xd0, 0xce, 0xc4
      ])
    )

    const parsedText = parsed.entities.find(entity => entity.type === 'TEXT')

    expect(parsedText).toBeDefined()
    expect((parsedText as unknown as { text: string }).text).toBe('中文')
  })

  it('round-trips INSERT attributes and ATTDEF entities through AcDbDatabase.read', async () => {
    const sourceDb = setWorkingDatabase(new AcDbDatabase())
    sourceDb.createDefaultData()

    const block = new AcDbBlockTableRecord()
    block.name = 'TITLE_BLOCK'
    sourceDb.tables.blockTable.add(block)
    block.appendEntity(new AcDbLine({ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }))

    const attdef = new AcDbAttributeDefinition()
    attdef.position = new AcGePoint3d(1, 1, 0)
    attdef.height = 1.5
    attdef.tag = 'NAME'
    attdef.prompt = 'Input name'
    attdef.textString = 'Default Name'
    attdef.styleName = 'Standard'
    block.appendEntity(attdef)

    const insert = new AcDbBlockReference('TITLE_BLOCK')
    insert.position = new AcGePoint3d(10, 20, 0)

    const attribute = new AcDbAttribute()
    attribute.database = sourceDb
    attribute.position = new AcGePoint3d(10, 20, 0)
    attribute.height = 1.5
    attribute.tag = 'NAME'
    attribute.textString = 'Leaf'
    attribute.styleName = 'Standard'
    insert.appendAttributes(attribute)

    sourceDb.tables.blockTable.modelSpace.appendEntity(insert)

    const targetDb = await readDxf(sourceDb.dxfOut(undefined, 6))
    const readBlock = targetDb.tables.blockTable.getAt('TITLE_BLOCK')

    expect(readBlock).toBeDefined()

    const blockEntities = getBlockEntities(readBlock!)
    const readAttDef = blockEntities.find(
      entity => entity instanceof AcDbAttributeDefinition
    ) as AcDbAttributeDefinition | undefined

    expect(blockEntities.some(entity => entity instanceof AcDbLine)).toBe(true)
    expect(readAttDef).toBeDefined()
    expect(readAttDef?.tag).toBe('NAME')
    expect(readAttDef?.prompt).toBe('Input name')
    expect(readAttDef?.textString).toBe('Default Name')

    const modelEntities = targetDb.tables.blockTable.modelSpace.newIterator().toArray()
    const readInsert = modelEntities.find(
      entity => entity instanceof AcDbBlockReference
    ) as AcDbBlockReference | undefined

    expect(readInsert).toBeDefined()
    expect(readInsert?.blockName).toBe('TITLE_BLOCK')
    expect(readInsert?.position.x).toBe(10)
    expect(readInsert?.position.y).toBe(20)

    const attributes = readInsert?.attributeIterator().toArray() ?? []

    expect(attributes).toHaveLength(1)
    expect(attributes[0].tag).toBe('NAME')
    expect(attributes[0].textString).toBe('Leaf')
    expect(attributes[0].ownerId).toBe(readInsert?.objectId)
  })

  it('keeps paper space entities attached to their layout block after read', async () => {
    const sourceDb = setWorkingDatabase(new AcDbDatabase())
    sourceDb.createDefaultData()

    const paperSpace = new AcDbBlockTableRecord()
    paperSpace.name = '*Paper_Space0'
    sourceDb.tables.blockTable.add(paperSpace)

    const layout = new AcDbLayout()
    layout.layoutName = 'Layout1'
    layout.tabOrder = 1
    layout.blockTableRecordId = paperSpace.objectId
    sourceDb.objects.layout.setAt(layout.layoutName, layout)
    paperSpace.layoutId = layout.objectId

    paperSpace.appendEntity(
      new AcDbLine(
        { x: 100, y: 200, z: 0 },
        { x: 140, y: 260, z: 0 }
      )
    )

    const targetDb = await readDxf(sourceDb.dxfOut(undefined, 6))
    const readPaperSpace = targetDb.tables.blockTable.getAt('*Paper_Space0')
    const readLayout = targetDb.objects.layout.getAt('Layout1')

    expect(readPaperSpace).toBeDefined()
    expect(readLayout).toBeDefined()
    expect(readLayout?.blockTableRecordId).toBe(readPaperSpace?.objectId)
    expect(readPaperSpace?.layoutId).toBe(readLayout?.objectId)

    const paperLine = readPaperSpace
      ?.newIterator()
      .toArray()
      .find(
        entity =>
          entity instanceof AcDbLine &&
          entity.startPoint.x === 100 &&
          entity.startPoint.y === 200 &&
          entity.endPoint.x === 140 &&
          entity.endPoint.y === 260
      )

    expect(paperLine).toBeDefined()

    const modelLine = targetDb.tables.blockTable.modelSpace
      .newIterator()
      .toArray()
      .find(
        entity =>
          entity instanceof AcDbLine &&
          entity.startPoint.x === 100 &&
          entity.startPoint.y === 200 &&
          entity.endPoint.x === 140 &&
          entity.endPoint.y === 260
      )

    expect(modelLine).toBeUndefined()
  })

  it('reads header values such as LTSCALE and CELTSCALE from DXF', async () => {
    const sourceDb = setWorkingDatabase(new AcDbDatabase())
    sourceDb.createDefaultData()

    let dxf = sourceDb.dxfOut(undefined, 6)
    dxf = replaceHeaderDouble(dxf, '$LTSCALE', 2.5)
    dxf = addHeaderVariable(dxf, '$LTSCALE', '$CELTSCALE', '40', '0.25')

    const targetDb = await readDxf(dxf)

    expect(targetDb.ltscale).toBe(2.5)
    expect(targetDb.celtscale).toBe(0.25)
    expect(targetDb.textstyle).toBe('Standard')
  })
})
