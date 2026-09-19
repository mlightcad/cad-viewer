import { readFileSync } from 'node:fs'

import { PDFDocument, PDFName } from 'pdf-lib'

import { AcPdfFontManager } from '../src/pdf/AcPdfFontManager'
import type { AcPdfOp } from '../src/renderer/AcPdfStyle'

/**
 * Parallel embedOp used to race `embedFont({ subset: true })` and paint
 * subset glyph ids from one font through another — scrambling strings like
 * "Dashed line". These tests lock the single-flight embed + shared encode.
 */
describe('AcPdfFontManager embed race', () => {
  async function loadArial(): Promise<Uint8Array | undefined> {
    try {
      return new Uint8Array(readFileSync('C:/Windows/Fonts/arial.ttf'))
    } catch {
      return undefined
    }
  }

  function textOp(text: string, font = 'arial'): Extract<AcPdfOp, { kind: 'text' }> {
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

  it('embeds one subset font when parallel embedOp races the first load', async () => {
    const fontBytes = await loadArial()
    if (!fontBytes) {
      return
    }

    let embedCalls = 0
    const fonts = new AcPdfFontManager(async () => fontBytes)
    expect(await fonts.load('arial')).toBe(true)

    const doc = await PDFDocument.create()
    const original = doc.embedFont.bind(doc)
    doc.embedFont = (async (...args: Parameters<typeof doc.embedFont>) => {
      embedCalls += 1
      // Yield so concurrent embedProgram callers all pass the empty-cache check.
      await Promise.resolve()
      return original(...args)
    }) as typeof doc.embedFont

    const ops = [
      textOp('Dashed'),
      textOp(' '),
      textOp('line')
    ]
    await Promise.all(ops.map(op => fonts.embedOp(doc, op)))

    expect(embedCalls).toBe(1)
    expect(ops.every(op => op.hex.length > 0)).toBe(true)

    const resource = fonts.resourceFor('arial')
    expect(resource).toBeDefined()
    // All runs must encode against the same subset font that resourceFor
    // exposes — otherwise paint would use mismatched Identity-H glyph ids.
    for (const op of ops) {
      const again = textOp(op.text)
      await fonts.embedOp(doc, again)
      expect(again.hex).toBe(op.hex)
    }
  })

  it('exports space-split TEXT with an embedded page font', async () => {
    const fontBytes = await loadArial()
    if (!fontBytes) {
      return
    }

    const { AcDbDatabase, AcDbText, AcGePoint3d, acdbHostApplicationServices } =
      await import('@mlightcad/data-model')
    const { exportDatabaseToPdf } = await import('../src/AcPdfExport')

    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
    const label = new AcDbText()
    label.textString = 'Dashed line'
    label.height = 2
    label.position = new AcGePoint3d(10, 20, 0)
    db.tables.blockTable.modelSpace.appendEntity(label)

    const bytes = await exportDatabaseToPdf(db, {
      title: 'font-embed-race',
      textMode: 'text',
      textFontResolver: async () => fontBytes,
      background: 'none'
    })

    expect(bytes.byteLength).toBeGreaterThan(500)
    const doc = await PDFDocument.load(bytes)
    const page = doc.getPages()[0]
    const resources = page.node.Resources()
    // textMode:'text' + resolver must place at least one font on the page.
    expect(resources?.lookup(PDFName.of('Font'))).toBeDefined()
  })
})
