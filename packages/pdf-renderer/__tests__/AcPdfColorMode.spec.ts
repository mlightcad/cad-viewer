import {
  AcDbDatabase,
  AcDbLine,
  acdbHostApplicationServices,
  AcGePoint3d
} from '@mlightcad/data-model'
import pako from 'pako'
import { PDFDocument, PDFRawStream } from 'pdf-lib'

import { exportDatabaseToPdf } from '../src/AcPdfExport'
import { AcPdfDocumentWriter } from '../src/pdf/AcPdfDocumentWriter'
import { AcPdfEntity } from '../src/renderer/AcPdfEntity'

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

/** Every colour operator (`r g b rg` / `r g b RG`) in the content streams. */
function colorOperators(content: string): string[] {
  return [
    ...content.matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (rg|RG)\b/g)
  ].map(m => `${m[1]} ${m[2]} ${m[3]} ${m[4]}`)
}

function colorfulEntity(): AcPdfEntity {
  const entity = new AcPdfEntity()
  entity.box.min.set(0, 0)
  entity.box.max.set(100, 50)
  entity.addOp({
    kind: 'stroke',
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 50 }
    ],
    style: { rgb: { r: 1, g: 0, b: 0 }, opacity: 1, lineWidth: 0 }
  })
  entity.addOp({
    kind: 'fill',
    loops: [
      [
        { x: 10, y: 10 },
        { x: 30, y: 10 },
        { x: 30, y: 30 }
      ]
    ],
    style: { rgb: { r: 0, g: 0.5, b: 1 }, opacity: 1 }
  })
  // Wipeout: paints the paper colour and must keep masking in monochrome.
  entity.addOp({
    kind: 'fill',
    loops: [
      [
        { x: 50, y: 10 },
        { x: 70, y: 10 },
        { x: 70, y: 30 }
      ]
    ],
    style: { rgb: { r: 1, g: 1, b: 1 }, opacity: 1, paper: true }
  })
  return entity
}

describe('PDF color mode', () => {
  it('keeps entity colours by default', async () => {
    const bytes = await AcPdfDocumentWriter.write([colorfulEntity()], {
      insunits: 4,
      background: 'none'
    })
    const ops = colorOperators(await contentText(bytes))
    expect(ops).toContain('1 0 0 RG')
    expect(ops).toContain('0 0.5 1 rg')
  })

  it('paints linework black and area fills grey in monochrome mode, keeping wipeouts white', async () => {
    const bytes = await AcPdfDocumentWriter.write([colorfulEntity()], {
      insunits: 4,
      background: 'none',
      colorMode: 'monochrome'
    })
    const ops = colorOperators(await contentText(bytes))
    expect(ops).toHaveLength(3)
    expect(ops[0]).toBe('0 0 0 RG')
    // Blue-ish fill → luminance grey (0.299·0 + 0.587·0.5 + 0.114·1).
    const [r, g, b, op] = ops[1].split(' ')
    expect(op).toBe('rg')
    expect(r).toBe(g)
    expect(g).toBe(b)
    expect(Number(r)).toBeCloseTo(0.4075, 3)
    expect(ops[2]).toBe('1 1 1 rg')
  })

  it('exports a coloured line as black on white paper', async () => {
    const db = new AcDbDatabase()
    acdbHostApplicationServices().workingDatabase = db
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(100, 50, 0)
    )
    line.color.colorIndex = 1
    db.tables.blockTable.modelSpace.appendEntity(line)

    const color = colorOperators(
      await contentText(await exportDatabaseToPdf(db, { title: 'color' }))
    )
    expect(color.some(op => op !== '0 0 0 RG' && op.endsWith('RG'))).toBe(true)

    // A dark background is ignored: monochrome output is always white paper.
    const mono = colorOperators(
      await contentText(
        await exportDatabaseToPdf(db, {
          title: 'mono',
          background: 0x202020,
          colorMode: 'monochrome'
        })
      )
    )
    expect(mono.length).toBeGreaterThan(0)
    expect(mono.every(op => op.startsWith('0 0 0 '))).toBe(true)
  })
})
