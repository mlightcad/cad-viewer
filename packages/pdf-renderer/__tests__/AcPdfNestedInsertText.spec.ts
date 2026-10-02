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

describe('nested INSERT MTEXT PDF export', () => {
  it('keeps MTEXT inside nested INSERTs after two-pass collect', async () => {
    const fontPath = 'C:/Windows/Fonts/arial.ttf'
    let fontBytes: Uint8Array
    try {
      fontBytes = new Uint8Array(readFileSync(fontPath))
    } catch {
      return
    }

    const {
      AcDbBlockReference,
      AcDbBlockTableRecord,
      AcDbDatabase,
      AcDbLine,
      AcDbMText,
      AcGePoint3d,
      acdbHostApplicationServices
    } = await import('@mlightcad/data-model')

    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db

    // Leaf note block (like SW_NOTE_0_1) with a single MTEXT label.
    const note = new AcDbBlockTableRecord()
    note.name = 'SW_NOTE_DESIGN'
    db.tables.blockTable.add(note)
    const label = new AcDbMText()
    label.contents = '设计'
    label.height = 2.5
    label.location = new AcGePoint3d(0, 0, 0)
    note.appendEntity(label)

    // Parent title block embeds the note INSERT (like 注解2).
    const title = new AcDbBlockTableRecord()
    title.name = 'TITLE_NESTED'
    db.tables.blockTable.add(title)
    title.appendEntity(
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(20, 0, 0))
    )
    const nested = new AcDbBlockReference('SW_NOTE_DESIGN')
    nested.position = new AcGePoint3d(5, 3, 0)
    title.appendEntity(nested)

    const insert = new AcDbBlockReference('TITLE_NESTED')
    insert.position = new AcGePoint3d(100, 200, 0)
    db.tables.blockTable.modelSpace.appendEntity(insert)

    const bytes = await exportDatabaseToPdf(db, {
      title: 'nested-insert-mtext',
      textMode: 'text',
      textFontResolver: async name =>
        name.toLowerCase().includes('arial') ||
        name.toLowerCase().includes('txt') ||
        name === 'Standard'
          ? fontBytes
          : undefined,
      fontMapping: { txt: 'arial', Standard: 'arial' },
      glyphProvider: mockGlyphProvider(),
      embedTextActualText: true
    })

    const text = await contentText(bytes)
    // ActualText carries the label even when painted as vector glyphs.
    const actual = Buffer.from('设计', 'utf8').toString('latin1')
    expect(text.includes('ActualText') || text.includes(actual)).toBe(true)
    // Nested note sits at INSERT(100,200) + local(5,3) ≈ (105,203).
    expect(text).toMatch(/10[45]\.?\d*\s+20[0-5]\.?\d*/)
  })
})
