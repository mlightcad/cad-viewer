import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  AcDbBlockReference,
  AcDbDatabase,
  AcDbLine,
  AcDbMText,
  AcDbRotatedDimension,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

jest.mock('@mlightcad/cad-simple-viewer', () =>
  jest.requireActual(
    '../../cad-simple-viewer/src/command/draw/AcApDimBlockUtil'
  )
)

import {
  acapPdfCreateDimensions,
  acapPdfEnsureDimStyle,
  acapPdfNiceScale,
  PDF_DIM_STYLE
} from '../src/pdfDimensionConvert'
import {
  acapPdfAttachDimStrokeTexts,
  acapPdfDimTextsFromStrokeLines,
  acapPdfLookupDimStrokeTexts
} from '../src/pdfDimStrokeTexts'
import {
  type PdfLinearDimension,
  recognizePdfDimensions,
  suggestPdfDimensionScale
} from '../src/recognition/pdfDimensionPattern'
import { clusterPdfTextStrokes } from '../src/recognition/pdfGlyphClustering'
import { PdfGlyphDictionary } from '../src/recognition/pdfGlyphDictionary'

function loadDims() {
  const fixture = JSON.parse(
    readFileSync(
      join(__dirname, 'fixtures', 'r14-frozen-2-bottom-dim.json'),
      'utf8'
    )
  )
  const input: {
    segments: unknown
    polygons: unknown
    curves: unknown
    texts: unknown[]
  } = {
    segments: fixture.segments,
    polygons: fixture.polygons,
    curves: fixture.curves,
    texts: []
  }
  const strokes = fixture.segments
    .filter((s: { id: string }) => s.id.startsWith('t'))
    .map((s: { id: string; p0: unknown; p1: unknown }) => ({
      id: s.id,
      points: [s.p0, s.p1]
    }))
  const { lines } = clusterPdfTextStrokes(strokes)
  const texts = acapPdfLookupDimStrokeTexts(lines, new PdfGlyphDictionary())
  const { texts: recognized, unread } = acapPdfDimTextsFromStrokeLines(
    lines,
    texts
  )
  acapPdfAttachDimStrokeTexts(input as never, recognized, unread)
  return recognizePdfDimensions(input as never) as PdfLinearDimension<string>[]
}

function inspect(db: AcDbDatabase, dim: AcDbRotatedDimension) {
  const block = db.tables.blockTable.getAt(dim.dimBlockId!)!
  const entities = [...block.newIterator()]
  const lines = entities.filter((e): e is AcDbLine => e instanceof AcDbLine)
  const mtexts = entities.filter((e): e is AcDbMText => e instanceof AcDbMText)
  const inserts = entities.filter(
    (e): e is AcDbBlockReference => e instanceof AcDbBlockReference
  )
  inserts.sort((a, b) => a.position.x - b.position.x)
  return {
    styleName: dim.dimensionStyleName,
    effective: {
      dimtxt: dim.dimensionStyle.dimtxt,
      dimscale: dim.dimensionStyle.dimscale,
      dimse1: dim.dimensionStyle.dimse1,
      dimexo: dim.dimensionStyle.dimexo
    },
    extensionCount: lines.filter(
      e => Math.abs(e.endPoint.y - e.startPoint.y) > 20
    ).length,
    mtextHeights: mtexts.map(t => t.height),
    inserts: inserts.length,
    arrowRotations: inserts.map(i => i.rotation)
  }
}

function inflateStandard(db: AcDbDatabase) {
  const standard = db.tables.dimStyleTable.getAt('Standard')!
  standard.dimse1 = 1
  standard.dimse2 = 1
  standard.dimscale = 100
  standard.dimexo = 0.625
  standard.dimtxt = 2.5
}

describe('pdfdim dim-block sizing', () => {
  it('keeps measured sizes on PDF_DIM when Standard uses DIMSCALE 100', () => {
    const dims = loadDims()
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
    inflateStandard(db)
    const scale = acapPdfNiceScale(suggestPdfDimensionScale(dims) ?? 1)
    acapPdfEnsureDimStyle(db, dims, scale)
    const created = acapPdfCreateDimensions(
      db,
      dims,
      scale,
      undefined,
      PDF_DIM_STYLE
    )
    const info = inspect(db, created[0] as AcDbRotatedDimension)
    expect(info.mtextHeights[0]).toBeLessThan(10)
    expect(info.extensionCount).toBe(2)
    expect(info.effective.dimse1).toBe(0)
    // Inside arrows: start faces −u (π), end faces +u (0).
    expect(info.arrowRotations[0]).toBeCloseTo(Math.PI, 6)
    expect(info.arrowRotations[1]).toBeCloseTo(0, 6)
  })

  it('entity overrides keep Standard usable despite DIMSCALE 100 / DIMSE1', () => {
    const dims = loadDims()
    const db = new AcDbDatabase()
    db.createDefaultData()
    acdbHostApplicationServices().workingDatabase = db
    inflateStandard(db)
    const scale = acapPdfNiceScale(suggestPdfDimensionScale(dims) ?? 1)
    // Panel can assign an existing style without rewriting the table record.
    const created = acapPdfCreateDimensions(
      db,
      dims,
      scale,
      undefined,
      'Standard'
    )
    const info = inspect(db, created[0] as AcDbRotatedDimension)
    expect(info.styleName).toBe('Standard')
    // Table record is unchanged…
    expect(db.tables.dimStyleTable.getAt('Standard')!.dimscale).toBe(100)
    expect(db.tables.dimStyleTable.getAt('Standard')!.dimse1).toBe(1)
    // …but the dimension draws with recovered sizes.
    expect(info.effective.dimscale).toBe(1)
    expect(info.effective.dimse1).toBe(0)
    expect(info.effective.dimexo).toBe(0)
    expect(info.mtextHeights[0]).toBeLessThan(10)
    expect(info.extensionCount).toBe(2)
  })
})
