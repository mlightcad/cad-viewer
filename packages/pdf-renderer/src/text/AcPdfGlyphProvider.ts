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
 * One colour group inside a multi-colour MTEXT glyph set.
 *
 * Used when inline `\C` codes paint segments differently from the entity
 * colour; the PDF writer emits one triangles/polylines op per group.
 */
export interface AcPdfGlyphColorGroup {
  /** Packed 0xRRGGBB fill/stroke colour for this group. */
  rgb: number
  primitives: AcPdfGlyphPrimitives
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

/**
 * Colour context for resolving ByLayer / ByBlock while tessellating MTEXT.
 * Mirrors mtext-renderer's {@code ColorSettings} without importing it here.
 */
export interface AcPdfGlyphColorSettings {
  byLayerColor: number
  byBlockColor: number
  layer?: string
  /** Entity ACI when the entity uses an indexed colour (7 = foreground). */
  entityAci?: number | null
  /** Packed entity RGB when the entity uses a true colour. */
  entityRgb?: number | null
  entityIsByLayer?: boolean
  entityIsByBlock?: boolean
  entityIsForeground?: boolean
}

export interface AcPdfMTextGlyphResult {
  primitives: AcPdfGlyphPrimitives
  /**
   * Per-colour geometry when the MTEXT has inline `\C` overrides. When
   * present and non-empty, the writer prefers these over {@link primitives}
   * so `\C256` green is not painted with the entity white fill.
   */
  colorGroups?: AcPdfGlyphColorGroup[]
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
    style: AcGiTextStyle,
    colorSettings?: AcPdfGlyphColorSettings
  ): Promise<AcPdfMTextGlyphResult> | AcPdfMTextGlyphResult
  renderShape(
    shape: AcGiShapeData,
    style?: AcGiTextStyle
  ): Promise<AcPdfShapeGlyphResult> | AcPdfShapeGlyphResult
}
