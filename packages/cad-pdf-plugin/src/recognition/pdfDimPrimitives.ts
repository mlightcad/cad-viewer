/**
 * Spatial helpers shared by the dimension recognizers: a uniform grid over
 * segments and points so neighbourhood queries stay fast on a whole page
 * (tens of thousands of strokes), plus small vector utilities.
 */

import { cross, dist, dot, type PdfRecPoint, sub } from './pdfRecGeometry.js'

/** Unit vector of `v`; the zero vector stays zero. */
export function pdfDimUnit(v: PdfRecPoint): PdfRecPoint {
  const len = Math.hypot(v.x, v.y)
  return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 }
}

/** Point on `a`→`b` at parameter `t`. */
export function pdfDimLerp(
  a: PdfRecPoint,
  b: PdfRecPoint,
  t: number
): PdfRecPoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/** Median of `values` (upper median for even counts); 0 when empty. */
export function pdfDimMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/** Distance from `p` to the segment `a`→`b`. */
export function pdfDimPointSegmentDistance(
  p: PdfRecPoint,
  a: PdfRecPoint,
  b: PdfRecPoint
): number {
  const d = sub(b, a)
  const len2 = dot(d, d)
  if (len2 === 0) return dist(p, a)
  const t = Math.max(0, Math.min(1, dot(sub(p, a), d) / len2))
  return dist(p, pdfDimLerp(a, b, t))
}

/** Signed distance of `p` from the infinite line through `a` along unit `u`. */
export function pdfDimLineOffset(
  p: PdfRecPoint,
  a: PdfRecPoint,
  u: PdfRecPoint
): number {
  return cross(u, sub(p, a))
}

/** Axis-aligned box. */
export interface PdfDimBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Box of a set of points. */
export function pdfDimBoxOf(points: PdfRecPoint[]): PdfDimBox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Uniform grid of items with boxes. Items spanning many cells are stored in
 * each; queries de-duplicate. Large items (longer than `maxCells` cells on a
 * side) are kept in an overflow list scanned by every query, so a page
 * frame does not fill the grid.
 */
export class PdfDimGrid<T> {
  private readonly cells = new Map<number, T[]>()
  private readonly overflow: Array<{ item: T; box: PdfDimBox }> = []
  private readonly boxes = new Map<T, PdfDimBox>()

  constructor(
    private readonly cell: number,
    private readonly maxCells = 64
  ) {}

  private key(gx: number, gy: number) {
    // Cantor-free packing: drawings never span 2^20 cells per axis.
    return (gx + 0x80000) * 0x100000 + (gy + 0x80000)
  }

  /** Adds `item` covering `box`. */
  add(item: T, box: PdfDimBox) {
    this.boxes.set(item, box)
    const x0 = Math.floor(box.minX / this.cell)
    const x1 = Math.floor(box.maxX / this.cell)
    const y0 = Math.floor(box.minY / this.cell)
    const y1 = Math.floor(box.maxY / this.cell)
    if (x1 - x0 > this.maxCells || y1 - y0 > this.maxCells) {
      this.overflow.push({ item, box })
      return
    }
    for (let gx = x0; gx <= x1; gx++) {
      for (let gy = y0; gy <= y1; gy++) {
        const key = this.key(gx, gy)
        const bucket = this.cells.get(key)
        if (bucket) bucket.push(item)
        else this.cells.set(key, [item])
      }
    }
  }

  /** Items whose boxes intersect `box`. */
  query(box: PdfDimBox): T[] {
    const out: T[] = []
    const seen = new Set<T>()
    const x0 = Math.floor(box.minX / this.cell)
    const x1 = Math.floor(box.maxX / this.cell)
    const y0 = Math.floor(box.minY / this.cell)
    const y1 = Math.floor(box.maxY / this.cell)
    const take = (item: T) => {
      if (seen.has(item)) return
      seen.add(item)
      const b = this.boxes.get(item)!
      if (
        b.maxX < box.minX ||
        b.minX > box.maxX ||
        b.maxY < box.minY ||
        b.minY > box.maxY
      ) {
        return
      }
      out.push(item)
    }
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > this.cells.size) {
      for (const bucket of this.cells.values()) bucket.forEach(take)
    } else {
      for (let gx = x0; gx <= x1; gx++) {
        for (let gy = y0; gy <= y1; gy++) {
          this.cells.get(this.key(gx, gy))?.forEach(take)
        }
      }
    }
    for (const { item } of this.overflow) take(item)
    return out
  }

  /** Items whose boxes come within `radius` of `p`. */
  near(p: PdfRecPoint, radius: number): T[] {
    return this.query({
      minX: p.x - radius,
      minY: p.y - radius,
      maxX: p.x + radius,
      maxY: p.y + radius
    })
  }
}

/** Box around a segment, grown by `pad`. */
export function pdfDimSegmentBox(
  p0: PdfRecPoint,
  p1: PdfRecPoint,
  pad = 0
): PdfDimBox {
  return {
    minX: Math.min(p0.x, p1.x) - pad,
    minY: Math.min(p0.y, p1.y) - pad,
    maxX: Math.max(p0.x, p1.x) + pad,
    maxY: Math.max(p0.y, p1.y) + pad
  }
}

/**
 * Normalizes a direction to `[0, π)` (dimension lines have no sense).
 */
export function pdfDimLineAngle(u: PdfRecPoint): number {
  let rotation = Math.atan2(u.y, u.x)
  if (rotation < 0) rotation += Math.PI
  if (rotation >= Math.PI - 1e-12) rotation -= Math.PI
  return rotation
}
