import {
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbLayout,
  AcDbLine,
  AcDbMText,
  AcDbViewport,
  acdbHostApplicationServices,
  AcGeBox2d,
  AcGePoint3d
} from '@mlightcad/data-model'
import { PDFDocument } from 'pdf-lib'

import { exportDatabaseToPdf } from '../src/AcPdfExport'
import { AcPdfMatrixUtil } from '../src/renderer/AcPdfMatrixUtil'
import {
  buildModelToPaperMatrix,
  isDefaultPaperSpaceViewport
} from '../src/viewport/AcPdfPaperViewport'

function createDb() {
  const db = new AcDbDatabase()
  acdbHostApplicationServices().workingDatabase = db
  return db
}

function ensureModelLayout(db: AcDbDatabase) {
  if (db.objects.layout.getAt('Model')) return
  const layout = new AcDbLayout()
  layout.layoutName = 'Model'
  layout.tabOrder = 0
  layout.blockTableRecordId = db.tables.blockTable.modelSpace.objectId
  db.objects.layout.setAt(layout.layoutName, layout)
  db.tables.blockTable.modelSpace.layoutId = layout.objectId
}

describe('AcPdfPaperViewport', () => {
  it('detects the default paper-space viewport fingerprint', () => {
    expect(
      isDefaultPaperSpaceViewport({
        centerPoint: { x: 6, y: 4.5 },
        viewCenter: { x: 6, y: 4.5 },
        height: 9,
        viewHeight: 9
      })
    ).toBe(true)
    expect(
      isDefaultPaperSpaceViewport({
        centerPoint: { x: 100, y: 80 },
        viewCenter: { x: 0, y: 0 },
        height: 160,
        viewHeight: 800,
        viewTarget: { x: 50, y: 40 }
      })
    ).toBe(false)
  })

  it('maps model view center to paper viewport center', () => {
    const paper = new AcGeBox2d()
    paper.min.set(0, 0)
    paper.max.set(200, 100)
    const model = new AcGeBox2d()
    model.min.set(-50, -25)
    model.max.set(50, 25)
    const matrix = buildModelToPaperMatrix(paper, model, 0)
    const mid = AcPdfMatrixUtil.transformPoint(matrix, { x: 0, y: 0, z: 0 })
    expect(mid.x).toBeCloseTo(100)
    expect(mid.y).toBeCloseTo(50)
    const corner = AcPdfMatrixUtil.transformPoint(matrix, {
      x: 50,
      y: 25,
      z: 0
    })
    expect(corner.x).toBeCloseTo(200)
    expect(corner.y).toBeCloseTo(100)
  })

  it('exports model geometry through a paper-space viewport', async () => {
    const db = createDb()
    ensureModelLayout(db)

    db.tables.blockTable.modelSpace.appendEntity(
      new AcDbLine(new AcGePoint3d(-40, 0, 0), new AcGePoint3d(40, 0, 0))
    )
    db.tables.blockTable.modelSpace.appendEntity(
      new AcDbLine(new AcGePoint3d(0, -30, 0), new AcGePoint3d(0, 30, 0))
    )

    const paperBtr = new AcDbBlockTableRecord()
    paperBtr.name = '*Paper_Space0'
    db.tables.blockTable.add(paperBtr)

    const defaultVp = new AcDbViewport()
    defaultVp.centerPoint = new AcGePoint3d(6, 4.5, 0)
    defaultVp.viewCenter = new AcGePoint3d(6, 4.5, 0)
    defaultVp.width = 12
    defaultVp.height = 9
    defaultVp.viewHeight = 9
    paperBtr.appendEntity(defaultVp)

    const userVp = new AcDbViewport()
    userVp.centerPoint = new AcGePoint3d(100, 80, 0)
    userVp.width = 200
    userVp.height = 160
    userVp.viewCenter = new AcGePoint3d(0, 0, 0)
    userVp.viewHeight = 80
    userVp.viewTarget = new AcGePoint3d(0, 0, 0)
    paperBtr.appendEntity(userVp)

    // Title-block-like paper annotation outside the viewport.
    paperBtr.appendEntity(
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(220, 0, 0))
    )

    const paperLayout = new AcDbLayout()
    paperLayout.layoutName = 'Layout1'
    paperLayout.tabOrder = 1
    paperLayout.blockTableRecordId = paperBtr.objectId
    db.objects.layout.setAt(paperLayout.layoutName, paperLayout)

    const bytes = await exportDatabaseToPdf(db, {
      title: 'viewport-content',
      layouts: 'all'
    })
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(2)
    // Paper page must be larger than a border-only export.
    expect(bytes.byteLength).toBeGreaterThan(800)
  })

  it('keeps async MTEXT glyphs when cloning model content into a viewport', async () => {
    const db = createDb()
    ensureModelLayout(db)

    const mtext = new AcDbMText()
    mtext.contents = 'TITLE'
    mtext.location = new AcGePoint3d(0, 0, 0)
    db.tables.blockTable.modelSpace.appendEntity(mtext)

    const paperBtr = new AcDbBlockTableRecord()
    paperBtr.name = '*Paper_Space0'
    db.tables.blockTable.add(paperBtr)

    const userVp = new AcDbViewport()
    userVp.centerPoint = new AcGePoint3d(100, 80, 0)
    userVp.width = 200
    userVp.height = 160
    userVp.viewCenter = new AcGePoint3d(0, 0, 0)
    userVp.viewHeight = 80
    userVp.viewTarget = new AcGePoint3d(0, 0, 0)
    paperBtr.appendEntity(userVp)

    const paperLayout = new AcDbLayout()
    paperLayout.layoutName = 'Layout1'
    paperLayout.tabOrder = 1
    paperLayout.blockTableRecordId = paperBtr.objectId
    db.objects.layout.setAt(paperLayout.layoutName, paperLayout)

    const bytes = await exportDatabaseToPdf(db, {
      title: 'viewport-mtext',
      layouts: 'current',
      blockId: paperBtr.objectId,
      glyphProvider: {
        renderMText: async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return {
            primitives: [
              {
                kind: 'fill' as const,
                points: [
                  { x: -5, y: -5 },
                  { x: 5, y: -5 },
                  { x: 0, y: 5 }
                ]
              }
            ],
            actualText: 'TITLE',
            box: { min: { x: -5, y: -5 }, max: { x: 5, y: 5 } }
          }
        },
        renderShape: () => ({
          primitives: [],
          box: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
        })
      }
    })
    expect(
      new TextDecoder('latin1').decode(bytes.slice(0, 8)).startsWith('%PDF-')
    ).toBe(true)
    // Glyph triangle + viewport border must produce a non-trivial stream.
    expect(bytes.byteLength).toBeGreaterThan(500)
  })
})
