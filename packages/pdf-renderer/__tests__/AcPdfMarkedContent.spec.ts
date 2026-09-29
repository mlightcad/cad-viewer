import { PDFDocument } from 'pdf-lib'

import { AcPdfContentWriter } from '../src/pdf/AcPdfContentWriter'
import {
  pdfEntityText,
  pdfLiteral,
  stripMtextCodes
} from '../src/pdf/AcPdfMarkedContent'
import { effectivePdfLayer } from '../src/pdf/AcPdfEffectiveLayer'

describe('PDF marked content helpers', () => {
  it('strips MTEXT formatting codes', () => {
    expect(stripMtextCodes('{\\fArial|b0;房间}\\Pnext')).toContain('房间')
    expect(stripMtextCodes('{\\fArial|b0;房间}\\Pnext')).toContain('next')
  })

  it('resolves layer 0 to the INSERT layer', () => {
    expect(effectivePdfLayer('0', 'WALL')).toBe('WALL')
    expect(effectivePdfLayer('DIM', 'WALL')).toBe('DIM')
  })

  it('hex-encodes entity text so low-byte ) cannot terminate a literal', () => {
    // U+0129's low byte is 0x29 (')'). A latin1 literal writer would emit an
    // unescaped ')' and break the content stream for Acrobat.
    const name = `${String.fromCharCode(0x129)}\x060¹`
    const encoded = pdfEntityText(name)
    expect(encoded).toMatch(/^<FEFF/)
    expect(encoded).not.toMatch(/\(/)
    // Control U+0006 is stripped; ĩ and ¹ remain.
    expect(encoded).toContain('0129')
    expect(encoded).not.toContain('0006')
  })

  it('escapes pdfLiteral by the written byte, not the full code unit', () => {
    // U+0129's low byte is 0x29 (')'). Escaping must use that byte so the
    // latin1 content-stream writer cannot emit an unescaped ')'.
    const name = String.fromCharCode(0x129)
    expect(pdfLiteral(name)).toBe('(\\))')
    expect(pdfLiteral(`)\x06`)).toBe('(\\)\\006)')
  })

  it('writes Entity marked content with hex properties', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([100, 100])
    const writer = new AcPdfContentWriter(page, doc)
    writer.beginEntity({
      handle: 'C1DC9',
      type: 'INSERT',
      name: `${String.fromCharCode(0x129)}\x060¹`,
      layer: 'PID_FITTINGS'
    })
    writer.endMarked()
    writer.flushToPage(page)
    const bytes = await doc.save()
    const text = Buffer.from(bytes).toString('latin1')
    expect(text).toContain('/EntityType')
    expect(text).not.toMatch(/\/Name \(\)/)
    // No raw unescaped junk after an empty Name literal.
    expect(text).not.toMatch(/\/Name \(\)[\x00-\x1f]/)
    expect(text).toMatch(/\/Name <FEFF0129/)
  })
})
