/**
 * Markup shape polyline builders (revision cloud and rectangle).
 */

import {
  AcDbPolyline,
  AcGePoint2d,
  type AcGePoint2dLike
} from '@mlightcad/data-model'

import type { AcEdBaseView } from '../../editor'

/**
 * Target screen diameter in CSS pixels for each revision-cloud lobe.
 */
const CLOUD_DIAMETER_PIXELS = 8

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
 * Rebuild a closed revision-cloud polyline between two opposite corners.
 *
 * Vertices and bulges are regenerated so lobe size tracks the current view
 * scale ({@link CLOUD_DIAMETER_PIXELS}).
 *
 * @param cloud - Polyline to reset and fill.
 * @param firstPoint - One corner of the cloud AABB.
 * @param secondPoint - Opposite corner of the cloud AABB.
 * @param view - View used to size lobes in screen pixels.
 */
export function buildMarkupCloud(
  cloud: AcDbPolyline,
  firstPoint: AcGePoint2dLike,
  secondPoint: AcGePoint2dLike,
  view: AcEdBaseView
): void {
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
  const chordLength = Math.max(cloudDiameter, 1e-6)
  const numSegmentsX = Math.max(4, Math.ceil(width / chordLength) * 2)
  const numSegmentsY = Math.max(4, Math.ceil(height / chordLength) * 2)

  const points: AcGePoint2d[] = []
  const bulges: (number | undefined)[] = []
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
    points.push(new AcGePoint2d(minX + width * t, minY))
    bulges.push(
      i < numSegmentsX ? calculateBulge(segmentIndex++ % 2 === 0) : undefined
    )
  }
  for (let i = 1; i <= numSegmentsY; i++) {
    const t = i / numSegmentsY
    points.push(new AcGePoint2d(maxX, minY + height * t))
    bulges.push(
      i < numSegmentsY ? calculateBulge(segmentIndex++ % 2 === 0) : undefined
    )
  }
  for (let i = 1; i <= numSegmentsX; i++) {
    const t = 1 - i / numSegmentsX
    points.push(new AcGePoint2d(minX + width * t, maxY))
    bulges.push(
      i < numSegmentsX ? calculateBulge(segmentIndex++ % 2 === 0) : undefined
    )
  }
  for (let i = 1; i < numSegmentsY; i++) {
    const t = 1 - i / numSegmentsY
    points.push(new AcGePoint2d(minX, minY + height * t))
    bulges.push(
      i < numSegmentsY - 1
        ? calculateBulge(segmentIndex++ % 2 === 0)
        : undefined
    )
  }

  for (let i = 0; i < points.length; i++) {
    cloud.addVertexAt(i, points[i], bulges[i])
  }
  cloud.closed = true
}

/**
 * Build a closed rectangle polyline between two opposite corners.
 *
 * @param rect - Polyline to reset and fill with four corners.
 * @param first - One corner of the rectangle.
 * @param second - Opposite corner of the rectangle.
 */
export function buildMarkupRect(
  rect: AcDbPolyline,
  first: AcGePoint2dLike,
  second: AcGePoint2dLike
): void {
  rect.reset(false)
  rect.addVertexAt(0, new AcGePoint2d(first.x, first.y))
  rect.addVertexAt(1, new AcGePoint2d(second.x, first.y))
  rect.addVertexAt(2, new AcGePoint2d(second.x, second.y))
  rect.addVertexAt(3, new AcGePoint2d(first.x, second.y))
  rect.closed = true
}
