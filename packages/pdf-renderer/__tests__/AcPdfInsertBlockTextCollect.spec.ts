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

/**
 * Returns empty glyph geometry for the first `emptyCount` renders, then real
 * triangles — simulates SHX/CDN fonts that only settle after many collect
 * passes (the old 4-pass budget returned empty INSERT clones).
 */
function delayedGlyphProvider(emptyCount: number): AcPdfGlyphProvider {
  let renders = 0
  return {
    async renderMText(data) {
      renders++
      await Promise.resolve()
      if (renders <= emptyCount) {
        return {
          primitives: {
            triangles: new Float32Array(0),
            polylines: new Float32Array(0)
          },
          box: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
          actualText: data.text ?? ''
        }
      }
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

async function exportElevNoteWithDelayedGlyphs(emptyCount: number) {
  const {
    AcDbBlockReference,
    AcDbBlockTableRecord,
    AcDbDatabase,
    AcDbText,
    AcGePoint3d,
    acdbHostApplicationServices
  } = await import('@mlightcad/data-model')

  const db = new AcDbDatabase()
  acdbHostApplicationServices().workingDatabase = db

  const note = new AcDbBlockTableRecord()
  note.name = 'ELEV_NOTE'
  db.tables.blockTable.add(note)
  const label = new AcDbText()
  label.textString = '梁、板顶标高：36.250'
  label.height = 2.5
  label.position = new AcGePoint3d(1, 2, 0)
  note.appendEntity(label)

  const insert = new AcDbBlockReference('ELEV_NOTE')
  insert.position = new AcGePoint3d(100, 200, 0)
  db.tables.blockTable.modelSpace.appendEntity(insert)

  return exportDatabaseToPdf(db, {
    title: 'insert-block-text-late-glyph',
    textMode: 'vector',
    glyphProvider: delayedGlyphProvider(emptyCount),
    embedTextActualText: true
  })
}

describe('INSERT block TEXT collect after late glyph settle', () => {
  it('keeps block TEXT when glyphs only succeed after the deferred budget', async () => {
    // 8 deferred + settle walks see empty glyphs; a later pass fills the
    // cache and clones filled ops. Previously a hard 4-pass cap returned
    // empty clones.
    const bytes = await exportElevNoteWithDelayedGlyphs(8)
    const text = await contentText(bytes)
    const actual = Buffer.from('梁、板顶标高：36.250', 'utf8').toString('latin1')
    expect(text.includes('ActualText') || text.includes(actual)).toBe(true)
    // Nested note sits at INSERT(100,200) + local(1,2) ≈ (101,202).
    expect(text).toMatch(/10[01]\.?\d*\s+20[0-2]\.?\d*/)
  })

  it('keeps block TEXT when glyphs settle only on the last deferred await', async () => {
    // emptyCount=9: success lands on the final budgeted await; without a
    // post-await sync walk, INSERT clones would still hold empty _ops.
    const bytes = await exportElevNoteWithDelayedGlyphs(9)
    const text = await contentText(bytes)
    const actual = Buffer.from('梁、板顶标高：36.250', 'utf8').toString('latin1')
    expect(text.includes('ActualText') || text.includes(actual)).toBe(true)
    expect(text).toMatch(/10[01]\.?\d*\s+20[0-2]\.?\d*/)
  })
})
