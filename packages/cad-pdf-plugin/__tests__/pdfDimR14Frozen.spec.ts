import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  acapPdfAttachDimStrokeTexts,
  acapPdfDimTextsFromStrokeLines,
  acapPdfLookupDimStrokeTexts
} from '../src/pdfDimStrokeTexts'
import {
  type PdfDimInput,
  type PdfLinearDimension,
  recognizePdfDimensions
} from '../src/recognition/pdfDimensionPattern'
import { clusterPdfTextStrokes } from '../src/recognition/pdfGlyphClustering'
import { PdfGlyphDictionary } from '../src/recognition/pdfGlyphDictionary'

/**
 * Geometry captured from a Recover-mode import of `r14-frozen-2.pdf`: the
 * bottom horizontal dimension between the lower hole centres (value 55),
 * with value text still as stroke lines.
 */
type Fixture = {
  segments: Array<{
    id: string
    p0: { x: number; y: number }
    p1: { x: number; y: number }
  }>
  polygons: Array<{
    id: string
    vertices: Array<{ x: number; y: number }>
  }>
  curves: Array<{ center: { x: number; y: number }; radius: number }>
}

function loadFixture(): Fixture {
  return JSON.parse(
    readFileSync(
      join(__dirname, 'fixtures', 'r14-frozen-2-bottom-dim.json'),
      'utf8'
    )
  ) as Fixture
}

describe('pdfdim r14-frozen-2 bottom dimension', () => {
  it('recovers the stroke-text "55" dimension without AcDbText', () => {
    const fixture = loadFixture()
    const input: PdfDimInput<string> = {
      segments: fixture.segments,
      polygons: fixture.polygons,
      curves: fixture.curves,
      texts: []
    }
    expect(input.texts).toHaveLength(0)

    // Before the fix: arrows pair, but nearestText finds nothing → 0 results.
    expect(recognizePdfDimensions(input)).toHaveLength(0)

    const strokeSegs = fixture.segments.filter(s => s.id.startsWith('t'))
    const strokes = strokeSegs.map(s => ({
      id: s.id,
      points: [s.p0, s.p1]
    }))
    const { lines } = clusterPdfTextStrokes(strokes)
    expect(lines.length).toBeGreaterThanOrEqual(1)

    const texts = acapPdfLookupDimStrokeTexts(lines, new PdfGlyphDictionary())
    const { texts: recognized, unread } = acapPdfDimTextsFromStrokeLines(
      lines,
      texts
    )
    acapPdfAttachDimStrokeTexts(input, recognized, unread)
    expect(
      input.texts.length + (input.unreadTexts?.length ?? 0)
    ).toBeGreaterThanOrEqual(1)

    const dims = recognizePdfDimensions(input) as PdfLinearDimension<string>[]
    expect(dims.length).toBeGreaterThanOrEqual(1)
    const dim = dims.find(d => Math.abs(d.measured - 55) < 0.5)
    expect(dim).toBeDefined()
    expect(dim!.text.text).toBe('55')
    // Inside arrows (pointing apart); outside would flip the dim-block inserts.
    expect(dim!.arrowsOut).toBe(false)
    // Extension lines must reach the object side (above the dim line), not
    // collapse to the arrow tips — otherwise the verticals vanish after erase.
    expect(dim!.xLine1.y).toBeGreaterThan(200)
    expect(dim!.xLine2.y).toBeGreaterThan(200)
    expect(dim!.dimLinePoint.y).toBeCloseTo(185.637, 2)
    expect(dim!.extensionBeyond).toBeGreaterThan(0.5)
    expect(dim!.consumed).toEqual(
      expect.arrayContaining(['a0', 'a1', 'dim', 'ext0', 'ext1'])
    )
    // Stroke digits are erased with the dimension.
    expect(dim!.consumed.some(id => String(id).startsWith('t'))).toBe(true)
  })
})
