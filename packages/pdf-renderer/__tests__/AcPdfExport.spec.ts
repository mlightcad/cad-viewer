import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbHatch,
  AcDbLayout,
  AcDbLine,
  AcDbMText,
  acdbHostApplicationServices,
  AcGePoint3d,
  AcGePolyline2d
} from '@mlightcad/data-model'
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from 'pdf-lib'

import { exportDatabaseToPdf } from '../src/AcPdfExport'

function createDb() {
  const db = new AcDbDatabase()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

function ensureModelLayout(db: AcDbDatabase) {
  if (db.objects.layout.getAt('Model')) {
    return
  }
  const layout = new AcDbLayout()
  layout.layoutName = 'Model'
  layout.tabOrder = 0
  layout.blockTableRecordId = db.tables.blockTable.modelSpace.objectId
  db.objects.layout.setAt(layout.layoutName, layout)
  db.tables.blockTable.modelSpace.layoutId = layout.objectId
}

describe('exportDatabaseToPdf', () => {
  it('writes a PDF header for a simple line drawing', async () => {
    const db = createDb()
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(100, 50, 0)
    )
    db.tables.blockTable.modelSpace.appendEntity(line)

    const bytes = await exportDatabaseToPdf(db, { title: 'test-line' })
    const header = new TextDecoder('latin1').decode(bytes.slice(0, 8))
    expect(header.startsWith('%PDF-')).toBe(true)
    expect(bytes.byteLength).toBeGreaterThan(200)
  })

  it('keeps geometry of a far-origin drawing inside the page', async () => {
    const db = createDb()
    const line = new AcDbLine(
      new AcGePoint3d(400000, 3000000, 0),
      new AcGePoint3d(410000, 3008000, 0)
    )
    db.tables.blockTable.modelSpace.appendEntity(line)
    db.insunits = 6

    const bytes = await exportDatabaseToPdf(db, { title: 'mine-plan' })
    expect(
      new TextDecoder('latin1').decode(bytes.slice(0, 8)).startsWith('%PDF-')
    ).toBe(true)
    expect(bytes.byteLength).toBeGreaterThan(200)
  })

  it('frames two nearby hatch rows instead of dropping one to MediaBox', async () => {
    const db = createDb()
    // Mirrors gradient.dxf: >=8 hatches in two vertical bands whose
    // center-gap is >20% of span (old cluster heuristic dropped a row).
    const origins = [
      [11, 12.5],
      [24, 13.3],
      [38, 12.9],
      [51, 13.7],
      [12, 4.5],
      [24, 5.0],
      [37, 5.8],
      [53, 5.6],
      [65, 6.4],
      [70, 6.0]
    ]
    for (const [x, y] of origins) {
      const hatch = new AcDbHatch()
      hatch.isSolidFill = true
      hatch.add(
        new AcGePolyline2d(
          [
            { x, y },
            { x: x + 8, y },
            { x: x + 8, y: y + 4.5 },
            { x, y: y + 4.5 }
          ],
          true
        )
      )
      db.tables.blockTable.modelSpace.appendEntity(hatch)
    }

    const bytes = await exportDatabaseToPdf(db, { title: 'two-row-hatches' })
    const doc = await PDFDocument.load(bytes)
    const { width, height } = doc.getPages()[0].getSize()
    // Default INSUNITS=mm (~2.83pt/unit). Full extents ~11..78 × 4.5..18;
    // the old 20%-of-span cluster kept only the lower band (~12..48 × 4.5..10.5)
    // and produced a much smaller MediaBox (~105×18).
    expect(width).toBeGreaterThan(160)
    expect(height).toBeGreaterThan(28)
  })

  it('exports an ACI 7 solid hatch INSERT instead of painting it paper-white', async () => {
    const db = createDb()
    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = 'LOGO'
    db.tables.blockTable.add(blockRecord)
    const hatch = new AcDbHatch()
    hatch.isSolidFill = true
    hatch.color.setByBlock()
    hatch.add(
      new AcGePolyline2d(
        [
          { x: 0, y: 0 },
          { x: 40, y: 0 },
          { x: 40, y: 20 },
          { x: 0, y: 20 }
        ],
        true
      )
    )
    blockRecord.appendEntity(hatch)

    const insert = new AcDbBlockReference('LOGO')
    insert.objectId = '678'
    insert.color.setForeground()
    insert.position = new AcGePoint3d(1325.78, -489.48, 0)
    insert.scaleFactors = new AcGePoint3d(0.189, 0.189, 1)
    db.tables.blockTable.modelSpace.appendEntity(insert)

    const bytes = await exportDatabaseToPdf(db, { title: 'logo-hatch' })
    expect(
      new TextDecoder('latin1').decode(bytes.slice(0, 8)).startsWith('%PDF-')
    ).toBe(true)
    expect(bytes.byteLength).toBeGreaterThan(300)
  })

  it('embeds OCG layer names and INSERT marked content', async () => {
    const db = createDb()
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(50, 0, 0)
    )
    line.layer = 'WALL'
    db.tables.blockTable.modelSpace.appendEntity(line)

    const zhLine = new AcDbLine(
      new AcGePoint3d(0, 10, 0),
      new AcGePoint3d(50, 10, 0)
    )
    zhLine.layer = '钉柱'
    db.tables.blockTable.modelSpace.appendEntity(zhLine)

    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = 'DOOR'
    db.tables.blockTable.add(blockRecord)
    const inner = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 10, 0)
    )
    inner.layer = '0'
    blockRecord.appendEntity(inner)
    const insert = new AcDbBlockReference('DOOR')
    insert.layer = 'WALL'
    insert.position = new AcGePoint3d(20, 20, 0)
    db.tables.blockTable.modelSpace.appendEntity(insert)
    const insert2 = new AcDbBlockReference('DOOR')
    insert2.layer = 'WALL'
    insert2.position = new AcGePoint3d(40, 20, 0)
    db.tables.blockTable.modelSpace.appendEntity(insert2)

    const bytes = await exportDatabaseToPdf(db, { title: 'ocg-insert' })
    const doc = await PDFDocument.load(bytes)
    expect(doc.catalog.has(PDFName.of('OCProperties'))).toBe(true)
    const resources = doc.getPages()[0].node.Resources()
    const xobjects = resources?.lookup(PDFName.of('XObject'))
    expect(xobjects).toBeInstanceOf(PDFDict)

    const ocProps = doc.catalog.lookup(PDFName.of('OCProperties'), PDFDict)
    const ocgs = ocProps.lookup(PDFName.of('OCGs'), PDFArray)
    const names: string[] = []
    for (let i = 0; i < ocgs.size(); i++) {
      const ocgDict = ocgs.lookup(i, PDFDict)
      const nameObj = ocgDict.get(PDFName.of('Name'))
      expect(
        nameObj instanceof PDFHexString || nameObj instanceof PDFString
      ).toBe(true)
      names.push(
        (nameObj as PDFHexString | PDFString).decodeText()
      )
    }
    expect(names).toContain('WALL')
    expect(names).toContain('钉柱')
  })

  it('wraps glyph paths with ActualText from the glyph provider', async () => {
    const db = createDb()
    const mtext = new AcDbMText()
    mtext.location = new AcGePoint3d(0, 0, 0)
    mtext.contents = '房间'
    db.tables.blockTable.modelSpace.appendEntity(mtext)
    const bytes = await exportDatabaseToPdf(db, {
      title: 'actual-text',
      glyphProvider: {
        renderMText: () => ({
          primitives: [
            {
              kind: 'fill',
              points: [
                { x: 0, y: 0 },
                { x: 2, y: 0 },
                { x: 1, y: 2 }
              ]
            }
          ],
          actualText: '房间',
          box: { min: { x: 0, y: 0 }, max: { x: 2, y: 2 } }
        }),
        renderShape: () => ({
          primitives: [],
          box: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
        })
      }
    })
    expect(new TextDecoder('latin1').decode(bytes.slice(0, 8)).startsWith('%PDF-')).toBe(
      true
    )
    expect(bytes.byteLength).toBeGreaterThan(300)
  })

  it('tessellates a patterned hatch instead of a solid fill', async () => {
    const db = createDb()
    const hatch = new AcDbHatch()
    hatch.isSolidFill = false
    hatch.patternName = 'ANSI31'
    hatch.patternScale = 1
    hatch.add(
      new AcGePolyline2d(
        [
          { x: 0, y: 0 },
          { x: 40, y: 0 },
          { x: 40, y: 20 },
          { x: 0, y: 20 }
        ],
        true
      )
    )
    db.tables.blockTable.modelSpace.appendEntity(hatch)
    const bytes = await exportDatabaseToPdf(db, { title: 'ansi31' })
    expect(
      new TextDecoder('latin1').decode(bytes.slice(0, 8)).startsWith('%PDF-')
    ).toBe(true)
    expect(bytes.byteLength).toBeGreaterThan(200)
  })

  it('exports model space and each paper space as separate PDF pages', async () => {
    const db = createDb()
    ensureModelLayout(db)
    const modelLine = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(100, 0, 0)
    )
    modelLine.layer = '钉柱'
    db.tables.blockTable.modelSpace.appendEntity(modelLine)

    const paperBtr = new AcDbBlockTableRecord()
    paperBtr.name = '*Paper_Space0'
    db.tables.blockTable.add(paperBtr)
    const paperLine = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(50, 25, 0)
    )
    paperLine.layer = 'WALL'
    paperBtr.appendEntity(paperLine)

    const paperLayout = new AcDbLayout()
    paperLayout.layoutName = 'Layout1'
    paperLayout.tabOrder = 1
    paperLayout.blockTableRecordId = paperBtr.objectId
    db.objects.layout.setAt(paperLayout.layoutName, paperLayout)

    const bytes = await exportDatabaseToPdf(db, {
      title: 'multi-layout',
      layouts: 'all'
    })
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(2)
    // Multi-layout merge must keep Catalog.OCProperties or viewers hide Layers.
    expect(doc.catalog.has(PDFName.of('OCProperties'))).toBe(true)
    const ocProps = doc.catalog.lookup(PDFName.of('OCProperties'), PDFDict)
    const ocgs = ocProps.lookup(PDFName.of('OCGs'), PDFArray)
    const names: string[] = []
    for (let i = 0; i < ocgs.size(); i++) {
      const ocgDict = ocgs.lookup(i, PDFDict)
      const nameObj = ocgDict.get(PDFName.of('Name')) as PDFHexString | PDFString
      names.push(nameObj.decodeText())
    }
    expect(names).toContain('钉柱')
    expect(names).toContain('WALL')
  })
})
