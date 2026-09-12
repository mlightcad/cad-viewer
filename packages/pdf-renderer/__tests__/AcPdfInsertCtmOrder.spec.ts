import { AcGeMatrix3d } from '@mlightcad/data-model'
import { PDFDocument } from 'pdf-lib'

import { AcPdfDocumentWriter } from '../src/pdf/AcPdfDocumentWriter'
import { mapDrawingToPage } from '../src/pdf/AcPdfPageLayout'
import { AcPdfEntity } from '../src/renderer/AcPdfEntity'
import { AcPdfMatrixUtil } from '../src/renderer/AcPdfMatrixUtil'

describe('INSERT page CTM order', () => {
  it('keeps translated INSERT box mapped inside the MediaBox', async () => {
    const entity = new AcPdfEntity()
    entity.objectId = '678'
    entity.entityType = 'INSERT'
    entity.insertName = 'MARK'
    entity.addOp({
      kind: 'stroke',
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 }
      ],
      style: { rgb: { r: 0, g: 0, b: 0 }, opacity: 1, lineWidth: 0 }
    })
    entity.box.min.set(0, 0)
    entity.box.max.set(20, 0)
    entity.applyMatrix(new AcGeMatrix3d().makeTranslation(2500, 1500, 0))

    const base = new AcPdfEntity()
    base.addOp({
      kind: 'stroke',
      points: [
        { x: 0, y: 0 },
        { x: 5000, y: 3000 }
      ],
      style: { rgb: { r: 0, g: 0, b: 0 }, opacity: 1, lineWidth: 0 }
    })
    base.box.min.set(0, 0)
    base.box.max.set(5000, 3000)

    const bytes = await AcPdfDocumentWriter.write([base, entity], {
      insunits: 4,
      background: 'none'
    })
    const doc = await PDFDocument.load(bytes)
    const { width: pageWidth, height: pageHeight } = doc.getPages()[0].getSize()

    const worldOrigin = AcPdfMatrixUtil.transformPoint(
      new AcGeMatrix3d().makeTranslation(2500, 1500, 0),
      { x: 0, y: 0, z: 0 }
    )
    const scale = Math.min(
      (pageWidth * 0.96) / 5000,
      (pageHeight * 0.96) / 3000
    )
    const layout = {
      scale,
      offsetX: (pageWidth - 5000 * scale) / 2,
      offsetY: (pageHeight - 3000 * scale) / 2,
      pageWidth,
      pageHeight
    }
    const pagePos = mapDrawingToPage(layout, worldOrigin.x, worldOrigin.y)

    expect(pagePos.x).toBeGreaterThanOrEqual(0)
    expect(pagePos.y).toBeGreaterThanOrEqual(0)
    expect(pagePos.x).toBeLessThanOrEqual(pageWidth)
    expect(pagePos.y).toBeLessThanOrEqual(pageHeight)
    expect(bytes.byteLength).toBeGreaterThan(200)
  })
})
