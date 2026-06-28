import type { AcEdBaseView } from '@mlightcad/cad-simple-viewer'
import {
  AcDbPolyline,
  AcGePoint2d,
  type AcGePoint2dLike
} from '@mlightcad/data-model'

import type { Box2d, Point2d } from '../model/types'

const CLOUD_DIAMETER_PIXELS = 8

export function pixelToWorldDistance(
  view: AcEdBaseView,
  pixelDistance: number,
  referencePoint: AcGePoint2dLike
): number {
  const screenPoint1 = view.worldToScreen(referencePoint)
  const screenPoint2 = new AcGePoint2d(
    screenPoint1.x + pixelDistance,
    screenPoint1.y
  )
  const worldPoint2 = view.screenToWorld(screenPoint2)
  return Math.abs(worldPoint2.x - referencePoint.x)
}

export function buildRectPolyline(
  polyline: AcDbPolyline,
  firstPoint: AcGePoint2dLike,
  secondPoint: AcGePoint2dLike
) {
  polyline.reset(false)
  polyline.addVertexAt(0, new AcGePoint2d(firstPoint))
  polyline.addVertexAt(1, new AcGePoint2d(secondPoint.x, firstPoint.y))
  polyline.addVertexAt(2, new AcGePoint2d(secondPoint))
  polyline.addVertexAt(3, new AcGePoint2d(firstPoint.x, secondPoint.y))
  polyline.closed = true
}

export function buildCloudPolyline(
  cloud: AcDbPolyline,
  firstPoint: AcGePoint2dLike,
  secondPoint: AcGePoint2dLike,
  view: AcEdBaseView
) {
  cloud.reset(false)

  const minX = Math.min(firstPoint.x, secondPoint.x)
  const maxX = Math.max(firstPoint.x, secondPoint.x)
  const minY = Math.min(firstPoint.y, secondPoint.y)
  const maxY = Math.max(firstPoint.y, secondPoint.y)

  const width = maxX - minX
  const height = maxY - minY

  const centerPoint = new AcGePoint2d((minX + maxX) / 2, (minY + maxY) / 2)
  const cloudDiameter = pixelToWorldDistance(
    view,
    CLOUD_DIAMETER_PIXELS,
    centerPoint
  )

  const chordLength = cloudDiameter
  const numSegmentsX = Math.max(4, Math.ceil(width / chordLength) * 2)
  const numSegmentsY = Math.max(4, Math.ceil(height / chordLength) * 2)

  const points: AcGePoint2d[] = []
  const bulges: (number | undefined)[] = []
  let segmentIndex = 0

  const calculateBulge = (outward: boolean): number => (outward ? 0.4 : -0.4)

  for (let i = 0; i <= numSegmentsX; i++) {
    const t = i / numSegmentsX
    points.push(new AcGePoint2d(minX + width * t, minY))
    if (i < numSegmentsX) {
      bulges.push(calculateBulge(segmentIndex % 2 === 0))
      segmentIndex++
    } else {
      bulges.push(undefined)
    }
  }

  for (let i = 1; i <= numSegmentsY; i++) {
    const t = i / numSegmentsY
    points.push(new AcGePoint2d(maxX, minY + height * t))
    if (i < numSegmentsY) {
      bulges.push(calculateBulge(segmentIndex % 2 === 0))
      segmentIndex++
    } else {
      bulges.push(undefined)
    }
  }

  for (let i = 1; i <= numSegmentsX; i++) {
    const t = 1 - i / numSegmentsX
    points.push(new AcGePoint2d(minX + width * t, maxY))
    if (i < numSegmentsX) {
      bulges.push(calculateBulge(segmentIndex % 2 === 0))
      segmentIndex++
    } else {
      bulges.push(undefined)
    }
  }

  for (let i = 1; i < numSegmentsY; i++) {
    const t = 1 - i / numSegmentsY
    points.push(new AcGePoint2d(minX, minY + height * t))
    if (i < numSegmentsY - 1) {
      bulges.push(calculateBulge(segmentIndex % 2 === 0))
      segmentIndex++
    } else {
      bulges.push(undefined)
    }
  }

  for (let i = 0; i < points.length; i++) {
    cloud.addVertexAt(i, points[i], bulges[i])
  }

  cloud.closed = true
}

export function boxFromCorners(
  first: AcGePoint2dLike,
  second: AcGePoint2dLike
): Box2d {
  return {
    min: {
      x: Math.min(first.x, second.x),
      y: Math.min(first.y, second.y)
    },
    max: {
      x: Math.max(first.x, second.x),
      y: Math.max(first.y, second.y)
    }
  }
}

export function centerOfGeometry(
  geometry: { box?: Box2d; points?: Point2d[]; center?: Point2d; anchor?: Point2d; p1?: Point2d; p2?: Point2d }
): Point2d {
  if (geometry.center) return geometry.center
  if (geometry.anchor) return geometry.anchor
  if (geometry.box) {
    return {
      x: (geometry.box.min.x + geometry.box.max.x) / 2,
      y: (geometry.box.min.y + geometry.box.max.y) / 2
    }
  }
  if (geometry.points?.length) {
    const sum = geometry.points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    )
    return {
      x: sum.x / geometry.points.length,
      y: sum.y / geometry.points.length
    }
  }
  if (geometry.p1 && geometry.p2) {
    return {
      x: (geometry.p1.x + geometry.p2.x) / 2,
      y: (geometry.p1.y + geometry.p2.y) / 2
    }
  }
  return { x: 0, y: 0 }
}

export function distance2d(a: Point2d, b: Point2d): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}