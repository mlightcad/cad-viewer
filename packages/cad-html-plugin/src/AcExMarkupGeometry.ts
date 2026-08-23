/**
 * Markup geometry helpers (revision cloud, hit tests, canvas strokes).
 *
 * @module AcExMarkupGeometry
 * @packageDocumentation
 */

import type {
  AcExMarkupAttachedCallout,
  AcExMarkupGeometry,
  AcExMarkupPoint2d,
  AcExMarkupRecord
} from './AcExMarkupTypes'

/** Shape outline used to auto-place the leader tip on the perimeter. */
export type AcExMarkupShapeOutline =
  | {
      kind: 'rect' | 'cloud'
      corner1: AcExMarkupPoint2d
      corner2: AcExMarkupPoint2d
    }
  | {
      kind: 'circle'
      center: AcExMarkupPoint2d
      radius: number
    }

/**
 * Design Review–style leader tip: intersection of the ray from the shape
 * center toward the cursor with the shape outer frame (AABB for rect/cloud,
 * circle perimeter for circle).
 */
export function acExComputeLeaderTipOnShape(
  outline: AcExMarkupShapeOutline,
  toward: AcExMarkupPoint2d
): AcExMarkupPoint2d {
  if (outline.kind === 'circle') {
    const { center, radius } = outline
    const dx = toward.x - center.x
    const dy = toward.y - center.y
    const len = Math.hypot(dx, dy)
    if (len < 1e-9 || radius <= 0) {
      return { x: center.x + radius, y: center.y }
    }
    const s = radius / len
    return { x: center.x + dx * s, y: center.y + dy * s }
  }

  const minX = Math.min(outline.corner1.x, outline.corner2.x)
  const maxX = Math.max(outline.corner1.x, outline.corner2.x)
  const minY = Math.min(outline.corner1.y, outline.corner2.y)
  const maxY = Math.max(outline.corner1.y, outline.corner2.y)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const hx = (maxX - minX) / 2
  const hy = (maxY - minY) / 2
  const dx = toward.x - cx
  const dy = toward.y - cy

  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) {
    return { x: maxX, y: cy }
  }

  const sx = Math.abs(dx) > 1e-9 ? hx / Math.abs(dx) : Number.POSITIVE_INFINITY
  const sy = Math.abs(dy) > 1e-9 ? hy / Math.abs(dy) : Number.POSITIVE_INFINITY
  const s = Math.min(sx, sy)
  return { x: cx + dx * s, y: cy + dy * s }
}

/** Extra hit slop for revision-cloud lobes around the AABB. */
const CLOUD_HIT_EXTRA_PX = 8

/**
 * Whether geometry is a cloud / rect / circle with no attached callout.
 */
export function acExIsAttachableShapeMarkup(
  geometry: AcExMarkupGeometry
): boolean {
  return (
    (geometry.type === 'cloud' ||
      geometry.type === 'rect' ||
      geometry.type === 'circle') &&
    geometry.callout == null
  )
}

/**
 * Shape outline used to constrain an attached-callout leader tip.
 */
export function acExMarkupShapeOutlineFromGeometry(
  geometry: AcExMarkupGeometry
): AcExMarkupShapeOutline | undefined {
  if (geometry.type === 'circle') {
    return {
      kind: 'circle',
      center: geometry.center,
      radius: geometry.radius
    }
  }
  if (geometry.type === 'cloud' || geometry.type === 'rect') {
    return {
      kind: geometry.type,
      corner1: geometry.corner1,
      corner2: geometry.corner2
    }
  }
  return undefined
}

/**
 * Whether a screen-space pick hits a cloud / rect / circle outer frame
 * (AABB for cloud/rect, circumference for circle). Does not hit interiors
 * or an already-attached callout leader.
 */
export function acExHitTestMarkupShapeOutline(
  geometry: AcExMarkupGeometry,
  clientX: number,
  clientY: number,
  thresholdPx: number,
  worldToScreen: (p: AcExMarkupPoint2d) => { x: number; y: number }
): boolean {
  switch (geometry.type) {
    case 'rect': {
      const a = worldToScreen(geometry.corner1)
      const b = worldToScreen(geometry.corner2)
      const minX = Math.min(a.x, b.x)
      const maxX = Math.max(a.x, b.x)
      const minY = Math.min(a.y, b.y)
      const maxY = Math.max(a.y, b.y)
      const inside =
        clientX >= minX &&
        clientX <= maxX &&
        clientY >= minY &&
        clientY <= maxY
      if (!inside) {
        return acExDistToRectOutlinePx(clientX, clientY, a, b) <= thresholdPx
      }
      const distEdge = Math.min(
        Math.abs(clientX - minX),
        Math.abs(clientX - maxX),
        Math.abs(clientY - minY),
        Math.abs(clientY - maxY)
      )
      return distEdge <= thresholdPx
    }
    case 'cloud': {
      const a = worldToScreen(geometry.corner1)
      const b = worldToScreen(geometry.corner2)
      const minX = Math.min(a.x, b.x)
      const maxX = Math.max(a.x, b.x)
      const minY = Math.min(a.y, b.y)
      const maxY = Math.max(a.y, b.y)
      const tol = thresholdPx + CLOUD_HIT_EXTRA_PX
      const inside =
        clientX >= minX &&
        clientX <= maxX &&
        clientY >= minY &&
        clientY <= maxY
      if (!inside) {
        return acExDistToRectOutlinePx(clientX, clientY, a, b) <= tol
      }
      const distEdge = Math.min(
        Math.abs(clientX - minX),
        Math.abs(clientX - maxX),
        Math.abs(clientY - minY),
        Math.abs(clientY - maxY)
      )
      return distEdge <= tol
    }
    case 'circle': {
      const c = worldToScreen(geometry.center)
      const rim = worldToScreen({
        x: geometry.center.x + geometry.radius,
        y: geometry.center.y
      })
      const rPx = Math.hypot(rim.x - c.x, rim.y - c.y)
      const d = Math.hypot(clientX - c.x, clientY - c.y)
      return Math.abs(d - rPx) <= thresholdPx * 2
    }
    default:
      return false
  }
}

/** Target screen diameter in CSS pixels for each revision-cloud lobe. */
const CLOUD_DIAMETER_PIXELS = 8

/** World-space vertex with AutoCAD-style bulge to the next vertex. */
interface AcExMarkupCloudVertex {
  x: number
  y: number
  bulge: number
}

/**
 * Fit a canvas to its container and return a 2D context cleared for this frame.
 */
export function acExFitMarkupCanvas(
  canvas: HTMLCanvasElement,
  container: HTMLElement
): CanvasRenderingContext2D | null {
  const rect = container.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const cssWidth = `${rect.width}px`
  const cssHeight = `${rect.height}px`
  const bufferWidth = Math.max(1, Math.floor(rect.width * dpr))
  const bufferHeight = Math.max(1, Math.floor(rect.height * dpr))
  canvas.style.left = '0'
  canvas.style.top = '0'
  if (canvas.style.width !== cssWidth) canvas.style.width = cssWidth
  if (canvas.style.height !== cssHeight) canvas.style.height = cssHeight
  if (canvas.width !== bufferWidth) canvas.width = bufferWidth
  if (canvas.height !== bufferHeight) canvas.height = bufferHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)
  return ctx
}

/** Draw a filled arrow head at `to`, pointing along `from` → `to`. */
export function acExDrawMarkupArrowHead(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string
): void {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const size = 12
  const left = {
    x: to.x - ux * size - uy * size * 0.45,
    y: to.y - uy * size + ux * size * 0.45
  }
  const right = {
    x: to.x - ux * size + uy * size * 0.45,
    y: to.y - uy * size - ux * size * 0.45
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(left.x, left.y)
  ctx.lineTo(right.x, right.y)
  ctx.closePath()
  ctx.fill()
}

/** Draw a leader segment, optionally with an arrow head at the tip. */
export function acExDrawMarkupLeader(
  ctx: CanvasRenderingContext2D,
  tip: { x: number; y: number },
  anchor: { x: number; y: number },
  color: string,
  withArrow = true,
  lineWidth = 2
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(tip.x, tip.y)
  ctx.lineTo(anchor.x, anchor.y)
  ctx.stroke()
  if (withArrow) {
    acExDrawMarkupArrowHead(ctx, anchor, tip, color)
  }
}

/** Map CAD line weight to canvas stroke width in CSS pixels. */
export function acExMarkupCanvasLineWidth(weight?: number): number {
  if (weight == null || !Number.isFinite(weight) || weight <= 0) return 2
  return Math.max(1, weight / 28)
}

function pixelToWorldDistance(
  worldToScreen: (p: AcExMarkupPoint2d) => { x: number; y: number },
  screenToWorld: (p: { x: number; y: number }) => AcExMarkupPoint2d,
  pixelDistance: number,
  referencePoint: AcExMarkupPoint2d
): number {
  const screenPoint1 = worldToScreen(referencePoint)
  const screenPoint2 = { x: screenPoint1.x + pixelDistance, y: screenPoint1.y }
  const worldPoint2 = screenToWorld(screenPoint2)
  return Math.abs(worldPoint2.x - referencePoint.x)
}

function markupCloudVertices(
  firstPoint: AcExMarkupPoint2d,
  secondPoint: AcExMarkupPoint2d,
  worldToScreen: (p: AcExMarkupPoint2d) => { x: number; y: number },
  screenToWorld: (p: { x: number; y: number }) => AcExMarkupPoint2d
): AcExMarkupCloudVertex[] {
  const minX = Math.min(firstPoint.x, secondPoint.x)
  const maxX = Math.max(firstPoint.x, secondPoint.x)
  const minY = Math.min(firstPoint.y, secondPoint.y)
  const maxY = Math.max(firstPoint.y, secondPoint.y)
  const width = maxX - minX
  const height = maxY - minY
  const centerPoint = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
  const cloudDiameter = pixelToWorldDistance(
    worldToScreen,
    screenToWorld,
    CLOUD_DIAMETER_PIXELS,
    centerPoint
  )
  const chordLength = Math.max(cloudDiameter, 1e-6)
  const numSegmentsX = Math.max(4, Math.ceil(width / chordLength) * 2)
  const numSegmentsY = Math.max(4, Math.ceil(height / chordLength) * 2)

  const vertices: AcExMarkupCloudVertex[] = []
  let segmentIndex = 0
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
      bulge:
        i < numSegmentsY - 1 ? calculateBulge(segmentIndex++ % 2 === 0) : 0
    })
  }
  return vertices
}

function tessellateBulgeSegment(
  p1: AcExMarkupPoint2d,
  p2: AcExMarkupPoint2d,
  bulge: number,
  samples = 6
): AcExMarkupPoint2d[] {
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
  if (bulge > 0) {
    if (delta <= 0) delta += Math.PI * 2
  } else {
    if (delta >= 0) delta -= Math.PI * 2
  }
  const out: AcExMarkupPoint2d[] = []
  const steps = Math.max(2, samples)
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const a = a0 + delta * t
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
  }
  return out
}

function tessellateMarkupCloud(
  vertices: AcExMarkupCloudVertex[]
): AcExMarkupPoint2d[] {
  if (vertices.length < 2) return vertices.map(v => ({ x: v.x, y: v.y }))
  const points: AcExMarkupPoint2d[] = [
    { x: vertices[0].x, y: vertices[0].y }
  ]
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]!
    const b = vertices[(i + 1) % vertices.length]!
    const seg = tessellateBulgeSegment(
      { x: a.x, y: a.y },
      { x: b.x, y: b.y },
      a.bulge
    )
    for (const p of seg) points.push(p)
  }
  return points
}

/** Stroke a revision cloud on a canvas context (screen projection). */
export function acExStrokeMarkupCloud(
  ctx: CanvasRenderingContext2D,
  first: AcExMarkupPoint2d,
  second: AcExMarkupPoint2d,
  worldToScreen: (p: AcExMarkupPoint2d) => { x: number; y: number },
  screenToWorld: (p: { x: number; y: number }) => AcExMarkupPoint2d,
  color: string,
  lineWidth: number
): void {
  const vertices = markupCloudVertices(
    first,
    second,
    worldToScreen,
    screenToWorld
  )
  const world = tessellateMarkupCloud(vertices)
  if (world.length < 2) return
  const screen = world.map(p => worldToScreen(p))
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(screen[0]!.x, screen[0]!.y)
  for (let i = 1; i < screen.length; i++) {
    ctx.lineTo(screen[i]!.x, screen[i]!.y)
  }
  ctx.closePath()
  ctx.stroke()
}

/** Shortest distance from a screen point to a line segment (pixels). */
export function acExDistToSegmentPx(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-12) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Distance from a screen point to a rectangle outline (not the interior). */
export function acExDistToRectOutlinePx(
  px: number,
  py: number,
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)
  return Math.min(
    acExDistToSegmentPx(px, py, minX, minY, maxX, minY),
    acExDistToSegmentPx(px, py, maxX, minY, maxX, maxY),
    acExDistToSegmentPx(px, py, maxX, maxY, minX, maxY),
    acExDistToSegmentPx(px, py, minX, maxY, minX, minY)
  )
}

/** Approximate center of a markup for badge placement / focus. */
export function acExMarkupCenter(
  record: AcExMarkupRecord
): AcExMarkupPoint2d | null {
  const g = record.geometry
  switch (g.type) {
    case 'text':
    case 'stamp':
    case 'symbol':
      return { ...g.position }
    case 'line':
    case 'arrow':
      return {
        x: (g.start.x + g.end.x) / 2,
        y: (g.start.y + g.end.y) / 2
      }
    case 'cloud':
    case 'rect':
    case 'highlight':
      return {
        x: (g.corner1.x + g.corner2.x) / 2,
        y: (g.corner1.y + g.corner2.y) / 2
      }
    case 'circle':
      return { ...g.center }
    case 'callout':
      return {
        x: (g.tip.x + g.anchor.x) / 2,
        y: (g.tip.y + g.anchor.y) / 2
      }
    default:
      return null
  }
}

function acExTranslatePoint(
  p: AcExMarkupPoint2d,
  dx: number,
  dy: number
): AcExMarkupPoint2d {
  return { x: p.x + dx, y: p.y + dy }
}

function acExTranslateAttachedCallout(
  callout: AcExMarkupAttachedCallout,
  dx: number,
  dy: number
): AcExMarkupAttachedCallout {
  return {
    ...callout,
    tip: acExTranslatePoint(callout.tip, dx, dy),
    anchor: acExTranslatePoint(callout.anchor, dx, dy)
  }
}

/**
 * Translate markup geometry by a world-space offset (including attached callout).
 */
export function acExTranslateMarkupGeometry(
  geometry: AcExMarkupGeometry,
  dx: number,
  dy: number
): AcExMarkupGeometry {
  switch (geometry.type) {
    case 'cloud':
      return {
        ...geometry,
        corner1: acExTranslatePoint(geometry.corner1, dx, dy),
        corner2: acExTranslatePoint(geometry.corner2, dx, dy),
        callout: geometry.callout
          ? acExTranslateAttachedCallout(geometry.callout, dx, dy)
          : undefined
      }
    case 'rect':
      return {
        ...geometry,
        corner1: acExTranslatePoint(geometry.corner1, dx, dy),
        corner2: acExTranslatePoint(geometry.corner2, dx, dy),
        callout: geometry.callout
          ? acExTranslateAttachedCallout(geometry.callout, dx, dy)
          : undefined
      }
    case 'highlight':
      return {
        ...geometry,
        corner1: acExTranslatePoint(geometry.corner1, dx, dy),
        corner2: acExTranslatePoint(geometry.corner2, dx, dy)
      }
    case 'circle':
      return {
        ...geometry,
        center: acExTranslatePoint(geometry.center, dx, dy),
        callout: geometry.callout
          ? acExTranslateAttachedCallout(geometry.callout, dx, dy)
          : undefined
      }
    case 'callout':
      return {
        ...geometry,
        tip: acExTranslatePoint(geometry.tip, dx, dy),
        anchor: acExTranslatePoint(geometry.anchor, dx, dy)
      }
    case 'arrow':
    case 'line':
      return {
        ...geometry,
        start: acExTranslatePoint(geometry.start, dx, dy),
        end: acExTranslatePoint(geometry.end, dx, dy)
      }
    case 'text':
    case 'stamp':
    case 'symbol':
      return {
        ...geometry,
        position: acExTranslatePoint(geometry.position, dx, dy)
      }
  }
}

/**
 * Hit-test markup geometry in screen space.
 * @returns true when the pointer is within `thresholdPx` of the stroke / shape.
 */
export function acExHitTestMarkup(
  record: AcExMarkupRecord,
  clientX: number,
  clientY: number,
  thresholdPx: number,
  worldToScreen: (p: AcExMarkupPoint2d) => { x: number; y: number }
): boolean {
  const g = record.geometry
  switch (g.type) {
    case 'text':
    case 'stamp':
    case 'symbol': {
      const s = worldToScreen(g.position)
      return Math.hypot(clientX - s.x, clientY - s.y) <= thresholdPx * 2.5
    }
    case 'line':
    case 'arrow': {
      const a = worldToScreen(g.start)
      const b = worldToScreen(g.end)
      return (
        acExDistToSegmentPx(clientX, clientY, a.x, a.y, b.x, b.y) <=
        thresholdPx
      )
    }
    case 'callout': {
      const a = worldToScreen(g.tip)
      const b = worldToScreen(g.anchor)
      return (
        acExDistToSegmentPx(clientX, clientY, a.x, a.y, b.x, b.y) <=
        thresholdPx
      )
    }
    case 'rect':
    case 'highlight':
    case 'cloud': {
      const a = worldToScreen(g.corner1)
      const b = worldToScreen(g.corner2)
      const minX = Math.min(a.x, b.x) - thresholdPx
      const maxX = Math.max(a.x, b.x) + thresholdPx
      const minY = Math.min(a.y, b.y) - thresholdPx
      const maxY = Math.max(a.y, b.y) + thresholdPx
      // Prefer stroke near edges for cloud/rect; fill for highlight.
      if (g.type === 'highlight') {
        return (
          clientX >= minX &&
          clientX <= maxX &&
          clientY >= minY &&
          clientY <= maxY
        )
      }
      const inside =
        clientX >= Math.min(a.x, b.x) &&
        clientX <= Math.max(a.x, b.x) &&
        clientY >= Math.min(a.y, b.y) &&
        clientY <= Math.max(a.y, b.y)
      let shapeHit = false
      if (!inside) {
        shapeHit =
          clientX >= minX &&
          clientX <= maxX &&
          clientY >= minY &&
          clientY <= maxY
      } else {
        const distEdge = Math.min(
          Math.abs(clientX - Math.min(a.x, b.x)),
          Math.abs(clientX - Math.max(a.x, b.x)),
          Math.abs(clientY - Math.min(a.y, b.y)),
          Math.abs(clientY - Math.max(a.y, b.y))
        )
        shapeHit = distEdge <= thresholdPx * 2 || g.type === 'cloud'
      }
      if (shapeHit) return true
      if (g.type === 'rect' || g.type === 'cloud') {
        return hitAttachedCallout(
          g.callout,
          clientX,
          clientY,
          thresholdPx,
          worldToScreen
        )
      }
      return false
    }
    case 'circle': {
      const c = worldToScreen(g.center)
      const rim = worldToScreen({
        x: g.center.x + g.radius,
        y: g.center.y
      })
      const rPx = Math.hypot(rim.x - c.x, rim.y - c.y)
      const d = Math.hypot(clientX - c.x, clientY - c.y)
      if (Math.abs(d - rPx) <= thresholdPx * 2) return true
      return hitAttachedCallout(
        g.callout,
        clientX,
        clientY,
        thresholdPx,
        worldToScreen
      )
    }
    default:
      return false
  }
}

function hitAttachedCallout(
  callout: AcExMarkupAttachedCallout | undefined,
  clientX: number,
  clientY: number,
  thresholdPx: number,
  worldToScreen: (p: AcExMarkupPoint2d) => { x: number; y: number }
): boolean {
  if (!callout) return false
  const a = worldToScreen(callout.tip)
  const b = worldToScreen(callout.anchor)
  return (
    acExDistToSegmentPx(clientX, clientY, a.x, a.y, b.x, b.y) <= thresholdPx
  )
}
