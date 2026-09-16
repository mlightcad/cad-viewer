import {
  AcGiMTextData,
  AcGiShapeData,
  AcGiTextStyle
} from '@mlightcad/data-model'

/**
 * Flat geometry buffers for one rendered glyph set (one TEXT/MTEXT/SHAPE).
 *
 * Coordinates are relative to the text's own insertion point, so the values
 * stay small and exact in float32 even on survey-scale drawings; callers
 * re-position instances through a matrix. Buffers are immutable once handed
 * to the renderer and shared freely between cache entries and cloned
 * entities.
 *
 * - `triangles`: `[x0,y0, x1,y1, x2,y2, ...]` — 6 floats per filled triangle.
 * - `polylines`: `[n, x0,y0, ..., x(n-1),y(n-1), n, ...]` — each open polyline
 *   prefixed by its vertex count.
 */
export interface AcPdfGlyphPrimitives {
  triangles: Float32Array
  polylines: Float32Array
}

/**
 * Optional host-supplied glyph engine.
 *
 * `pdf-renderer` stays free of Three.js / mtext-renderer. Viewers inject an
 * implementation that returns stroke/fill geometry in text-local CAD units.
 *
 * Results must be compact: one large drawing carries tens of thousands of
 * MTEXT instances, and per-point object graphs (`{x, y}` arrays) retained for
 * every unique text exhaust the tab's heap.
 */
export interface AcPdfGlyphBox {
  min: { x: number; y: number }
  max: { x: number; y: number }
}

export interface AcPdfMTextGlyphResult {
  primitives: AcPdfGlyphPrimitives
  actualText: string
  box: AcPdfGlyphBox
}

export interface AcPdfShapeGlyphResult {
  primitives: AcPdfGlyphPrimitives
  box: AcPdfGlyphBox
}

export interface AcPdfGlyphProvider {
  renderMText(
    data: AcGiMTextData,
    style: AcGiTextStyle
  ): Promise<AcPdfMTextGlyphResult> | AcPdfMTextGlyphResult
  renderShape(
    shape: AcGiShapeData,
    style?: AcGiTextStyle
  ): Promise<AcPdfShapeGlyphResult> | AcPdfShapeGlyphResult
}
