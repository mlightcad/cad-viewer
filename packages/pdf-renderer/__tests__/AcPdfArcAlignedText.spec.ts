import {
  AcGiMTextFlowDirection,
  type AcGiMTextData,
  type AcGiTextStyle
} from '@mlightcad/data-model'
import { readFileSync } from 'node:fs'
import { PDFDocument, PDFRawStream } from 'pdf-lib'
import pako from 'pako'

import { AcPdfFontManager } from '../src/pdf/AcPdfFontManager'
import { AcPdfEntity } from '../src/renderer/AcPdfEntity'
import { AcPdfRenderer } from '../src/renderer/AcPdfRenderer'
import type { AcPdfGlyphProvider } from '../src/text/AcPdfGlyphProvider'

const style: AcGiTextStyle = {
  name: 'Standard',
  standardFlag: 0,
  fixedTextHeight: 0.7,
  widthFactor: 1,
  obliqueAngle: 0,
  textGenerationFlag: 0,
  lastHeight: 0.7,
  font: 'arial',
  bigFont: ''
}

function makeGlyph(
  text: string,
  x: number,
  y: number,
  rotation: number
): AcGiMTextData {
  return {
    text,
    height: 0.7,
    width: Infinity,
    widthFactor: 1,
    position: { x, y, z: 0 },
    rotation,
    drawingDirection: AcGiMTextFlowDirection.BOTTOM_TO_TOP,
    attachmentPoint: 11
  }
}

function mockGlyphProvider(): AcPdfGlyphProvider {
  return {
    async renderMText(data) {
      return {
        primitives: {
          triangles: new Float32Array([0, 0, 0.5, 0, 0.25, 0.5]),
          polylines: new Float32Array(0)
        },
        box: { min: { x: 0, y: 0 }, max: { x: 0.5, y: 0.5 } },
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

function frameEntity() {
  const frame = new AcPdfEntity()
  frame.addOp({
    kind: 'stroke',
    points: [
      { x: 0, y: 0 },
      { x: 30, y: 30 }
    ],
    style: { rgb: { r: 0, g: 0, b: 0 }, opacity: 1, lineWidth: 0 }
  })
  frame.box.min.set(0, 0)
  frame.box.max.set(30, 30)
  return frame
}

describe('ArcAlignedText-like PDF export', () => {
  it('paints grouped Infinity-width glyphs as vector forms', async () => {
    const renderer = new AcPdfRenderer()
    renderer.configureExport({
      glyphProvider: mockGlyphProvider(),
      textMode: 'vector',
      background: 'none',
      title: 'arc-aligned-vector'
    })

    const glyphs = [
      renderer.mtext(makeGlyph('H', 10, 20, 0.3), style) as AcPdfEntity,
      renderer.mtext(makeGlyph('Y', 11, 21, 0.6), style) as AcPdfEntity,
      renderer.mtext(makeGlyph('D', 12, 22, 0.9), style) as AcPdfEntity
    ]
    const group = renderer.group(glyphs) as AcPdfEntity
    await renderer.awaitPending()

    let opCount = 0
    group.forEachOp(op => {
      if (op.kind === 'triangles') {
        opCount += 1
      }
    })
    expect(opCount).toBe(3)

    const bytes = await renderer.exportAsync([group, frameEntity()])
    const text = await contentText(bytes)
    expect(text).toContain('1 0 0 1 10 20 cm')
    expect(text).toContain('1 0 0 1 11 21 cm')
    expect(text).toContain('1 0 0 1 12 22 cm')
    expect(text).toMatch(/ActualText <FEFF0048>/)
  })

  it('paints grouped Infinity-width glyphs as real PDF text', async () => {
    const fontPath = 'C:/Windows/Fonts/arial.ttf'
    let fontBytes: Uint8Array
    try {
      fontBytes = new Uint8Array(readFileSync(fontPath))
    } catch {
      return
    }

    const renderer = new AcPdfRenderer()
    renderer.configureExport({
      glyphProvider: mockGlyphProvider(),
      textMode: 'text',
      background: 'none',
      title: 'arc-aligned-text'
    })
    renderer.textFontManager = new AcPdfFontManager(async name =>
      name.toLowerCase().includes('arial') ? fontBytes : undefined
    )

    const glyphs = [
      renderer.mtext(makeGlyph('H', 10, 20, 0.3), style) as AcPdfEntity,
      renderer.mtext(makeGlyph('Y', 11, 21, 0.6), style) as AcPdfEntity,
      renderer.mtext(makeGlyph('D', 12, 22, 0.9), style) as AcPdfEntity
    ]
    const group = renderer.group(glyphs) as AcPdfEntity
    await renderer.awaitPending()

    let textOps = 0
    let nonFinite = 0
    group.forEachOp(op => {
      if (op.kind === 'text') {
        textOps += 1
        if (!Number.isFinite(op.x) || !Number.isFinite(op.y)) {
          nonFinite += 1
        }
      }
    })
    expect(textOps).toBe(3)
    expect(nonFinite).toBe(0)

    const bytes = await renderer.exportAsync([group, frameEntity()])
    const text = await contentText(bytes)
    expect(text).toMatch(/Tj|TJ/)
    expect(text).toMatch(/10\.?\d*\s+20\.?\d*\s+Tm/)
  })

  it('keeps async text inside an INSERT after the two-pass collect', async () => {
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
      AcDbText,
      AcGePoint3d,
      acdbHostApplicationServices
    } = await import('@mlightcad/data-model')
    const { exportDatabaseToPdf } = await import('../src/AcPdfExport')

    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
    const blockRecord = new AcDbBlockTableRecord()
    blockRecord.name = 'HYDR'
    db.tables.blockTable.add(blockRecord)
    const label = new AcDbText()
    label.textString = 'HYD'
    label.height = 0.7
    label.position = new AcGePoint3d(0, 0, 0)
    blockRecord.appendEntity(label)
    const ring = new AcDbLine(
      new AcGePoint3d(-1, 0, 0),
      new AcGePoint3d(1, 0, 0)
    )
    blockRecord.appendEntity(ring)

    const insert = new AcDbBlockReference('HYDR')
    insert.position = new AcGePoint3d(10, 20, 0)
    db.tables.blockTable.modelSpace.appendEntity(insert)

    const bytes = await exportDatabaseToPdf(db, {
      title: 'insert-text',
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
    expect(
      text.includes('Tj') || text.includes('Do') || text.includes('TJ')
    ).toBe(true)
    expect(text).toMatch(/10\.?\d*\s+20\.?\d*/)
  })
})
