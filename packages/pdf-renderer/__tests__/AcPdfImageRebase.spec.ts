import { PDFDocument, PDFName } from 'pdf-lib'

import { AcPdfDocumentWriter } from '../src/pdf/AcPdfDocumentWriter'
import { AcPdfEntity } from '../src/renderer/AcPdfEntity'

/** 1×1 opaque red PNG. */
const MINI_PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x03, 0x00,
  0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82
])

describe('AcPdfDocumentWriter image rebase', () => {
  it('paints images after large-coordinate rebase transforms the op', async () => {
    // Survey-scale coords force PDF_REBASE_THRESHOLD; paint clones the image
    // op via {...op}. Caching by op identity used to miss and skip the draw.
    const originX = 3_134_759
    const originY = 1_394_450
    const entity = new AcPdfEntity()
    entity.box.min.set(originX, originY)
    entity.box.max.set(originX + 20, originY + 12)
    entity.addOp({
      kind: 'image',
      bytes: MINI_PNG,
      format: 'png',
      x: originX,
      y: originY,
      width: 20,
      height: 12
    })

    const bytes = await AcPdfDocumentWriter.write([entity], {
      insunits: 4,
      background: 'none'
    })

    const doc = await PDFDocument.load(bytes)
    const page = doc.getPages()[0]
    const resources = page.node.Resources()
    expect(resources?.lookup(PDFName.of('XObject'))).toBeDefined()

    const raw = new TextDecoder('latin1').decode(bytes)
    expect(raw).toMatch(/\/Im\d+\s+Do/)
    expect(raw).toMatch(/\/Subtype\s*\/Image|\/Subtype\/Image/)
  })

  it('resolves embedded images through transformed op copies sharing bytes', async () => {
    const { AcPdfContentWriter } = await import('../src/pdf/AcPdfContentWriter')
    const doc = await PDFDocument.create()
    const page = doc.addPage([200, 200])
    const writer = new AcPdfContentWriter(page, doc)
    const rawOp = {
      kind: 'image' as const,
      bytes: MINI_PNG,
      format: 'png' as const,
      x: 0,
      y: 0,
      width: 10,
      height: 8
    }
    await writer.embedImage(rawOp)
    // Simulate transformOpByMatrix's shallow clone used during rebase paint.
    const painted = { ...rawOp, x: 50, y: 40, width: 10, height: 8 }
    writer.drawOp(painted)
    writer.flushToPage(page)

    const bytes = await doc.save()
    const raw = new TextDecoder('latin1').decode(bytes)
    expect(raw).toMatch(/\/Im\d+\s+Do/)
  })
})
