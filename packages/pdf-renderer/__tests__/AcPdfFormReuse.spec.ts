import { PDFDict, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from 'pdf-lib'

import {
  AcPdfContentWriter,
  createPdfFormRegistry
} from '../src/pdf/AcPdfContentWriter'

describe('AcPdfContentWriter form reuse across pages', () => {
  it('registers shared Form XObjects on every page that invokes them', async () => {
    const doc = await PDFDocument.create()
    const forms = createPdfFormRegistry()
    const triangles = new Float32Array([0, 0, 10, 0, 5, 8])

    const paintPage = () => {
      const page = doc.addPage([100, 100])
      const writer = new AcPdfContentWriter(page, doc, { formRegistry: forms })
      writer.drawOp({
        kind: 'triangles',
        data: triangles,
        style: { rgb: { r: 0, g: 0, b: 0 }, opacity: 1 }
      })
      writer.flushToPage(page)
      return page
    }

    const page1 = paintPage()
    const page2 = paintPage()

    const xo1 = page1.node.Resources()?.lookup(PDFName.of('XObject'))
    const xo2 = page2.node.Resources()?.lookup(PDFName.of('XObject'))
    expect(xo1).toBeInstanceOf(PDFDict)
    expect(xo2).toBeInstanceOf(PDFDict)
    expect((xo1 as PDFDict).has(PDFName.of('Fm1'))).toBe(true)
    expect((xo2 as PDFDict).has(PDFName.of('Fm1'))).toBe(true)

    // Page 2 content must reference the shared form.
    const contents = page2.node.Contents()
    const stream = doc.context.lookup(contents)
    expect(stream).toBeInstanceOf(PDFRawStream)
    const text = Buffer.from(
      decodePDFRawStream(stream as PDFRawStream).decode()
    ).toString('latin1')
    expect(text).toContain('/Fm1 Do')
  })
})
