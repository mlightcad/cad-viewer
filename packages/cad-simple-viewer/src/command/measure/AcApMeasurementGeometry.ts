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
