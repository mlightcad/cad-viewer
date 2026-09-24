import type { AcGiLineTypePatternElement } from '@mlightcad/data-model'

import type { AcPdfPoint } from '../renderer/AcPdfStyle'

/**
 * Complex linetype pattern fields from RealDWG plus PDF-compatible aliases.
 */
export interface AcPdfComplexPatternElement extends AcGiLineTypePatternElement {
  text?: string
  shapeName?: string
  shapeNumber?: number
  scale?: number
  rotation?: number
  offsetX?: number
  offsetY?: number
  /** Legacy alias for {@link offsetX}. */
  xOffset?: number
  /** Legacy alias for {@link offsetY}. */
  yOffset?: number
  /** Style name when `styleObjectId` is absent. */
  style?: string
  styleObjectId?: string
}

export interface AcPdfLineWalkPlacement {
  x: number
  y: number
  /** Final world rotation in radians (tangent + relative, or absolute). */
  angle: number
  /** Unit tangent along the polyline at the placement. */
  tangentAngle: number
  element: AcPdfComplexPatternElement
}

export interface AcPdfLineWalkResult {
  strokes: AcPdfPoint[][]
  placements: AcPdfLineWalkPlacement[]
}

/** @deprecated Use {@link AcPdfLineWalkPlacement}. */
export type AcPdfLineWalkShape = AcPdfLineWalkPlacement

const EPS = 1e-9

/** DXF group 74 bit: absolute rotation (else relative to line tangent). */
export const COMPLEX_LTYPE_ABSOLUTE_ROTATION = 1
/** DXF group 74 bit: embedded text. */
export const COMPLEX_LTYPE_TEXT = 2
/** DXF group 74 bit: embedded shape. */
export const COMPLEX_LTYPE_SHAPE = 4

/** Valid DXF group-74 bit mask (abs | text | shape). */
const COMPLEX_LTYPE_FLAG_MASK =
  COMPLEX_LTYPE_ABSOLUTE_ROTATION |
  COMPLEX_LTYPE_TEXT |
  COMPLEX_LTYPE_SHAPE

/**
 * LibreDWG-web historically mapped `complex_shapecode` (DXF 75) to
 * `elementTypeFlag` and `shape_flag` (DXF 74) to `shapeNumber`. Detect that
 * swap so complex TEXT/SHAPE dashes are not treated as plain gaps.
 *
 * - Swapped TEXT: flag=0 (DXF 75), shapeNumber=2|3 (DXF 74) → restore flag,
 *   clear shapeNumber.
 * - Swapped SHAPE: flag=shapeCode (e.g. 132), shapeNumber=4|5 (DXF 74) →
 *   swap so flag is the mask and shapeNumber is the shape index.
 */
export function normalizeComplexPatternElement(
  element: AcGiLineTypePatternElement
): AcPdfComplexPatternElement {
  const el = element as AcPdfComplexPatternElement
  const flag = el.elementTypeFlag ?? 0
  const shapeNumber = el.shapeNumber
  const flagLooksPure = (flag & ~COMPLEX_LTYPE_FLAG_MASK) === 0
  const shapeNumLooksLikeFlag =
    shapeNumber != null &&
    shapeNumber !== 0 &&
    (shapeNumber & ~COMPLEX_LTYPE_FLAG_MASK) === 0

  if (shapeNumLooksLikeFlag && (flag === 0 || !flagLooksPure)) {
    return {
      ...el,
      elementTypeFlag: shapeNumber,
      // TEXT (DXF 75 = 0) clears the index; SHAPE keeps the real shape code.
      shapeNumber: flag === 0 ? 0 : flag
    }
  }
  return el
}

export function normalizeComplexPattern(
  pattern: AcGiLineTypePatternElement[] | undefined
): AcPdfComplexPatternElement[] | undefined {
  return pattern?.map(normalizeComplexPatternElement)
}

/**
 * True when a linetype pattern embeds SHAPE/TEXT elements.
 */
export function isComplexLineType(
  pattern: AcGiLineTypePatternElement[] | undefined
): boolean {
  return !!normalizeComplexPattern(pattern)?.some(
    element => element.elementTypeFlag !== 0
  )
}

export function isComplexTextElement(flag: number): boolean {
  return (flag & COMPLEX_LTYPE_TEXT) !== 0
}

export function isComplexShapeElement(flag: number): boolean {
  return (flag & COMPLEX_LTYPE_SHAPE) !== 0
}

/**
 * LibreDWG's JS dash binding often returns a single space for complex TEXT
 * elements while DXF group 9 / the linetype description still carry the label
 * (e.g. `6" VCP C700`). Prefer the pattern text when non-blank; otherwise take
 * the first description segment before the repeating ` - ` preview separator.
 */
export function resolveLinetypeEmbeddedText(
  elementText: string | undefined,
  description: string | undefined
): string {
  const raw = elementText ?? ''
  if (raw.trim().length > 0) {
    return raw
  }
  const desc = (description ?? '').trim()
  if (!desc) {
    return raw
  }
  const first = desc.split(/\s+-\s+/)[0]?.trim()
  return first || raw
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

function resolveOffsetX(element: AcPdfComplexPatternElement): number {
  return element.offsetX ?? element.xOffset ?? 0
}

function resolveOffsetY(element: AcPdfComplexPatternElement): number {
  return element.offsetY ?? element.yOffset ?? 0
}

function placementAngle(
  tangentAngle: number,
  element: AcPdfComplexPatternElement
): number {
  const rotation = element.rotation ?? 0
  if ((element.elementTypeFlag & COMPLEX_LTYPE_ABSOLUTE_ROTATION) !== 0) {
    return rotation
  }
  return uprightLinetypeAngle(tangentAngle + rotation)
}

/**
 * Keeps relative linetype text readable (AutoCAD U-rotation behaviour):
 * flip 180° when the tangent would draw the label upside-down.
 */
export function uprightLinetypeAngle(angle: number): number {
  const twoPi = Math.PI * 2
  let a = ((angle + Math.PI) % twoPi + twoPi) % twoPi - Math.PI
  if (a > Math.PI / 2 || a < -Math.PI / 2) {
    a += Math.PI
    if (a > Math.PI) {
      a -= twoPi
    }
  }
  return a
}

/**
 * Contiguous pen-up length starting at `index` (the complex element itself
 * plus following simple gaps within the same pattern cycle). Does not wrap
 * into the next cycle so a trailing complex element cannot absorb leading
 * gaps from the following repeat.
 */
function penUpSlotLength(
  scaled: Array<{
    len: number
    gap: boolean
    element: AcPdfComplexPatternElement
  }>,
  index: number
): number {
  const start = index % scaled.length
  let slot = scaled[start].len
  for (let i = start + 1; i < scaled.length; i++) {
    const item = scaled[i]
    if (item.element.elementTypeFlag !== 0) {
      break
    }
    if (!item.gap) {
      break
    }
    slot += item.len
  }
  return slot
}

/**
 * Walks a polyline with a CAD linetype pattern.
 *
 * Simple dash/gap elements become stroke pieces. Shape/text elements
 * (nonzero `elementTypeFlag`) are returned as placement records so the
 * renderer can inject glyphs.
 */
export function walkLineType(
  points: AcPdfPoint[],
  pattern: AcGiLineTypePatternElement[],
  scale: number
): AcPdfLineWalkResult {
  const strokes: AcPdfPoint[][] = []
  const placements: AcPdfLineWalkPlacement[] = []
  const normalized = normalizeComplexPattern(pattern) ?? []
  const total = polylineLength(points)
  if (!(total > EPS) || normalized.length === 0) {
    if (points.length >= 2) {
      strokes.push(points)
    }
    return { strokes, placements }
  }
  const scaled = normalized.map(element => {
    let len = element.elementLength
    if (len === 0) {
      len = 0.5
    }
    return {
      element,
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
    return { strokes, placements }
  }
  // AutoCAD: if a line is too short to hold even one dash sequence, draw a
  // continuous stroke between the endpoints (no partial dashes / TEXT / SHAPE).
  if (total + EPS < cycle) {
    strokes.push(points)
    return { strokes, placements }
  }
  let dist = 0
  let index = 0
  while (dist < total - EPS) {
    const item = scaled[index % scaled.length]
    const take = Math.min(item.len, total - dist)
    if (item.element.elementTypeFlag !== 0) {
      // Center text/shape in the pen-up slot (this element + following gaps),
      // then apply authored X/Y offsets in the line-local frame.
      const slot = penUpSlotLength(scaled, index % scaled.length)
      const at = pointAt(points, dist + Math.min(slot, total - dist) * 0.5)
      if (at) {
        const angle = placementAngle(at.angle, item.element)
        // Text uses MiddleCenter on the path centerline so the glyph
        // midline matches the flanking dashes. Authored X/Y offsets assume
        // AutoCAD baseline insertion and would double-shift with middle
        // attachment, so text keeps the centered on-path point. Shapes
        // apply both offsets in the line-local frame (X along tangent).
        const isText = isComplexTextElement(item.element.elementTypeFlag)
        const ox = isText ? 0 : resolveOffsetX(item.element) * scale
        const oy = isText ? 0 : resolveOffsetY(item.element) * scale
        const sin = Math.sin(at.angle)
        const cos = Math.cos(at.angle)
        placements.push({
          x: at.x + ox * cos - oy * sin,
          y: at.y + ox * sin + oy * cos,
          angle,
          tangentAngle: at.angle,
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
  return { strokes, placements }
}
