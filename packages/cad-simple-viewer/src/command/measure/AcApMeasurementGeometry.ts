import { AcGeBox2d, AcGeMathUtil } from '@mlightcad/data-model'

import {
  type AcApScreenPoint,
  distPointToArcPx,
  distPointToCirclePx,
  distPointToPolylinePx,
  distPointToSegmentPx,
  pointInPolygonPx
} from '../../util/AcApScreenHitTest'
import { measureAngleArcRadiusWcs } from './AcApMeasureAngleArc'
import type { AcApMeasurementGeometry } from './AcApMeasurementTypes'

type WorldToScreen = (point: { x: number; y: number }) => AcApScreenPoint

type ClientToWorld = (clientX: number, clientY: number) => {
  x: number
  y: number
}

type OverlayClientRect = {
  left: number
  top: number
  right: number
  bottom: number
}

/** Fallback pad (world units) when a point measurement has no overlay size. */
const DEGENERATE_FOCUS_PAD_WCS = 1

/**
 * Axis-aligned world bounds of a measurement's control geometry.
 *
 * Used for window / crossing box selection. Point measurements use their
 * position; arcs use the full circle AABB of `center` ± `radius`.
 */
export function measurementGeometryBounds(
  geometry: AcApMeasurementGeometry
): AcGeBox2d | undefined {
  const box = new AcGeBox2d()
  switch (geometry.type) {
    case 'distance':
      box.expandByPoint(geometry.start).expandByPoint(geometry.end)
      break
    case 'angle':
      box
        .expandByPoint(geometry.vertex)
        .expandByPoint(geometry.arm1)
        .expandByPoint(geometry.arm2)
      break
    case 'area':
      for (const point of geometry.points) {
        box.expandByPoint(point)
      }
      break
    case 'arc':
      box
        .expandByPoint({
          x: geometry.center.x - geometry.radius,
          y: geometry.center.y - geometry.radius
        })
        .expandByPoint({
          x: geometry.center.x + geometry.radius,
          y: geometry.center.y + geometry.radius
        })
      break
    case 'point':
      box.expandByPoint(geometry.position)
      break
    default:
      return undefined
  }
  return box.isEmpty() ? undefined : box
}

function padDegenerateMeasurementBox(box: AcGeBox2d): void {
  const width = box.max.x - box.min.x
  const height = box.max.y - box.min.y
  if (width > 1e-8 || height > 1e-8) return
  const pad = DEGENERATE_FOCUS_PAD_WCS
  box.expandByPoint({ x: box.min.x - pad, y: box.min.y - pad })
  box.expandByPoint({ x: box.max.x + pad, y: box.max.y + pad })
}

/**
 * Combined zoom-to box: control geometry plus HTML overlay rectangles.
 *
 * Point / coordinate measurements are a degenerate AABB on their own. Union
 * the badge (capsule) client rect so the camera frames the label instead of
 * zooming onto the point. A 1-unit pad remains only when no overlay size is
 * available.
 */
export function measurementFocusBox(
  geometry: AcApMeasurementGeometry,
  overlayRects: ReadonlyArray<OverlayClientRect>,
  clientToWorld: ClientToWorld
): AcGeBox2d | undefined {
  const geometryBox = measurementGeometryBounds(geometry)
  const box = geometryBox
    ? new AcGeBox2d(geometryBox.min, geometryBox.max)
    : new AcGeBox2d()
  for (const rect of overlayRects) {
    if (rect.right <= rect.left && rect.bottom <= rect.top) continue
    box.expandByPoint(clientToWorld(rect.left, rect.top))
    box.expandByPoint(clientToWorld(rect.right, rect.bottom))
  }
  if (box.isEmpty()) return undefined
  padDegenerateMeasurementBox(box)
  return box
}

/**
 * Whether a canvas-space pick hits a measurement's drawn stroke or fill.
 *
 * Point measurements are skipped — they are selected via HTML badges / dots.
 */
export function hitTestMeasurementGeometry(
  geometry: AcApMeasurementGeometry,
  canvas: AcApScreenPoint,
  worldToScreen: WorldToScreen,
  threshold: number
): boolean {
  switch (geometry.type) {
    case 'distance': {
      const a = worldToScreen(geometry.start)
      const b = worldToScreen(geometry.end)
      return (
        distPointToSegmentPx(canvas.x, canvas.y, a.x, a.y, b.x, b.y) <=
        threshold
      )
    }
    case 'angle': {
      const vertex = worldToScreen(geometry.vertex)
      const arm1 = worldToScreen(geometry.arm1)
      const arm2 = worldToScreen(geometry.arm2)
      if (
        distPointToSegmentPx(
          canvas.x,
          canvas.y,
          vertex.x,
          vertex.y,
          arm1.x,
          arm1.y
        ) <= threshold ||
        distPointToSegmentPx(
          canvas.x,
          canvas.y,
          vertex.x,
          vertex.y,
          arm2.x,
          arm2.y
        ) <= threshold
      ) {
        return true
      }
      const startAngle = Math.atan2(arm1.y - vertex.y, arm1.x - vertex.x)
      const endAngle = Math.atan2(arm2.y - vertex.y, arm2.x - vertex.x)
      const antiClockwise =
        AcGeMathUtil.normalizeAngle(endAngle - startAngle) > Math.PI
      const origin = worldToScreen({ x: 0, y: 0 })
      const unit = worldToScreen({ x: 1, y: 0 })
      const ppu = Math.hypot(unit.x - origin.x, unit.y - origin.y)
      const r =
        measureAngleArcRadiusWcs(
          geometry.vertex,
          geometry.arm1,
          geometry.arm2
        ) * (ppu > 0 && Number.isFinite(ppu) ? ppu : 1)
      if (!(r > 0)) return false
      return (
        distPointToArcPx(
          canvas.x,
          canvas.y,
          vertex.x,
          vertex.y,
          r,
          startAngle,
          endAngle,
          antiClockwise
        ) <= threshold
      )
    }
    case 'area': {
      const verts = geometry.points.map(worldToScreen)
      if (verts.length < 2) return false
      if (pointInPolygonPx(canvas.x, canvas.y, verts)) return true
      return distPointToPolylinePx(canvas.x, canvas.y, verts, true) <= threshold
    }
    case 'arc': {
      const center = worldToScreen(geometry.center)
      const start = worldToScreen(geometry.start)
      const end = worldToScreen(geometry.end)
      const radius = Math.hypot(start.x - center.x, start.y - center.y)
      if (!(radius > 0)) {
        return (
          distPointToCirclePx(canvas.x, canvas.y, center.x, center.y, 0) <=
          threshold
        )
      }
      const startAngle = Math.atan2(start.y - center.y, start.x - center.x)
      const endAngle = Math.atan2(end.y - center.y, end.x - center.x)
      let antiClockwise =
        AcGeMathUtil.normalizeAngle(endAngle - startAngle) > Math.PI
      if (geometry.through) {
        const through = worldToScreen(geometry.through)
        const midAngle = Math.atan2(through.y - center.y, through.x - center.x)
        antiClockwise = !AcGeMathUtil.isAngleOnCcwSweep(
          startAngle,
          midAngle,
          endAngle
        )
      }
      return (
        distPointToArcPx(
          canvas.x,
          canvas.y,
          center.x,
          center.y,
          radius,
          startAngle,
          endAngle,
          antiClockwise
        ) <= threshold
      )
    }
    case 'point':
      return false
  }
}
