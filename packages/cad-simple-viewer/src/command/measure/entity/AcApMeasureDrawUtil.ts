import type { AcCmColor } from '@mlightcad/data-model'

import type { AcEdBaseView } from '../../../editor'
import { acapColorToCssAlpha, acapCssColor } from '../../../util'

/**
 * Two-dimensional point in world or screen space (XY only).
 */
type Point2 = {
  /** X coordinate. */
  x: number
  /** Y coordinate. */
  y: number
}

/**
 * Sizes and clears a measure overlay canvas to match the view viewport.
 *
 * Aligns the canvas with the view's drawing surface (including device pixel
 * ratio), clears previous content, and returns a 2D context scaled so that
 * subsequent drawing uses CSS pixels.
 *
 * @param canvas - Overlay canvas element to prepare
 * @param view - View whose canvas bounds and transforms define the overlay
 * @returns Context and DPR when preparation succeeds; `null` if 2D context is unavailable
 */
function prepareMeasureCanvas(
  canvas: HTMLCanvasElement,
  view: AcEdBaseView
): { ctx: CanvasRenderingContext2D; dpr: number } | null {
  const rect = view.canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = Math.round(rect.width)
  const h = Math.round(rect.height)

  const origin = view.canvasToContainer({ x: 0, y: 0 })
  canvas.style.left = `${origin.x}px`
  canvas.style.top = `${origin.y}px`
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.scale(dpr, dpr)
  return { ctx, dpr }
}

/**
 * Normalizes an angle in radians to the half-open interval `[0, 2π)`.
 *
 * @param a - Angle in radians (any real value)
 * @returns Equivalent angle in `[0, 2π)`
 */
const normaliseAngle = (a: number) =>
  ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

/**
 * Strokes a single world-space segment onto a measure overlay canvas.
 *
 * @param canvas - Overlay canvas to paint
 * @param view - View for world-to-screen conversion and canvas sizing
 * @param p1 - Segment start in world coordinates
 * @param p2 - Segment end in world coordinates
 * @param color - Stroke color
 * @param lineWidth - Stroke width in CSS pixels (default `2`)
 */
export function drawMeasureSegmentOnCanvas(
  canvas: HTMLCanvasElement,
  view: AcEdBaseView,
  p1: Point2,
  p2: Point2,
  color: AcCmColor,
  lineWidth = 2
): void {
  const prepared = prepareMeasureCanvas(canvas, view)
  if (!prepared) return
  const { ctx } = prepared
  const a = view.worldToScreen(p1)
  const b = view.worldToScreen(p2)
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.strokeStyle = acapCssColor(color)
  ctx.lineWidth = lineWidth
  ctx.stroke()
  ctx.restore()
}

/**
 * Draws angle arm lines plus the measurement arc on a measure overlay canvas.
 *
 * Converts `vertex`, `arm1`, and `arm2` to screen space, strokes both arms,
 * then draws the shorter angular sector with a radius derived from the shorter
 * arm length (with a minimum).
 *
 * @param canvas - Overlay canvas to paint
 * @param view - View for world-to-screen conversion and canvas sizing
 * @param vertex - Angle vertex in world coordinates
 * @param arm1 - First arm endpoint in world coordinates
 * @param arm2 - Second arm endpoint in world coordinates
 * @param color - Stroke color
 * @param lineWidth - Stroke width in CSS pixels (default `2`)
 */
export function drawMeasureAngleArcOnCanvas(
  canvas: HTMLCanvasElement,
  view: AcEdBaseView,
  vertex: Point2,
  arm1: Point2,
  arm2: Point2,
  color: AcCmColor,
  lineWidth = 2
): void {
  const prepared = prepareMeasureCanvas(canvas, view)
  if (!prepared) return
  const { ctx } = prepared

  const sv = view.worldToScreen(vertex)
  const sa1 = view.worldToScreen(arm1)
  const sa2 = view.worldToScreen(arm2)

  ctx.strokeStyle = acapCssColor(color)
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(sv.x, sv.y)
  ctx.lineTo(sa1.x, sa1.y)
  ctx.moveTo(sv.x, sv.y)
  ctx.lineTo(sa2.x, sa2.y)
  ctx.stroke()

  const len1 = Math.hypot(sa1.x - sv.x, sa1.y - sv.y)
  const len2 = Math.hypot(sa2.x - sv.x, sa2.y - sv.y)
  const arcR = Math.max(Math.min(len1, len2) * 0.3, 15)

  const startAngle = Math.atan2(sa1.y - sv.y, sa1.x - sv.x)
  const endAngle = Math.atan2(sa2.y - sv.y, sa2.x - sv.x)
  const antiClockwise = normaliseAngle(endAngle - startAngle) > Math.PI

  ctx.beginPath()
  ctx.arc(sv.x, sv.y, arcR, startAngle, endAngle, antiClockwise)
  ctx.stroke()
  ctx.restore()
}

/**
 * Draws a filled polygon for an area measurement on a measure overlay canvas.
 *
 * Requires at least three points. Fills with a translucent tint of `color` and
 * strokes the closed outline.
 *
 * @param canvas - Overlay canvas to paint
 * @param view - View for world-to-screen conversion and canvas sizing
 * @param points - Polygon vertices in world coordinates (closed implicitly)
 * @param color - Fill and stroke color
 * @param lineWidth - Stroke width in CSS pixels (default `2.5`)
 */
export function drawMeasureAreaOnCanvas(
  canvas: HTMLCanvasElement,
  view: AcEdBaseView,
  points: Point2[],
  color: AcCmColor,
  lineWidth = 2.5
): void {
  const prepared = prepareMeasureCanvas(canvas, view)
  if (!prepared || points.length < 3) {
    prepared?.ctx.restore()
    return
  }
  const { ctx } = prepared
  const spts = points.map(p => view.worldToScreen(p))

  ctx.beginPath()
  ctx.moveTo(spts[0].x, spts[0].y)
  for (let i = 1; i < spts.length; i++) ctx.lineTo(spts[i].x, spts[i].y)
  ctx.closePath()
  ctx.fillStyle = acapColorToCssAlpha(color, 0.2)
  ctx.fill()
  ctx.strokeStyle = acapCssColor(color)
  ctx.lineWidth = lineWidth
  ctx.stroke()
  ctx.restore()
}

/**
 * Circle geometry in world XY used by arc-length measurements.
 */
export interface AcApMeasureCircleGeom {
  /** Circle center X in world coordinates. */
  cx: number
  /** Circle center Y in world coordinates. */
  cy: number
  /** Circle radius in world units. */
  r: number
}

/**
 * Strokes the shorter arc between two points on a circle onto a measure canvas.
 *
 * Screen radius is taken from the distance of `p1` to the projected center so
 * the stroke tracks the circle under the current view transform.
 *
 * @param canvas - Overlay canvas to paint
 * @param view - View for world-to-screen conversion and canvas sizing
 * @param g - Circle center and radius in world coordinates
 * @param p1 - Arc start point in world coordinates (on or near the circle)
 * @param p2 - Arc end point in world coordinates (on or near the circle)
 * @param color - Stroke color
 * @param lineWidth - Stroke width in CSS pixels (default `4`)
 */
export function drawMeasureArcOnCanvas(
  canvas: HTMLCanvasElement,
  view: AcEdBaseView,
  g: AcApMeasureCircleGeom,
  p1: Point2,
  p2: Point2,
  color: AcCmColor,
  lineWidth = 4
): void {
  const prepared = prepareMeasureCanvas(canvas, view)
  if (!prepared) return
  const { ctx } = prepared

  const sc = view.worldToScreen({ x: g.cx, y: g.cy })
  const ss = view.worldToScreen(p1)
  const se = view.worldToScreen(p2)
  const screenR = Math.hypot(ss.x - sc.x, ss.y - sc.y)

  const sa = Math.atan2(ss.y - sc.y, ss.x - sc.x)
  const ea = Math.atan2(se.y - sc.y, se.x - sc.x)
  const cwSpan = normaliseAngle(ea - sa)
  const antiClockwise = cwSpan > Math.PI

  ctx.beginPath()
  ctx.arc(sc.x, sc.y, screenR, sa, ea, antiClockwise)
  ctx.strokeStyle = acapCssColor(color)
  ctx.lineWidth = lineWidth
  ctx.stroke()
  ctx.restore()
}

/**
 * Computes the shorter arc length between two points on a circle.
 *
 * @param p1 - First point in world coordinates
 * @param p2 - Second point in world coordinates
 * @param g - Circle center and radius
 * @returns Arc length along the shorter sector (`min(span, 2π − span) × r`)
 */
export function measureShortArcLength(
  p1: Point2,
  p2: Point2,
  g: AcApMeasureCircleGeom
): number {
  const a1 = Math.atan2(p1.y - g.cy, p1.x - g.cx)
  const a2 = Math.atan2(p2.y - g.cy, p2.x - g.cx)
  const span = normaliseAngle(a2 - a1)
  return Math.min(span, 2 * Math.PI - span) * g.r
}

/**
 * Finds the midpoint of the shorter arc between two points on a circle.
 *
 * @param p1 - Arc start in world coordinates
 * @param p2 - Arc end in world coordinates
 * @param g - Circle center and radius
 * @returns Midpoint on the shorter arc with `z: 0`
 */
export function measureShortArcMid(
  p1: Point2,
  p2: Point2,
  g: AcApMeasureCircleGeom
): { x: number; y: number; z: number } {
  const a1 = Math.atan2(p1.y - g.cy, p1.x - g.cx)
  const a2 = Math.atan2(p2.y - g.cy, p2.x - g.cx)
  const ccwSpan = normaliseAngle(a2 - a1)
  const mid =
    ccwSpan <= Math.PI ? a1 + ccwSpan / 2 : a1 - (2 * Math.PI - ccwSpan) / 2
  return { x: g.cx + g.r * Math.cos(mid), y: g.cy + g.r * Math.sin(mid), z: 0 }
}

/**
 * Computes polygon area using the shoelace formula.
 *
 * @param pts - Polygon vertices in world coordinates (assumed closed)
 * @returns Absolute area (half the absolute shoelace sum)
 */
export function measureShoelaceArea(pts: Point2[]): number {
  let area = 0
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += pts[i].x * pts[j].y
    area -= pts[j].x * pts[i].y
  }
  return Math.abs(area) / 2
}

/**
 * Computes the arithmetic mean of polygon vertices (simple centroid).
 *
 * @param pts - Vertices in world coordinates (must be non-empty)
 * @returns Average `{ x, y }` of the points
 */
export function measureCentroid(pts: Point2[]): { x: number; y: number } {
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length
  return { x, y }
}

/**
 * Computes the smaller angle at `vertex` between `arm1` and `arm2`, in degrees.
 *
 * Uses atan2 of cross/dot products so the result is in `[0, 180]`.
 *
 * @param vertex - Angle vertex in world coordinates
 * @param arm1 - First arm endpoint in world coordinates
 * @param arm2 - Second arm endpoint in world coordinates
 * @returns Interior (smaller) angle in degrees
 */
export function measureAngleDeg(
  vertex: Point2,
  arm1: Point2,
  arm2: Point2
): number {
  const dx1 = arm1.x - vertex.x
  const dy1 = arm1.y - vertex.y
  const dx2 = arm2.x - vertex.x
  const dy2 = arm2.y - vertex.y
  const dot = dx1 * dx2 + dy1 * dy2
  const cross = dx1 * dy2 - dy1 * dx2
  const rad = Math.atan2(Math.abs(cross), dot)
  return (rad * 180) / Math.PI
}
