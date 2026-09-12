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
  | AcPdfGradientOp

export function rgbFromPacked(packed: number): AcPdfRgb {
  return {
    r: ((packed >> 16) & 0xff) / 255,
    g: ((packed >> 8) & 0xff) / 255,
    b: (packed & 0xff) / 255
  }
}
