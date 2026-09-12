import {
  AcGiMTextData,
  AcGiShapeData,
  AcGiTextStyle
} from '@mlightcad/data-model'

/**
 * Optional host-supplied glyph engine.
 *
 * `pdf-renderer` stays free of Three.js / mtext-renderer. Viewers inject an
 * implementation that returns stroke/fill primitives in CAD world coordinates.
 */
export interface AcPdfGlyphPrimitive {
  kind: 'stroke' | 'fill'
  points: Array<{ x: number; y: number }>
}

export interface AcPdfGlyphBox {
  min: { x: number; y: number }
  max: { x: number; y: number }
}

export interface AcPdfMTextGlyphResult {
  primitives: AcPdfGlyphPrimitive[]
  actualText: string
  box: AcPdfGlyphBox
}

export interface AcPdfShapeGlyphResult {
  primitives: AcPdfGlyphPrimitive[]
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
