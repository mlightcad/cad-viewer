import type { AcPdfPoint } from '../renderer/AcPdfStyle'

/** One AutoCAD hatch pattern definition line. */
export interface AcPdfHatchPatternLine {
  angle: number
  base: { x: number; y: number }
  offset: { x: number; y: number }
  dashLengths: number[]
}

const EPS = 1e-9
const MAX_PATTERN_LINES = 8000

function rotate(x: number, y: number, angle: number): { x: number; y: number } {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: c * x - s * y, y: c * y + s * x }
}

function pointInEvenOdd(
  x: number,
  y: number,
  loops: AcPdfPoint[][]
): boolean {
  let inside = false
  for (const loop of loops) {
    const n = loop.length
    if (n < 3) {
      continue
    }
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const yi = loop[i].y
      const yj = loop[j].y
      const xi = loop[i].x
      const xj = loop[j].x
      const intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi + (yj === yi ? EPS : 0)) + xi
      if (intersect) {
        inside = !inside
      }
    }
  }
  return inside
}

function segmentIntersectT(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): number | null {
  const rX = bx - ax
  const rY = by - ay
  const sX = dx - cx
  const sY = dy - cy
  const den = rX * sY - rY * sX
  if (Math.abs(den) < EPS) {
    return null
  }
  const t = ((cx - ax) * sY - (cy - ay) * sX) / den
  const u = ((cx - ax) * rY - (cy - ay) * rX) / den
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) {
    return null
  }
  return Math.min(1, Math.max(0, t))
}

/**
 * Clips an infinite-direction segment to even-odd hatch loops.
 */
export function clipSegmentToLoops(
  a: AcPdfPoint,
  b: AcPdfPoint,
  loops: AcPdfPoint[][]
): Array<[AcPdfPoint, AcPdfPoint]> {
  const ts = [0, 1]
  for (const loop of loops) {
    const n = loop.length
    if (n < 2) {
      continue
    }
    for (let i = 0; i < n; i++) {
      const c = loop[i]
      const d = loop[(i + 1) % n]
      const t = segmentIntersectT(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y)
      if (t != null) {
        ts.push(t)
      }
    }
  }
  ts.sort((p, q) => p - q)
  const unique: number[] = []
  for (const t of ts) {
    if (unique.length === 0 || Math.abs(t - unique[unique.length - 1]) > 1e-8) {
      unique.push(t)
    }
  }
  const out: Array<[AcPdfPoint, AcPdfPoint]> = []
  for (let i = 0; i + 1 < unique.length; i++) {
    const t0 = unique[i]
    const t1 = unique[i + 1]
    if (t1 - t0 < 1e-8) {
      continue
    }
    const mx = a.x + (b.x - a.x) * (t0 + t1) * 0.5
    const my = a.y + (b.y - a.y) * (t0 + t1) * 0.5
    if (!pointInEvenOdd(mx, my, loops)) {
      continue
    }
    out.push([
      { x: a.x + (b.x - a.x) * t0, y: a.y + (b.y - a.y) * t0 },
      { x: a.x + (b.x - a.x) * t1, y: a.y + (b.y - a.y) * t1 }
    ])
  }
  return out
}

function dashSegment(
  a: AcPdfPoint,
  b: AcPdfPoint,
  dashLengths: number[],
  phaseShift: number
): Array<[AcPdfPoint, AcPdfPoint]> {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (!(len > EPS)) {
    return []
  }
  if (!dashLengths.length) {
    return [[a, b]]
  }
  let patternLen = 0
  const absDashes = dashLengths.map(value => {
    const abs = Math.abs(value) < EPS ? 0.005 : Math.abs(value)
    patternLen += abs
    return { signed: value === 0 ? abs : value, abs }
  })
  if (!(patternLen > EPS)) {
    return [[a, b]]
  }
  let pos = 0
  let cursor = ((phaseShift % patternLen) + patternLen) % patternLen
  let dashIndex = 0
  let consumed = 0
  for (let i = 0; i < absDashes.length; i++) {
    if (cursor < consumed + absDashes[i].abs - EPS) {
      dashIndex = i
      cursor -= consumed
      break
    }
    consumed += absDashes[i].abs
    if (i === absDashes.length - 1) {
      dashIndex = 0
      cursor = 0
    }
  }
  const out: Array<[AcPdfPoint, AcPdfPoint]> = []
  while (pos < len - EPS) {
    const dash = absDashes[dashIndex % absDashes.length]
    const remaining = dash.abs - cursor
    const take = Math.min(remaining, len - pos)
    if (dash.signed >= 0) {
      const t0 = pos / len
      const t1 = (pos + take) / len
      out.push([
        { x: a.x + dx * t0, y: a.y + dy * t0 },
        { x: a.x + dx * t1, y: a.y + dy * t1 }
      ])
    }
    pos += take
    cursor += take
    if (cursor >= dash.abs - EPS) {
      cursor = 0
      dashIndex++
    }
  }
  return out
}

function loopsBox(loops: AcPdfPoint[][]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const loop of loops) {
    for (const p of loop) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  if (!Number.isFinite(minX)) {
    return null
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Generates WCS stroke segments for a patterned hatch, matching the
 * Three.js hatch shader (offset in line-local space, `patternAngle` extra).
 */
export function tessellateHatchPattern(
  loops: AcPdfPoint[][],
  definitionLines: AcPdfHatchPatternLine[],
  patternAngle = 0
): AcPdfPoint[][] {
  const box = loopsBox(loops)
  if (!box || definitionLines.length === 0) {
    return []
  }
  const segments: AcPdfPoint[][] = []
  const pad = Math.max(box.maxX - box.minX, box.maxY - box.minY, 1) * 2
  for (const line of definitionLines) {
    const angle = (line.angle || 0) + patternAngle
    const base = rotate(line.base?.x ?? 0, line.base?.y ?? 0, patternAngle)
    const offset = rotate(line.offset?.x ?? 0, line.offset?.y ?? 0, -(line.angle || 0))
    const spacing = Math.abs(offset.y) > EPS ? offset.y : Math.hypot(offset.x, offset.y)
    if (!(Math.abs(spacing) > EPS)) {
      continue
    }
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const toLocal = (x: number, y: number) => {
      const dx = x - base.x
      const dy = y - base.y
      return { x: c * dx + s * dy, y: -s * dx + c * dy }
    }
    const toWorld = (x: number, y: number) => ({
      x: base.x + c * x - s * y,
      y: base.y + s * x + c * y
    })
    const corners = [
      toLocal(box.minX, box.minY),
      toLocal(box.maxX, box.minY),
      toLocal(box.maxX, box.maxY),
      toLocal(box.minX, box.maxY)
    ]
    let minLX = Infinity
    let maxLX = -Infinity
    let minLY = Infinity
    let maxLY = -Infinity
    for (const p of corners) {
      minLX = Math.min(minLX, p.x)
      maxLX = Math.max(maxLX, p.x)
      minLY = Math.min(minLY, p.y)
      maxLY = Math.max(maxLY, p.y)
    }
    minLX -= pad
    maxLX += pad
    const startK = Math.floor(minLY / spacing) - 1
    const endK = Math.ceil(maxLY / spacing) + 1
    const count = endK - startK + 1
    if (count > MAX_PATTERN_LINES) {
      continue
    }
    const dashes = Array.isArray(line.dashLengths) ? line.dashLengths : []
    for (let k = startK; k <= endK; k++) {
      const y = k * spacing
      const a = toWorld(minLX, y)
      const b = toWorld(maxLX, y)
      const clipped = clipSegmentToLoops(a, b, loops)
      const phase = y * (Math.abs(offset.y) > EPS ? offset.x / offset.y : 0)
      for (const [ca, cb] of clipped) {
        for (const [da, db] of dashSegment(ca, cb, dashes, phase)) {
          segments.push([da, db])
        }
      }
    }
  }
  return segments
}
