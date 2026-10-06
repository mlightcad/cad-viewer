import { PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from 'pdf-lib'

import { AcPdfOcgManager } from '../src/pdf/AcPdfOcgManager'

describe('AcPdfOcgManager', () => {
  it('encodes Unicode OCG Names as UTF-16BE hex strings', async () => {
    const doc = await PDFDocument.create()
    const ocg = new AcPdfOcgManager(doc)
    const layer = '钉柱'
    const { ref } = ocg.ensure(layer)

    const dict = doc.context.lookup(ref)
    expect(dict).toBeInstanceOf(PDFDict)
    const name = (dict as PDFDict).get(PDFName.of('Name'))
    expect(name).toBeInstanceOf(PDFHexString)
    expect((name as PDFHexString).decodeText()).toBe(layer)
    expect(String(name)).toBe('<FEFF948967F1>')
  })

  it('keeps ASCII OCG Names as PDFString literals', async () => {
    const doc = await PDFDocument.create()
    const ocg = new AcPdfOcgManager(doc)
    const { ref } = ocg.ensure('WALL')
    const dict = doc.context.lookup(ref) as PDFDict
    const name = dict.get(PDFName.of('Name'))
    expect(name).toBeInstanceOf(PDFString)
    expect((name as PDFString).decodeText()).toBe('WALL')
  })

  it('keeps distinct resource names for different Chinese layers', async () => {
    const doc = await PDFDocument.create()
    const ocg = new AcPdfOcgManager(doc)
    const a = ocg.ensure('钉柱')
    const b = ocg.ensure('墙体')
    expect(a.resourceName).not.toBe(b.resourceName)
    expect(a.resourceName.startsWith('lyr_')).toBe(true)
    expect(b.resourceName.startsWith('lyr_')).toBe(true)
  })

  it('keeps readable resource names for ASCII layers', async () => {
    const doc = await PDFDocument.create()
    const ocg = new AcPdfOcgManager(doc)
    expect(ocg.ensure('WALL').resourceName).toBe('lyr_WALL')
  })
})
