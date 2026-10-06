import type { AcPdfPoint } from '../renderer/AcPdfStyle'

/**
 * Radius of the screen-style center mark, as a fraction of {@link resolvePointDisplayScale}.
 *
 * Circle and square frames use radius `0.5` in unit space. The center mark must
 * stay a dot inside that frame; a radius of `0.5` fills the symbol and looks
 * like a plain disk.
 */
export const POINT_CENTER_DOT_RATIO = 0.06

export interface AcPdfPointStroke {
  points: AcPdfPoint[]
  closed?: boolean
}

export interface AcPdfPointSymbol {
  strokes: AcPdfPointStroke[]
  /**
   * `PDMODE` 0, 32, 64, and 96 include a center dot. Mode 0 is only that dot.
   */
  centerDot: boolean
}

/**
 * Scale applied to unit point-symbol templates.
 *
 * Positive `PDSIZE` is an absolute size in drawing units (circle diameter
 * equals this value). Non-positive sizes keep the unit template, matching
 * the canvas viewer. Viewport-relative `PDSIZE` is not applied here.
 */
export function resolvePointDisplayScale(displaySize: number): number {
  return displaySize > 0 ? displaySize : 1
}

/**
 * Builds an AutoCAD point marker in unit space, centered on the origin.
 *
 * `PDMODE` packs a base glyph (`0`–`4`) and an optional frame (`32` circle,
 * `64` square, `96` both). Geometry matches the canvas viewer: plus and X
 * extend to `1`, the circle and square have diameter `1`, and the tick runs
 * from the origin to `(0, 0.5)`.
 */
export function buildPointSymbol(displayMode: number): AcPdfPointSymbol {
  const mode = Number.isFinite(displayMode) ? Math.trunc(displayMode) : 0
  const base = mode % 32
  const frame = Math.floor(mode / 32)
  if (mode < 0 || base > 4 || frame > 3) {
    return { strokes: [], centerDot: true }
  }

  const strokes: AcPdfPointStroke[] = []
  if (frame === 1 || frame === 3) {
    strokes.push({ points: circlePoints(0.5, 24), closed: true })
  }
  if (frame === 2 || frame === 3) {
    strokes.push({
      points: [
        { x: -0.5, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 0.5, y: -0.5 },
        { x: -0.5, y: -0.5 }
      ],
      closed: true
    })
  }
  if (base === 2) {
    strokes.push(
      { points: [{ x: -1, y: 0 }, { x: 1, y: 0 }] },
      { points: [{ x: 0, y: -1 }, { x: 0, y: 1 }] }
    )
  } else if (base === 3) {
    const s = Math.SQRT1_2
    strokes.push(
      { points: [{ x: -s, y: s }, { x: s, y: -s }] },
      { points: [{ x: -s, y: -s }, { x: s, y: s }] }
    )
  } else if (base === 4) {
    strokes.push({ points: [{ x: 0, y: 0 }, { x: 0, y: 0.5 }] })
  }

  return { strokes, centerDot: base === 0 }
}

function circlePoints(radius: number, segments: number): AcPdfPoint[] {
  const points: AcPdfPoint[] = []
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    })
  }
  return points
}
