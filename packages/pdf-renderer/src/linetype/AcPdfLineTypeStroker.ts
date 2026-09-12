import type { AcGiLineTypePatternElement } from '@mlightcad/data-model'

import type { AcPdfPoint } from '../renderer/AcPdfStyle'

/** Extra fields present on complex linetype pattern elements. */
export interface AcPdfComplexPatternElement extends AcGiLineTypePatternElement {
  text?: string
  shapeName?: string
  shapeNumber?: number
  scale?: number
  rotation?: number
  xOffset?: number
  yOffset?: number
  style?: string
}

export interface AcPdfLineWalkShape {
  x: number
  y: number
  angle: number
  element: AcPdfComplexPatternElement
}

export interface AcPdfLineWalkResult {
  strokes: AcPdfPoint[][]
  shapes: AcPdfLineWalkShape[]
}

const EPS = 1e-9

/**
 * True when a linetype pattern embeds SHAPE/TEXT elements.
 */
export function isComplexLineType(
  pattern: AcGiLineTypePatternElement[] | undefined
): boolean {
  return !!pattern?.some(element => element.elementTypeFlag !== 0)
}

function polylineLength(points: AcPdfPoint[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return len
}

function pointAt(
  points: AcPdfPoint[],
  distance: number
): { x: number; y: number; angle: number } | null {
  if (points.length < 2) {
    return null
  }
  let remaining = Math.max(0, distance)
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const seg = Math.hypot(dx, dy)
    if (seg < EPS) {
      continue
    }
    if (remaining <= seg + EPS) {
      const t = remaining / seg
      return {
        x: points[i - 1].x + dx * t,
        y: points[i - 1].y + dy * t,
        angle: Math.atan2(dy, dx)
      }
    }
    remaining -= seg
  }
  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  return {
    x: last.x,
    y: last.y,
    angle: Math.atan2(last.y - prev.y, last.x - prev.x)
  }
}

function slicePolyline(
  points: AcPdfPoint[],
  start: number,
  end: number
): AcPdfPoint[] {
  if (end <= start + EPS || points.length < 2) {
    return []
  }
  const a = pointAt(points, start)
  const b = pointAt(points, end)
  if (!a || !b) {
    return []
  }
  const out: AcPdfPoint[] = [{ x: a.x, y: a.y }]
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const seg = Math.hypot(dx, dy)
    const next = acc + seg
    if (next > start + EPS && acc < end - EPS) {
      if (acc > start + EPS) {
        out.push({ x: points[i - 1].x, y: points[i - 1].y })
      }
      if (next < end - EPS) {
        out.push({ x: points[i].x, y: points[i].y })
      }
    }
    acc = next
  }
  out.push({ x: b.x, y: b.y })
  return out
}

/**
 * Walks a polyline with a CAD linetype pattern.
 *
 * Simple dash/gap elements become stroke pieces. Shape/text elements
 * (nonzero `elementTypeFlag`) are returned as placement records so the
 * renderer can inject SHAPE glyphs.
 */
export function walkLineType(
  points: AcPdfPoint[],
  pattern: AcGiLineTypePatternElement[],
  scale: number
): AcPdfLineWalkResult {
  const strokes: AcPdfPoint[][] = []
  const shapes: AcPdfLineWalkShape[] = []
  const total = polylineLength(points)
  if (!(total > EPS) || pattern.length === 0) {
    if (points.length >= 2) {
      strokes.push(points)
    }
    return { strokes, shapes }
  }
  const scaled = pattern.map(element => {
    let len = element.elementLength
    if (len === 0) {
      len = 0.5
    }
    return {
      element: element as AcPdfComplexPatternElement,
      len: Math.abs(len) * scale,
      gap: element.elementTypeFlag === 0 && element.elementLength < 0
    }
  })
  let cycle = 0
  for (const item of scaled) {
    cycle += item.len
  }
  if (!(cycle > EPS)) {
    strokes.push(points)
    return { strokes, shapes }
  }
  let dist = 0
  let index = 0
  while (dist < total - EPS) {
    const item = scaled[index % scaled.length]
    const take = Math.min(item.len, total - dist)
    if (item.element.elementTypeFlag !== 0) {
      const at = pointAt(points, dist)
      if (at) {
        shapes.push({
          x: at.x,
          y: at.y,
          angle: at.angle + (item.element.rotation ?? 0),
          element: item.element
        })
      }
    } else if (!item.gap && take > EPS) {
      const piece = slicePolyline(points, dist, dist + take)
      if (piece.length >= 2) {
        strokes.push(piece)
      }
    }
    dist += take
    index++
  }
  return { strokes, shapes }
}
