/**
 * Intermediate SVG geometry used between DOM parse and AcDb entity creation.
 */

export interface AcDbSvgPoint {
  x: number
  y: number
}

export interface AcDbSvgStyle {
  stroke?: string
  strokeWidth?: number
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
