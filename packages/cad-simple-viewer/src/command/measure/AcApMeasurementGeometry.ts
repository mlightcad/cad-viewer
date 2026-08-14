import {
  type AcApScreenPoint,
  distPointToArcPx,
  distPointToCirclePx,
  distPointToPolylinePx,
  distPointToSegmentPx,
  pointInPolygonPx
} from '../../util/AcApScreenHitTest'
import type { AcApMeasurementGeometry } from './AcApMeasurementTypes'

type WorldToScreen = (point: { x: number; y: number }) => AcApScreenPoint

const TWO_PI = Math.PI * 2

function normaliseAngle(a: number): number {
  return ((a % TWO_PI) + TWO_PI) % TWO_PI
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
      const len1 = Math.hypot(arm1.x - vertex.x, arm1.y - vertex.y)
      const len2 = Math.hypot(arm2.x - vertex.x, arm2.y - vertex.y)
      const r = Math.max(Math.min(len1, len2) * 0.3, 15)
      const startAngle = Math.atan2(arm1.y - vertex.y, arm1.x - vertex.x)
      const endAngle = Math.atan2(arm2.y - vertex.y, arm2.x - vertex.x)
      const antiClockwise = normaliseAngle(endAngle - startAngle) > Math.PI
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
      return (
        distPointToPolylinePx(canvas.x, canvas.y, verts, true) <= threshold
      )
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
      const cwSpan = normaliseAngle(endAngle - startAngle)
      const antiClockwise = cwSpan > Math.PI
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
