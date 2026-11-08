/**
 * Intermediate SVG geometry used between DOM parse and AcDb entity creation.
 */

export interface AcDbSvgPoint {
  x: number
  y: number
}

/**
 * Resolved presentation style for a primitive (after inheritance + SVG defaults).
 */
export interface AcDbSvgStyle {
  /** Stroke paint; `'none'` means no stroke entity. */
  stroke?: string
  /** Fill paint; `'none'` means no hatch. Defaults to `#000000` for closed shapes. */
  fill?: string
  strokeWidth?: number
  /** Combined element opacity in [0, 1]. */
  opacity?: number
  fillOpacity?: number
  strokeOpacity?: number
  /** Dash lengths in user units (SVG `stroke-dasharray`). */
  strokeDasharray?: number[]
  textAnchor?: 'start' | 'middle' | 'end'
}

export type AcDbSvgPrimitive =
  | {
      kind: 'line'
      start: AcDbSvgPoint
      end: AcDbSvgPoint
      style: AcDbSvgStyle
    }
  | {
      kind: 'polyline'
      points: AcDbSvgPoint[]
      /** Per-vertex bulge; length matches `points` when present. */
      bulges?: number[]
      closed: boolean
      style: AcDbSvgStyle
    }
  | {
      kind: 'circle'
      center: AcDbSvgPoint
      radius: number
      style: AcDbSvgStyle
    }
  | {
      kind: 'ellipse'
      center: AcDbSvgPoint
      rx: number
      ry: number
      rotation: number
      style: AcDbSvgStyle
    }
  | {
      kind: 'text'
      position: AcDbSvgPoint
      text: string
      height: number
      rotation: number
      style: AcDbSvgStyle
    }

export interface AcDbSvgViewBox {
  minX: number
  minY: number
  width: number
  height: number
}

export interface AcDbSvgModel {
  viewBox: AcDbSvgViewBox
  primitives: AcDbSvgPrimitive[]
  skippedElementCount: number
}
