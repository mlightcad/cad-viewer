import { PDFDocument } from 'pdf-lib'

import { AcPdfDocumentWriter } from '../src/pdf/AcPdfDocumentWriter'
import { AcPdfEntity } from '../src/renderer/AcPdfEntity'

function entityWithBox(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
) {
  const entity = new AcPdfEntity()
  entity.box.min.set(minX, minY)
  entity.box.max.set(maxX, maxY)
  entity.addOp({
    kind: 'stroke',
    points: [
      { x: minX, y: minY },
      { x: maxX, y: maxY }
    ],
    style: { rgb: { r: 0, g: 0, b: 0 }, opacity: 1, lineWidth: 0 }
  })
  return entity
}

async function pageSize(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages()[0].getSize()
}

describe('AcPdfDocumentWriter extents', () => {
  it('drops origin/double-transform outliers so survey-grid geometry fills the page', async () => {
    const cluster: ReturnType<typeof entityWithBox>[] = []
    for (let i = 0; i < 20; i++) {
      cluster.push(
        entityWithBox(37500000 + i, 3460000, 37502000 + i, 3468000)
      )
    }
    cluster.push(entityWithBox(0, 0, 1, 1))
    cluster.push(entityWithBox(75000000, 6900000, 75002000, 6908000))
    for (let i = 0; i < 15; i++) {
      cluster.push(
        entityWithBox(75000000 + i, 6900000, 75002000 + i, 6908000)
      )
    }

    const bytes = await AcPdfDocumentWriter.write(cluster, {
      insunits: 6,
      background: 'none'
    })
    const size = await pageSize(bytes)
    expect(size.width / size.height).toBeLessThan(8)
    expect(size.height).toBeGreaterThan(2000)
  })

  it('frames using an explicit fitBox even when drawable union is huge', async () => {
    const entities = [
      entityWithBox(0, 0, 1, 1),
      entityWithBox(37500000, 3460000, 37501000, 3468000),
      entityWithBox(75000000, 0, 75000001, 1)
    ]
    const bytes = await AcPdfDocumentWriter.write(entities, {
      insunits: 6,
      background: 'none',
      fitBox: {
        min: { x: 37500000, y: 3460000 },
        max: { x: 37501000, y: 3468000 }
      }
    })
    const size = await pageSize(bytes)
    expect(size.height).toBeGreaterThan(2000)
    expect(size.width / size.height).toBeLessThan(4)
  })
})
