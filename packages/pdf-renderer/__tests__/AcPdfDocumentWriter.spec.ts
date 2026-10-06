import { PDFDocument, PDFRawStream } from 'pdf-lib'
import pako from 'pako'

import { AcPdfDocumentWriter } from '../src/pdf/AcPdfDocumentWriter'
import { computePageLayout, mapDrawingToPage } from '../src/pdf/AcPdfPageLayout'
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

  it('keeps small drawings in absolute coordinates', async () => {
    const bytes = await AcPdfDocumentWriter.write(
      [entityWithBox(10, 20, 110, 70)],
      { insunits: 4, background: 'none' }
    )
    const text = await contentText(bytes)
    expect(text).toContain('10 20 m')
    expect(text).toContain('110 70 l')
  })

  it('rebases survey coordinates so a sub-unit delta survives in the content stream', async () => {
    const x0 = 50_000_000
    const y0 = 3_000_000
    const entity = entityWithBox(x0, y0, x0 + 10, y0 + 0.25)
    const bytes = await AcPdfDocumentWriter.write([entity], {
      insunits: 4,
      background: 'none'
    })
    const text = await contentText(bytes)

    // World magnitudes must not appear as path operands. float32 ulp at 5e7
    // is 4, so the 0.25 rise would otherwise quantize into a large step.
    expect(text).not.toMatch(/50000000/)
    expect(text).not.toMatch(/3000000/)

    const move = text.match(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) m/)
    const line = text.match(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) l/)
    expect(move).not.toBeNull()
    expect(line).not.toBeNull()
    const x1 = Number(move![1])
    const y1 = Number(move![2])
    const x2 = Number(line![1])
    const y2 = Number(line![2])
    expect(Math.hypot(x2 - x1, y2 - y1)).toBeCloseTo(Math.hypot(10, 0.25), 6)
    expect(Math.abs(y2 - y1)).toBeCloseTo(0.25, 6)
    expect(Math.max(Math.abs(x1), Math.abs(y1), Math.abs(x2), Math.abs(y2))).toBeLessThan(
      1e3
    )

    const cm = text.match(
      /(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?) 0 0 (-?\d+(?:\.\d+)?(?:e[+-]?\d+)?) (-?\d+(?:\.\d+)?(?:e[+-]?\d+)?) (-?\d+(?:\.\d+)?(?:e[+-]?\d+)?) cm/
    )
    expect(cm).not.toBeNull()
    const scale = Number(cm![1])
    const tx = Number(cm![3])
    const ty = Number(cm![4])
    const layout = computePageLayout(entity.box, { insunits: 4 })
    const expected = mapDrawingToPage(layout, x0, y0)
    expect(x1 * scale + tx).toBeCloseTo(expected.x, 3)
    expect(y1 * scale + ty).toBeCloseTo(expected.y, 3)
  })
})

async function contentText(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes)
  const parts: string[] = []
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) {
      continue
    }
    try {
      parts.push(new TextDecoder('latin1').decode(pako.inflate(obj.contents)))
    } catch {
      parts.push(new TextDecoder('latin1').decode(obj.contents))
    }
  }
  return parts.join('\n')
}
