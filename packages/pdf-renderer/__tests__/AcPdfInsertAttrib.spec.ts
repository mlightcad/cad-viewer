import { readFileSync } from 'node:fs'
import { PDFDocument, PDFRawStream } from 'pdf-lib'
import pako from 'pako'

import { exportDatabaseToPdf } from '../src/AcPdfExport'
import type { AcPdfGlyphProvider } from '../src/text/AcPdfGlyphProvider'

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

function mockGlyphProvider(): AcPdfGlyphProvider {
  return {
    async renderMText(data) {
      // Yield so INSERT inverse lands before glyphs attach (production race).
      await Promise.resolve()
      return {
        primitives: {
          triangles: new Float32Array([0, 0, 2, 0, 1, 1]),
          polylines: new Float32Array(0)
        },
        box: { min: { x: 0, y: 0 }, max: { x: 2, y: 1 } },
        actualText: data.text ?? ''
      }
    },
    async renderShape() {
      return {
        primitives: {
          triangles: new Float32Array(0),
          polylines: new Float32Array(0)
        },
        box: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
      }
    }
  }
}

describe('INSERT ATTRIB PDF export', () => {
  it('keeps async ATTRIB text beside a scaled INSERT (not a far outlier)', async () => {
    const fontPath = 'C:/Windows/Fonts/arial.ttf'
    let fontBytes: Uint8Array
    try {
      fontBytes = new Uint8Array(readFileSync(fontPath))
    } catch {
      return
    }

    const {
      AcDbAttribute,
      AcDbBlockReference,
      AcDbBlockTableRecord,
      AcDbDatabase,
      AcDbLine,
      AcGePoint3d,
      acdbHostApplicationServices
    } = await import('@mlightcad/data-model')

    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db

    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = 'TITLE'
    db.tables.blockTable.add(blockRecord)
    blockRecord.appendEntity(
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0))
    )

    const insert = new AcDbBlockReference('TITLE')
    insert.position = new AcGePoint3d(100, 200, 0)
    // Non-uniform scale makes T×inverse ≠ inverse×T — the production race
    // that parked title-block labels at a distant speck.
    insert.scaleFactors = new AcGePoint3d(2, 3, 1)
    db.tables.blockTable.modelSpace.appendEntity(insert)

    const attrib = new AcDbAttribute()
    attrib.tag = 'DESIGN'
    attrib.textString = '设计'
    attrib.height = 2.5
    // WCS position of the attribute on the scaled INSERT.
    attrib.position = new AcGePoint3d(110, 206, 0)
    insert.appendAttributes(attrib)

    const bytes = await exportDatabaseToPdf(db, {
      title: 'attrib-scale',
      textMode: 'text',
      textFontResolver: async name =>
        name.toLowerCase().includes('arial') ||
        name.toLowerCase().includes('txt') ||
        name === 'Standard'
          ? fontBytes
          : undefined,
      fontMapping: { txt: 'arial', Standard: 'arial' },
      glyphProvider: mockGlyphProvider()
    })

    const text = await contentText(bytes)
    // Attribute must paint near the INSERT (≈110,206), not near the origin
    // leftover from T×inverse composition.
    expect(text).toMatch(/1(?:0[89]|1[0-2])\.?\d*\s+20[4-8]\.?\d*/)
    expect(text).not.toMatch(/(?:^|[^\d])0\.?\d*\s+0\.?\d*\s+(?:Tm|cm)/m)
  })
})
