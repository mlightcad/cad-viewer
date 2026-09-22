import type {
  AcGePoint3dLike,
  AcGiLineTypePatternElement
} from '@mlightcad/data-model'

/**
 * Complex linetype pattern fields from RealDWG plus PDF-compatible aliases.
 */
export interface AcTrComplexPatternElement extends AcGiLineTypePatternElement {
  text?: string
  shapeName?: string
  shapeNumber?: number
  scale?: number
  rotation?: number
  offsetX?: number
  offsetY?: number
  /** PDF / legacy alias for {@link offsetX}. */
  xOffset?: number
  /** PDF / legacy alias for {@link offsetY}. */
  yOffset?: number
  /** PDF / legacy style name (when `styleObjectId` is absent). */
  style?: string
}

export interface AcTrLineWalkPoint {
  x: number
  y: number
  z?: number
}

export interface AcTrLineWalkPlacement {
  x: number
  y: number
  z: number
  /** Final world rotation in radians (tangent + relative, or absolute). */
  angle: number
  /** Unit tangent along the polyline at the placement. */
  tangentAngle: number
  element: AcTrComplexPatternElement
}

export interface AcTrLineWalkResult {
  strokes: AcTrLineWalkPoint[][]
  placements: AcTrLineWalkPlacement[]
}

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
): AcTrComplexPatternElement {
  const el = element as AcTrComplexPatternElement
  const flag = el.elementTypeFlag ?? 0
  const shapeNumber = el.shapeNumber
  const flagLooksPure = (flag & ~COMPLEX_LTYPE_FLAG_MASK) === 0
  const shapeNumLooksLikeFlag =
    shapeNumber != null &&
    shapeNumber !== 0 &&
    (shapeNumber & ~COMPLEX_LTYPE_FLAG_MASK) === 0

  if (
    shapeNumLooksLikeFlag &&
    // flag === 0: DXF 75 was stored in elementTypeFlag (TEXT, shapecode 0).
    // flag >= 16: a real shape code was stored in elementTypeFlag (e.g. 132)
    // while DXF 74 landed in shapeNumber. Small impure values such as 10 are
    // stray LibreDWG shape_flag bits on simple dashes (BORDER2), not shape
    // codes — swapping those invents a SHAPE element whose "shape number" is
    // the dash index.
    (flag === 0 || (!flagLooksPure && flag >= 16))
  ) {
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
): AcTrComplexPatternElement[] | undefined {
  return pattern?.map(normalizeComplexPatternElement)
}

/**
 * True when one pattern element is a real embedded TEXT or SHAPE.
 *
 * LibreDWG sometimes writes a non-zero `shape_flag` on ordinary dashes
 * (BORDER2 / DASHEDX2 use 10, DASHDOTX2 uses 4 with shape number 0). Those
 * are not TEXT/SHAPE elements: treating them as complex stamps the linetype
 * preview, or an empty shape, once per pattern cycle and the line looks like
 * it was drawn many times.
 *
 * A text element counts when `text` is non-empty, including a single space —
 * that space is LibreDWG's stand-in for a label that still lives in the
 * linetype description. A shape element counts only with a non-zero shape
 * number or a shape name.
 */
export function isComplexPatternElement(
  element: AcTrComplexPatternElement
): boolean {
  const flag = element.elementTypeFlag ?? 0
  if (isComplexTextElement(flag)) {
    return (element.text ?? '').length > 0
  }
  if (isComplexShapeElement(flag)) {
    return (
      (element.shapeNumber != null && element.shapeNumber !== 0) ||
      !!element.shapeName
    )
  }
  return false
}

/**
 * True when a linetype pattern embeds SHAPE/TEXT elements.
 */
export function isComplexLineType(
  pattern: AcGiLineTypePatternElement[] | undefined
): boolean {
  const normalized = normalizeComplexPattern(pattern)
  const strict = !!normalized?.some(isComplexPatternElement)
  return strict
}

export function isComplexTextElement(flag: number): boolean {
  return (flag & COMPLEX_LTYPE_TEXT) !== 0
}

export function isComplexShapeElement(flag: number): boolean {
  return (flag & COMPLEX_LTYPE_SHAPE) !== 0
}

function polylineLength(points: AcTrLineWalkPoint[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y
    )
  }
  return len
}

function pointAt(
  points: AcTrLineWalkPoint[],
  distance: number
): { x: number; y: number; z: number; angle: number } | null {
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
      const z0 = points[i - 1].z ?? 0
      const z1 = points[i].z ?? 0
      return {
        x: points[i - 1].x + dx * t,
        y: points[i - 1].y + dy * t,
        z: z0 + (z1 - z0) * t,
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
    z: last.z ?? 0,
    angle: Math.atan2(last.y - prev.y, last.x - prev.x)
  }
}

function slicePolyline(
  points: AcTrLineWalkPoint[],
  start: number,
  end: number
): AcTrLineWalkPoint[] {
  if (end <= start + EPS || points.length < 2) {
    return []
  }
  const a = pointAt(points, start)
  const b = pointAt(points, end)
  if (!a || !b) {
    return []
  }
  const out: AcTrLineWalkPoint[] = [{ x: a.x, y: a.y, z: a.z }]
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const seg = Math.hypot(dx, dy)
    const next = acc + seg
    if (next > start + EPS && acc < end - EPS) {
      if (acc > start + EPS) {
        out.push({
          x: points[i - 1].x,
          y: points[i - 1].y,
          z: points[i - 1].z ?? 0
        })
      }
      if (next < end - EPS) {
        out.push({
          x: points[i].x,
          y: points[i].y,
          z: points[i].z ?? 0
        })
      }
    }
    acc = next
  }
  out.push({ x: b.x, y: b.y, z: b.z })
  return out
}

function resolveOffsetX(element: AcTrComplexPatternElement): number {
  return element.offsetX ?? element.xOffset ?? 0
}

function resolveOffsetY(element: AcTrComplexPatternElement): number {
  return element.offsetY ?? element.yOffset ?? 0
}

function placementAngle(
  tangentAngle: number,
  element: AcTrComplexPatternElement
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
    isComplex?: boolean
    element: AcTrComplexPatternElement
  }>,
  index: number
): number {
  const start = index % scaled.length
  let slot = scaled[start].len
  for (let i = start + 1; i < scaled.length; i++) {
    const item = scaled[i]
    if (item.isComplex ?? isComplexPatternElement(item.element)) {
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
  points: AcGePoint3dLike[] | AcTrLineWalkPoint[],
  pattern: AcGiLineTypePatternElement[],
  scale: number
): AcTrLineWalkResult {
  const pts: AcTrLineWalkPoint[] = points.map(p => ({
    x: p.x,
    y: p.y,
    z: 'z' in p && typeof p.z === 'number' ? p.z : 0
  }))
  const strokes: AcTrLineWalkPoint[][] = []
  const placements: AcTrLineWalkPlacement[] = []
  const normalized = normalizeComplexPattern(pattern) ?? []
  const total = polylineLength(pts)
  if (!(total > EPS) || normalized.length === 0) {
    if (pts.length >= 2) {
      strokes.push(pts)
    }
    return { strokes, placements }
  }
  const scaled = normalized.map(element => {
    let len = element.elementLength
    if (len === 0) {
      len = 0.5
    }
    const isComplex = isComplexPatternElement(element)
    return {
      element,
      len: Math.abs(len) * scale,
      gap: !isComplex && element.elementLength < 0,
      isComplex
    }
  })
  let cycle = 0
  for (const item of scaled) {
    cycle += item.len
  }
  if (!(cycle > EPS)) {
    strokes.push(pts)
    return { strokes, placements }
  }
  let dist = 0
  let index = 0
  while (dist < total - EPS) {
    const item = scaled[index % scaled.length]
    const take = Math.min(item.len, total - dist)
    if (item.isComplex) {
      // Center text/shape in the pen-up slot (this element + following gaps),
      // then apply authored X/Y offsets in the line-local frame. AutoCAD
      // embeds labels in the space between dashes; placing at slot start
      // with a large negative X pulls glyphs back onto the previous dash.
      const slot = penUpSlotLength(scaled, index % scaled.length)
      const at = pointAt(pts, dist + Math.min(slot, total - dist) * 0.5)
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
          z: at.z,
          angle,
          tangentAngle: at.angle,
          element: item.element
        })
      }
    } else if (!item.gap && take > EPS) {
      const piece = slicePolyline(pts, dist, dist + take)
      if (piece.length >= 2) {
        strokes.push(piece)
      }
    }
    dist += take
    index++
  }
  return { strokes, placements }
}
