import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  decodePDFRawStream,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream
} from 'pdf-lib'

import {
  AcPdfFontManager,
  acPdfTrueTypeGlyfLooksHealthy
} from '../src/pdf/AcPdfFontManager'
import type { AcPdfOp } from '../src/renderer/AcPdfStyle'

/**
 * Noto Sans KR Thin is the catalog stand-in for `malgun`. pdf-lib's subsetter
 * corrupts its Hangul glyf outlines — exports looked empty while ToUnicode
 * still listed the characters. Resolve a local cad-data copy when present.
 */
function resolveNotoSansKr(): Uint8Array | undefined {
  const candidates = [
    join(
      process.cwd(),
      '../cad-viewer-nextjs-demo/cad-data/fonts/noto-sans-kr.woff'
    ),
    join(process.cwd(), '../cad-data/fonts/noto-sans-kr.woff'),
    join(
      __dirname,
      '../../../../cad-viewer-nextjs-demo/cad-data/fonts/noto-sans-kr.woff'
    ),
    join(__dirname, '../../../../cad-data/fonts/noto-sans-kr.woff')
  ]
  for (const path of candidates) {
    if (existsSync(path)) {
      return new Uint8Array(readFileSync(path))
    }
  }
  return undefined
}

async function readEmbeddedFontProgram(
  pdfBytes: Uint8Array
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes)
  const page = doc.getPages()[0]
  const fontsDict = page.node.Resources()?.lookup(PDFName.of('Font'), PDFDict)
  expect(fontsDict).toBeDefined()
  const fontKey = fontsDict!.keys()[0]
  const type0 = doc.context.lookup(fontsDict!.get(fontKey))
  expect(type0).toBeInstanceOf(PDFDict)
  const descendants = (type0 as PDFDict).lookup(
    PDFName.of('DescendantFonts'),
    PDFArray
  )
  const cidFont = descendants.lookup(0)
  expect(cidFont).toBeInstanceOf(PDFDict)
  const descriptor = (cidFont as PDFDict).lookup(
    PDFName.of('FontDescriptor'),
    PDFDict
  )
  const file = doc.context.lookup(descriptor.get(PDFName.of('FontFile2')))
  expect(file).toBeInstanceOf(PDFRawStream)
  return decodePDFRawStream(file as PDFRawStream).decode()
}

function textOp(
  text: string,
  font = 'malgun'
): Extract<AcPdfOp, { kind: 'text' }> {
  return {
    kind: 'text',
    text,
    hex: '',
    font,
    size: 12,
    x: 0,
    y: 0,
    angleDeg: 0,
    hScale: 1,
    style: { rgb: { r: 0, g: 0, b: 0 }, opacity: 1 }
  }
}

describe('AcPdfFontManager Hangul subset safety', () => {
  it('rejects corrupt TrueType glyf contour headers', () => {
    // Minimal sfnt with head/loca/glyf where glyph 1 claims 17152 contours.
    const numTables = 3
    const headerLength = 12 + numTables * 16
    const head = new Uint8Array(54)
    const headDv = new DataView(head.buffer)
    headDv.setInt16(50, 0) // short loca
    const loca = new Uint8Array([0, 0, 0, 0, 0, 5]) // glyph0 empty, glyph1 @10
    const glyf = new Uint8Array(10)
    const glyfDv = new DataView(glyf.buffer)
    glyfDv.setInt16(0, 17152)
    const tables: { tag: string; data: Uint8Array }[] = [
      { tag: 'glyf', data: glyf },
      { tag: 'head', data: head },
      { tag: 'loca', data: loca }
    ]
    tables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0))
    let total = headerLength
    for (const table of tables) {
      total += table.data.length + ((4 - (table.data.length % 4)) % 4)
    }
    const out = new Uint8Array(total)
    const dv = new DataView(out.buffer)
    dv.setUint32(0, 0x00010000)
    dv.setUint16(4, numTables)
    dv.setUint16(6, 16)
    dv.setUint16(8, 0)
    dv.setUint16(10, 16)
    let dataOffset = headerLength
    tables.forEach((table, index) => {
      const off = 12 + index * 16
      for (let k = 0; k < 4; k++) {
        out[off + k] = table.tag.charCodeAt(k)
      }
      dv.setUint32(off + 8, dataOffset)
      dv.setUint32(off + 12, table.data.length)
      out.set(table.data, dataOffset)
      dataOffset += table.data.length + ((4 - (table.data.length % 4)) % 4)
    })
    expect(acPdfTrueTypeGlyfLooksHealthy(out)).toBe(false)
  })

  const notoSansKr = resolveNotoSansKr()
  // Integration needs a local cad-data copy of Noto Sans KR Thin; skip visibly
  // when the sibling checkout is absent so CI does not silently pass.
  const hangulEmbedIt = notoSansKr ? it : it.skip

  hangulEmbedIt(
    'embeds Noto Sans KR Hangul with a healthy full font program',
    async () => {
      const fontBytes = notoSansKr!

      const fonts = new AcPdfFontManager(async () => fontBytes)
      expect(await fonts.load('malgun')).toBe(true)

      const doc = await PDFDocument.create()
      const original = doc.embedFont.bind(doc)
      let subsetFlag: boolean | undefined
      doc.embedFont = (async (...args: Parameters<typeof doc.embedFont>) => {
        subsetFlag = args[1]?.subset
        return original(...args)
      }) as typeof doc.embedFont

      const op = textOp('한국어 샘플')
      await fonts.embedOp(doc, op)
      expect(op.hex.length).toBeGreaterThan(0)
      // Hangul-capable faces must skip pdf-lib subsetting.
      expect(subsetFlag).toBe(false)

      await fonts.finalize()
      const page = doc.addPage([400, 100])
      const resource = fonts.resourceFor('malgun')
      expect(resource).toBeDefined()
      page.node.set(
        PDFName.of('Resources'),
        doc.context.obj({
          Font: { [resource!.name]: resource!.ref }
        })
      )
      const pdfBytes = await doc.save()
      const program = await readEmbeddedFontProgram(pdfBytes)
      expect(acPdfTrueTypeGlyfLooksHealthy(program)).toBe(true)
      // Full Noto Sans KR Thin is ~0.5MB; a corrupt subset was ~1–4KB.
      expect(program.byteLength).toBeGreaterThan(50_000)
    }
  )
})
