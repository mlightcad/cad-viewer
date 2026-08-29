/**
 * Markup shape geometry builders (revision cloud and rectangle) for HTML canvas.
 */

import type { AcGePoint2dLike } from '@mlightcad/data-model'

import type { AcEdBaseView } from '../../editor'
import {
  ACAP_OVERLAY_CLOUD_DIAMETER_PX,
  ACAP_OVERLAY_CLOUD_WCS,
  acapScaledOverlayLineWidth
} from '../overlay/AcApOverlayDrawUtil'

/** World-space vertex with AutoCAD-style bulge to the next vertex. */
export interface AcApMarkupCloudVertex {
  /** World X. */
  x: number
  /** World Y. */
  y: number
  /**
   * Bulge to the next vertex (`tan(includedAngle/4)`).
   * Zero means a straight segment; the last vertex's bulge closes to the first.
   */
  bulge: number
}

/**
 * Convert a screen-space pixel length to world distance at a reference point.
 *
 * @param view - View used for world ↔ screen conversion.
 * @param pixelDistance - Length in CSS pixels.
 * @param referencePoint - World point near which the scale is sampled.
 * @returns Approximate world-space length of `pixelDistance`.
 */
function pixelToWorldDistance(
  view: AcEdBaseView,
  pixelDistance: number,
  referencePoint: AcGePoint2dLike
): number {
  const screenPoint1 = view.worldToScreen(referencePoint)
  const screenPoint2 = { x: screenPoint1.x + pixelDistance, y: screenPoint1.y }
  const worldPoint2 = view.screenToWorld(screenPoint2)
  return Math.abs(worldPoint2.x - referencePoint.x)
}

/**
 * Build closed revision-cloud vertices (points + bulges) between two corners.
 *
 * Lobe size is a world-space diameter. When omitted, {@link ACAP_OVERLAY_CLOUD_DIAMETER_PX}
 * is converted at the current view (jig / first paint).
 *
 * @param firstPoint - One corner of the cloud AABB.
 * @param secondPoint - Opposite corner of the cloud AABB.
 * @param view - View used to size lobes when `diameterWcs` is omitted.
 * @param diameterWcs - Optional world-space lobe diameter (keeps size across zoom).
 * @returns Closed ring of vertices (last segment uses the last bulge → first point).
 */
export function markupCloudVertices(
  firstPoint: AcGePoint2dLike,
  secondPoint: AcGePoint2dLike,
  view: AcEdBaseView,
  diameterWcs?: number
): AcApMarkupCloudVertex[] {
  const minX = Math.min(firstPoint.x, secondPoint.x)
  const maxX = Math.max(firstPoint.x, secondPoint.x)
  const minY = Math.min(firstPoint.y, secondPoint.y)
  const maxY = Math.max(firstPoint.y, secondPoint.y)
  const width = maxX - minX
  const height = maxY - minY
  const centerPoint = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
  const cloudDiameter =
    diameterWcs != null && diameterWcs > 0
      ? diameterWcs
      : pixelToWorldDistance(view, ACAP_OVERLAY_CLOUD_DIAMETER_PX, centerPoint)
  const chordLength = Math.max(cloudDiameter, 1e-6)
  const numSegmentsX = Math.max(4, Math.ceil(width / chordLength) * 2)
  const numSegmentsY = Math.max(4, Math.ceil(height / chordLength) * 2)

  const vertices: AcApMarkupCloudVertex[] = []
  let segmentIndex = 0
  /**
   * Alternating bulge for scalloped cloud edges.
   *
   * @param outward - When `true`, bulge pushes outside the AABB.
   * @returns Polyline bulge factor.
   */
  const calculateBulge = (outward: boolean): number => (outward ? 0.4 : -0.4)

  for (let i = 0; i <= numSegmentsX; i++) {
    const t = i / numSegmentsX
    vertices.push({
      x: minX + width * t,
      y: minY,
      bulge: i < numSegmentsX ? calculateBulge(segmentIndex++ % 2 === 0) : 0
    })
  }
  for (let i = 1; i <= numSegmentsY; i++) {
    const t = i / numSegmentsY
    vertices.push({
      x: maxX,
      y: minY + height * t,
      bulge: i < numSegmentsY ? calculateBulge(segmentIndex++ % 2 === 0) : 0
    })
  }
  for (let i = 1; i <= numSegmentsX; i++) {
    const t = 1 - i / numSegmentsX
    vertices.push({
      x: minX + width * t,
      y: maxY,
      bulge: i < numSegmentsX ? calculateBulge(segmentIndex++ % 2 === 0) : 0
    })
  }
  for (let i = 1; i < numSegmentsY; i++) {
    const t = 1 - i / numSegmentsY
    vertices.push({
      x: minX,
      y: minY + height * t,
      bulge: i < numSegmentsY - 1 ? calculateBulge(segmentIndex++ % 2 === 0) : 0
    })
  }

  // Closing segment (last → first) uses bulge 0, matching the prior polyline builder.
  return vertices
}

/**
 * Axis-aligned rectangle corners as a closed polyline (world).
 *
 * @param first - One corner.
 * @param second - Opposite corner.
 * @returns Four corners in order from `first`.
 */
export function markupRectCorners(
  first: AcGePoint2dLike,
  second: AcGePoint2dLike
): Array<{ x: number; y: number }> {
  return [
    { x: first.x, y: first.y },
    { x: second.x, y: first.y },
    { x: second.x, y: second.y },
    { x: first.x, y: second.y }
  ]
}

/**
 * Tessellate one bulged segment into world points (excluding `p1`, including end).
 *
 * @param p1 - Segment start.
 * @param p2 - Segment end.
 * @param bulge - AutoCAD bulge (`tan(includedAngle/4)`).
 * @param samples - Interior samples along the arc (≥ 1 when bulged).
 */
function tessellateBulgeSegment(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  bulge: number,
  samples = 6
): Array<{ x: number; y: number }> {
  if (Math.abs(bulge) < 1e-8) {
    return [{ x: p2.x, y: p2.y }]
  }
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const d = Math.hypot(dx, dy)
  if (d < 1e-12) {
    return [{ x: p2.x, y: p2.y }]
  }
  const cx = (p1.x + p2.x) / 2 - (dy * (1 - bulge * bulge)) / (4 * bulge)
  const cy = (p1.y + p2.y) / 2 + (dx * (1 - bulge * bulge)) / (4 * bulge)
  const r = Math.hypot(p1.x - cx, p1.y - cy)
  const a0 = Math.atan2(p1.y - cy, p1.x - cx)
  const a1 = Math.atan2(p2.y - cy, p2.x - cx)
  let delta = a1 - a0
  // Positive bulge → CCW (left of chord); negative → CW.
  if (bulge > 0) {
    if (delta <= 0) delta += Math.PI * 2
  } else {
    if (delta >= 0) delta -= Math.PI * 2
  }
  const out: Array<{ x: number; y: number }> = []
  const steps = Math.max(2, samples)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const a = a0 + delta * t
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
  }
  return out
}

/**
 * Expand cloud vertices to a dense polyline suitable for canvas stroke.
 *
 * @param vertices - Closed cloud ring with bulges.
 * @returns Tessellated world points (closed ring, first point not repeated).
 */
export function tessellateMarkupCloud(
  vertices: AcApMarkupCloudVertex[]
): Array<{ x: number; y: number }> {
  if (vertices.length < 2) return vertices.map(v => ({ x: v.x, y: v.y }))
  const points: Array<{ x: number; y: number }> = [
    { x: vertices[0].x, y: vertices[0].y }
  ]
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]
    const b = vertices[(i + 1) % vertices.length]
    const seg = tessellateBulgeSegment(
      { x: a.x, y: a.y },
      { x: b.x, y: b.y },
      a.bulge
    )
    for (const p of seg) points.push(p)
  }
  return points
}

/**
 * Stroke a revision cloud on a canvas context (screen projection).
 *
 * @param ctx - Canvas 2D context in CSS pixel space.
 * @param view - View for world → screen.
 * @param first - One AABB corner (world).
 * @param second - Opposite AABB corner (world).
 * @param color - CSS stroke color.
 * @param lineWidth - Stroke width in CSS pixels.
 * @param offset - Optional live drag translation in world space.
 * @param strokeWidthWcs - Optional persisted world-space stroke width.
 */
export function strokeMarkupCloud(
  ctx: CanvasRenderingContext2D,
  view: AcEdBaseView,
  first: AcGePoint2dLike,
  second: AcGePoint2dLike,
  color: string,
  lineWidth: number,
  offset?: { dx: number; dy: number },
  strokeWidthWcs?: number
): void {
  const dx = offset?.dx ?? 0
  const dy = offset?.dy ?? 0
  const centerPoint = {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2
  }
  let diameterWcs = Number(ctx.canvas.dataset[ACAP_OVERLAY_CLOUD_WCS])
  if (!(diameterWcs > 0) || !Number.isFinite(diameterWcs)) {
    diameterWcs = pixelToWorldDistance(
      view,
      ACAP_OVERLAY_CLOUD_DIAMETER_PX,
      centerPoint
    )
    if (diameterWcs > 0) {
      ctx.canvas.dataset[ACAP_OVERLAY_CLOUD_WCS] = String(diameterWcs)
    }
  }
  const vertices = markupCloudVertices(first, second, view, diameterWcs)
  const world = tessellateMarkupCloud(vertices).map(p => ({
    x: p.x + dx,
    y: p.y + dy
  }))
  if (world.length < 2) return
  const screen = world.map(p => view.worldToScreen(p))
  ctx.strokeStyle = color
  ctx.lineWidth = acapScaledOverlayLineWidth(
    lineWidth,
    ctx.canvas,
    view,
    strokeWidthWcs
  )
  ctx.beginPath()
  ctx.moveTo(screen[0].x, screen[0].y)
  for (let i = 1; i < screen.length; i++) {
    ctx.lineTo(screen[i].x, screen[i].y)
  }
  ctx.closePath()
  ctx.stroke()
}

/**
 * @deprecated Prefer {@link markupCloudVertices} / {@link strokeMarkupCloud}.
 * Kept for callers that still need an in-memory vertex list via the old name.
 */
export function buildMarkupCloud(
  _cloud: {
    reset: (v: boolean) => void
    addVertexAt: (i: number, p: { x: number; y: number }, b?: number) => void
    closed: boolean
  },
  firstPoint: AcGePoint2dLike,
  secondPoint: AcGePoint2dLike,
  view: AcEdBaseView
): void {
  const vertices = markupCloudVertices(firstPoint, secondPoint, view)
  _cloud.reset(false)
  for (let i = 0; i < vertices.length; i++) {
    _cloud.addVertexAt(
      i,
      { x: vertices[i].x, y: vertices[i].y },
      vertices[i].bulge
    )
  }
  _cloud.closed = true
}

/**
 * @deprecated Prefer {@link markupRectCorners}.
 */
export function buildMarkupRect(
  rect: {
    reset: (v: boolean) => void
    addVertexAt: (i: number, p: { x: number; y: number }) => void
    closed: boolean
  },
  first: AcGePoint2dLike,
  second: AcGePoint2dLike
): void {
  const corners = markupRectCorners(first, second)
  rect.reset(false)
  for (let i = 0; i < corners.length; i++) {
    rect.addVertexAt(i, corners[i])
  }
  rect.closed = true
}
