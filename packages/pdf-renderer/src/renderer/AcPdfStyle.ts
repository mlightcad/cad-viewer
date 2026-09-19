export interface AcPdfRgb {
  r: number
  g: number
  b: number
}

export interface AcPdfPoint {
  x: number
  y: number
}

export interface AcPdfStrokeStyle {
  rgb: AcPdfRgb
  opacity: number
  /** Stroke width in drawing units. `0` is a PDF hairline. */
  lineWidth: number
  dashArray?: number[]
  /**
   * When set, {@link lineWidth} is used as-is. The page minimum stroke
   * (kept so hairline CAD linework stays visible) must not apply to
   * linetype glyphs: that floor is often thicker than the embedded text
   * and turns SHX strokes into zoom-invariant blobs.
   */
  exactWidth?: boolean
}

export interface AcPdfFillStyle {
  rgb: AcPdfRgb
  opacity: number
}

export interface AcPdfGradientOp {
  kind: 'gradient'
  loops: AcPdfPoint[][]
  shadingType: 2 | 3
  coords: number[]
  c0: AcPdfRgb
  c1: AcPdfRgb
  /** Solid strips painted inside the hatch clip (CYLINDER etc.). */
  strips?: Array<{ points: AcPdfPoint[]; rgb: AcPdfRgb }>
  style: AcPdfFillStyle
}

export type AcPdfOp =
  | {
      kind: 'stroke'
      points: AcPdfPoint[]
      closed?: boolean
      style: AcPdfStrokeStyle
    }
  | {
      kind: 'fill'
      loops: AcPdfPoint[][]
      style: AcPdfFillStyle
    }
  | {
      kind: 'circle'
      x: number
      y: number
      r: number
      style: AcPdfFillStyle
    }
  | {
      kind: 'image'
      bytes: Uint8Array
      format: 'png' | 'jpg'
      x: number
      y: number
      width: number
      height: number
    }
  | {
      /**
       * Flat filled triangles in entity-local coordinates
       * (`[x0,y0,x1,y1,x2,y2, ...]`, 6 floats per triangle). One op carries a
       * whole glyph set so text-heavy drawings cost O(1) ops per MTEXT
       * instance instead of O(triangles). `data` is immutable and shared
       * across every instance of the same text; the writer serializes it once
       * into a Form XObject and re-invokes it per instance.
       */
      kind: 'triangles'
      data: Float32Array
      style: AcPdfFillStyle
    }
  | {
      /**
       * Flat open polylines in entity-local coordinates
       * (`[n, x0,y0, ..., n, ...]`, vertex count prefix per polyline), shared
       * and immutable like {@link 'triangles' data}. Painted inline (rare —
       * SHX shape strokes), with the matrix baked numerically.
       */
      kind: 'polylines'
      data: Float32Array
      style: AcPdfStrokeStyle
    }
  | {
      /**
       * One laid-out line of real PDF text in entity-local coordinates.
       *
       * Produced when `textMode: 'text'` resolves an embeddable font for the
       * text entity; each MTEXT/TEXT line costs one `BT…ET` block instead of
       * thousands of tessellated glyph triangles. `text` carries the plain
       * string; `hex` is filled in once per export by
       * {@link AcPdfFontManager.encodeOp} after the font is embedded with
       * pdf-lib's subset embedder (which tracks used glyphs through
       * `PDFFont.encodeText`).
       */
      kind: 'text'
      text: string
      /** Glyph-ID hex string (Identity-H); empty until encoded. */
      hex: string
      /** Embedded font key (the mapped font name). */
      font: string
      /** Font size in entity-local units. */
      size: number
      /** Baseline origin in entity-local coordinates. */
      x: number
      y: number
      /** Text rotation in degrees. */
      angleDeg: number
      /** Horizontal glyph scaling (CAD width factor, 1 = normal). */
      hScale: number
      /**
       * Mirrors glyphs about their local vertical axis (text plane with a
       * negative-determinant OCS, e.g. extrusion `(0,0,-1)`): the text
       * matrix x-axis is negated so glyph advances run along `-u` while the
       * up direction stays unchanged.
       */
      flipX?: boolean
      /** `\T` tracking: glyph advance multiplier, 1 = default. */
      tracking?: number
      /** `\Q` oblique shear angle in degrees (positive leans forward). */
      obliqueDeg?: number
      /**
       * Per-glyph subset glyph-id hex (tracking runs only). Filled by
       * {@link AcPdfFontManager.embedOp} alongside `charAdjust` so the
       * writer can emit one TJ array with per-glyph displacement numbers.
       */
      glyphHex?: string[]
      /**
       * TJ displacement after each glyph (thousandths of text-space units;
       * `charAdjust[i]` applies between glyph `i` and `i+1`).
       */
      charAdjust?: number[]
      style: AcPdfFillStyle
    }
  | AcPdfGradientOp

export function rgbFromPacked(packed: number): AcPdfRgb {
  return {
    r: ((packed >> 16) & 0xff) / 255,
    g: ((packed >> 8) & 0xff) / 255,
    b: (packed & 0xff) / 255
  }
}
