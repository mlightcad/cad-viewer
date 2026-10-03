import { AcGePoint2dLike } from '@mlightcad/data-model'

type PickBounds = { minX: number; minY: number; maxX: number; maxY: number }

export function sortPickResults<T extends PickBounds>(
  results: T[],
  point: AcGePoint2dLike
) {
  return [...results].sort((a, b) => comparePickResults(a, b, point))
}

function comparePickResults(
  a: PickBounds,
  b: PickBounds,
  point: AcGePoint2dLike
) {
  const areaDelta = bboxArea(a) - bboxArea(b)
  if (Math.abs(areaDelta) > Number.EPSILON) return areaDelta

  const distanceDelta =
    squaredDistanceToBox(point, a) - squaredDistanceToBox(point, b)
  if (Math.abs(distanceDelta) > Number.EPSILON) return distanceDelta

  return 0
}

function bboxArea(item: PickBounds) {
  return Math.max(item.maxX - item.minX, 0) * Math.max(item.maxY - item.minY, 0)
}

function squaredDistanceToBox(point: AcGePoint2dLike, item: PickBounds) {
  const dx =
    point.x < item.minX
      ? item.minX - point.x
      : point.x > item.maxX
        ? point.x - item.maxX
        : 0
  const dy =
    point.y < item.minY
      ? item.minY - point.y
      : point.y > item.maxY
        ? point.y - item.maxY
        : 0

  return dx * dx + dy * dy
}
