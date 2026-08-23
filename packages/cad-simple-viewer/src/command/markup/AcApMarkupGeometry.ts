import { AcGeBox2d } from '@mlightcad/data-model'

import {
  type AcApScreenPoint,
  distPointToCirclePx,
  distPointToRectOutlinePx,
  distPointToSegmentPx,
  pointInRectPx
} from '../../util/AcApScreenHitTest'
import type { AcApMarkupShapeOutline } from './AcApMarkupShapeCallout'
import type {
  AcApMarkupAttachedCallout,
  AcApMarkupCircleGeometry,
  AcApMarkupCloudGeometry,
  AcApMarkupGeometry,
  AcApMarkupPoint2d,
  AcApMarkupRectGeometry
} from './AcApMarkupTypes'

/** Extra hit slop for revision-cloud lobes around the AABB. */
const CLOUD_HIT_EXTRA_PX = 8

type WorldToScreen = (point: AcApMarkupPoint2d) => AcApScreenPoint

/**
 * Translate a 2D markup point by a world-space delta.
 *
 * @param point - Original point.
 * @param dx - World X translation.
 * @param dy - World Y translation.
 * @returns A new point; `point` is not mutated.
 */
export function translateMarkupPoint(
  point: AcApMarkupPoint2d,
  dx: number,
  dy: number
): AcApMarkupPoint2d {
  return { x: point.x + dx, y: point.y + dy }
}

/**
 * Translate an attached shape callout by a world-space delta.
 *
 * @param callout - Callout whose tip and anchor are moved.
 * @param dx - World X translation.
 * @param dy - World Y translation.
 * @returns A new callout; text is copied unchanged.
 */
export function translateAttachedCallout(
  callout: AcApMarkupAttachedCallout,
  dx: number,
  dy: number
): AcApMarkupAttachedCallout {
  return {
    tip: translateMarkupPoint(callout.tip, dx, dy),
    anchor: translateMarkupPoint(callout.anchor, dx, dy),
    text: callout.text
  }
}

/**
 * Center point used as the move grip for a markup.
 *
 * @param geometry - Markup geometry to inspect.
 * @returns Midpoint, center, or position, or `undefined` for unknown types.
 */
export function markupGeometryCenter(
  geometry: AcApMarkupGeometry
): AcApMarkupPoint2d | undefined {
  switch (geometry.type) {
    case 'cloud':
    case 'rect':
    case 'highlight':
      return {
        x: (geometry.corner1.x + geometry.corner2.x) / 2,
        y: (geometry.corner1.y + geometry.corner2.y) / 2
      }
    case 'circle':
      return { ...geometry.center }
    case 'callout':
      return {
        x: (geometry.tip.x + geometry.anchor.x) / 2,
        y: (geometry.tip.y + geometry.anchor.y) / 2
      }
    case 'arrow':
    case 'line':
      return {
        x: (geometry.start.x + geometry.end.x) / 2,
        y: (geometry.start.y + geometry.end.y) / 2
      }
    case 'text':
    case 'stamp':
    case 'symbol':
      return { ...geometry.position }
    default:
      return undefined
  }
}

/**
 * Translate a markup's geometry by a world-space delta.
 *
 * Radius and stamp ids are preserved; only positions move.
 *
 * @param geometry - Geometry to translate.
 * @param dx - World X translation.
 * @param dy - World Y translation.
 * @returns A new geometry object of the same type.
 */
export function translateMarkupGeometry(
  geometry: AcApMarkupGeometry,
  dx: number,
  dy: number
): AcApMarkupGeometry {
  switch (geometry.type) {
    case 'cloud':
      return {
        ...geometry,
        corner1: translateMarkupPoint(geometry.corner1, dx, dy),
        corner2: translateMarkupPoint(geometry.corner2, dx, dy),
        callout: geometry.callout
          ? translateAttachedCallout(geometry.callout, dx, dy)
          : undefined
      }
    case 'rect':
      return {
        ...geometry,
        corner1: translateMarkupPoint(geometry.corner1, dx, dy),
        corner2: translateMarkupPoint(geometry.corner2, dx, dy),
        callout: geometry.callout
          ? translateAttachedCallout(geometry.callout, dx, dy)
          : undefined
      }
    case 'highlight':
      return {
        ...geometry,
        corner1: translateMarkupPoint(geometry.corner1, dx, dy),
        corner2: translateMarkupPoint(geometry.corner2, dx, dy)
      }
    case 'circle':
      return {
        ...geometry,
        center: translateMarkupPoint(geometry.center, dx, dy),
        callout: geometry.callout
          ? translateAttachedCallout(geometry.callout, dx, dy)
          : undefined
      }
    case 'callout':
      return {
        ...geometry,
        tip: translateMarkupPoint(geometry.tip, dx, dy),
        anchor: translateMarkupPoint(geometry.anchor, dx, dy)
      }
    case 'arrow':
    case 'line':
      return {
        ...geometry,
        start: translateMarkupPoint(geometry.start, dx, dy),
        end: translateMarkupPoint(geometry.end, dx, dy)
      }
    case 'text':
    case 'stamp':
    case 'symbol':
      return {
        ...geometry,
        position: translateMarkupPoint(geometry.position, dx, dy)
      }
  }
}

function hitTestLeader(
  callout: AcApMarkupAttachedCallout | { tip: AcApMarkupPoint2d; anchor: AcApMarkupPoint2d },
  canvas: AcApScreenPoint,
  worldToScreen: WorldToScreen,
  threshold: number
): boolean {
  const tip = worldToScreen(callout.tip)
  const anchor = worldToScreen(callout.anchor)
  return (
    distPointToSegmentPx(canvas.x, canvas.y, tip.x, tip.y, anchor.x, anchor.y) <=
    threshold
  )
}

function expandAttachedCallout(
  box: AcGeBox2d,
  callout: AcApMarkupAttachedCallout | undefined
): void {
  if (!callout) return
  box.expandByPoint(callout.tip)
  box.expandByPoint(callout.anchor)
}

/**
 * Axis-aligned world bounds of a markup's control geometry.
 *
 * Used for window / crossing box selection. Point-like markups (text / stamp /
 * symbol) use their anchor; shapes include attached callout tip and anchor.
 */
export function markupGeometryBounds(
  geometry: AcApMarkupGeometry
): AcGeBox2d | undefined {
  const box = new AcGeBox2d()
  switch (geometry.type) {
    case 'line':
    case 'arrow':
      box.expandByPoint(geometry.start).expandByPoint(geometry.end)
      break
    case 'rect':
    case 'cloud':
      box.expandByPoint(geometry.corner1).expandByPoint(geometry.corner2)
      expandAttachedCallout(box, geometry.callout)
      break
    case 'highlight':
      box.expandByPoint(geometry.corner1).expandByPoint(geometry.corner2)
      break
    case 'circle':
      box
        .expandByPoint({
          x: geometry.center.x - geometry.radius,
          y: geometry.center.y - geometry.radius
        })
        .expandByPoint({
          x: geometry.center.x + geometry.radius,
          y: geometry.center.y + geometry.radius
        })
      expandAttachedCallout(box, geometry.callout)
      break
    case 'callout':
      box.expandByPoint(geometry.tip).expandByPoint(geometry.anchor)
      break
    case 'text':
    case 'stamp':
    case 'symbol':
      box.expandByPoint(geometry.position)
      break
    default:
      return undefined
  }
  return box.isEmpty() ? undefined : box
}

/**
 * Cloud / rect / circle geometry that can receive an attached callout.
 */
export type AcApMarkupAttachableShapeGeometry =
  | AcApMarkupCloudGeometry
  | AcApMarkupRectGeometry
  | AcApMarkupCircleGeometry

/**
 * Whether geometry is a cloud / rect / circle with no leader + text box yet.
 */
export function isAttachableShapeMarkup(
  geometry: AcApMarkupGeometry
): geometry is AcApMarkupAttachableShapeGeometry {
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
export function markupShapeOutlineFromGeometry(
  geometry: AcApMarkupAttachableShapeGeometry
): AcApMarkupShapeOutline {
  if (geometry.type === 'circle') {
    return {
      kind: 'circle',
      center: geometry.center,
      radius: geometry.radius
    }
  }
  return {
    kind: geometry.type,
    corner1: geometry.corner1,
    corner2: geometry.corner2
  }
}

/**
 * Whether a canvas-space pick hits a cloud / rect / circle outer frame
 * (AABB for cloud/rect, circumference for circle). Does not hit interiors
 * or an already-attached callout leader.
 */
export function hitTestMarkupShapeOutline(
  geometry: AcApMarkupGeometry,
  canvas: AcApScreenPoint,
  worldToScreen: WorldToScreen,
  threshold: number
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
        canvas.x >= minX &&
        canvas.x <= maxX &&
        canvas.y >= minY &&
        canvas.y <= maxY
      if (!inside) {
        return (
          distPointToRectOutlinePx(canvas.x, canvas.y, a, b) <= threshold
        )
      }
      const distEdge = Math.min(
        Math.abs(canvas.x - minX),
        Math.abs(canvas.x - maxX),
        Math.abs(canvas.y - minY),
        Math.abs(canvas.y - maxY)
      )
      return distEdge <= threshold
    }
    case 'cloud': {
      const a = worldToScreen(geometry.corner1)
      const b = worldToScreen(geometry.corner2)
      const minX = Math.min(a.x, b.x)
      const maxX = Math.max(a.x, b.x)
      const minY = Math.min(a.y, b.y)
      const maxY = Math.max(a.y, b.y)
      const tol = threshold + CLOUD_HIT_EXTRA_PX
      const inside =
        canvas.x >= minX &&
        canvas.x <= maxX &&
        canvas.y >= minY &&
        canvas.y <= maxY
      if (!inside) {
        return distPointToRectOutlinePx(canvas.x, canvas.y, a, b) <= tol
      }
      const distEdge = Math.min(
        Math.abs(canvas.x - minX),
        Math.abs(canvas.x - maxX),
        Math.abs(canvas.y - minY),
        Math.abs(canvas.y - maxY)
      )
      return distEdge <= tol
    }
    case 'circle': {
      const c = worldToScreen(geometry.center)
      const rim = worldToScreen({
        x: geometry.center.x + geometry.radius,
        y: geometry.center.y
      })
      const radius = Math.hypot(rim.x - c.x, rim.y - c.y)
      return (
        distPointToCirclePx(canvas.x, canvas.y, c.x, c.y, radius) <= threshold
      )
    }
    default:
      return false
  }
}

/**
 * Whether a canvas-space pick hits a markup's drawn stroke (not HTML capsules).
 *
 * Hollow shapes (rect / cloud / circle) hit on the outline only. Highlights
 * also hit their filled interior. Text / stamp / symbol are skipped — those
 * are selected via their HTML overlays.
 */
export function hitTestMarkupGeometry(
  geometry: AcApMarkupGeometry,
  canvas: AcApScreenPoint,
  worldToScreen: WorldToScreen,
  threshold: number
): boolean {
  switch (geometry.type) {
    case 'line':
    case 'arrow': {
      const a = worldToScreen(geometry.start)
      const b = worldToScreen(geometry.end)
      return (
        distPointToSegmentPx(canvas.x, canvas.y, a.x, a.y, b.x, b.y) <=
        threshold
      )
    }
    case 'rect':
    case 'cloud':
    case 'circle': {
      if (
        hitTestMarkupShapeOutline(geometry, canvas, worldToScreen, threshold)
      ) {
        return true
      }
      return geometry.callout
        ? hitTestLeader(geometry.callout, canvas, worldToScreen, threshold)
        : false
    }
    case 'highlight':
      return (
        pointInRectPx(
          canvas.x,
          canvas.y,
          worldToScreen(geometry.corner1),
          worldToScreen(geometry.corner2)
        ) ||
        distPointToRectOutlinePx(
          canvas.x,
          canvas.y,
          worldToScreen(geometry.corner1),
          worldToScreen(geometry.corner2)
        ) <= threshold
      )
    case 'callout':
      return hitTestLeader(geometry, canvas, worldToScreen, threshold)
    case 'text':
    case 'stamp':
    case 'symbol':
      return false
  }
}
