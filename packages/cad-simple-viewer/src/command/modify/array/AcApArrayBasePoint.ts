import { AcDbEntity, AcGePoint3d } from '@mlightcad/data-model'

/**
 * Default array base point for the selection (extents centroid).
 *
 * AutoCAD polar arrays use a base on the source objects — not the array
 * center — so the radius is `|base − center|`. Using the center as base made
 * `getItemTransform` a pure world-origin rotation and broke live preview.
 */
export function acapArraySelectionBasePoint(
  entities: readonly AcDbEntity[],
  fallback: AcGePoint3d
): AcGePoint3d {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  let any = false

  for (const entity of entities) {
    const box = entity.geometricExtents
    if (!box) continue
    any = true
    minX = Math.min(minX, box.min.x)
    minY = Math.min(minY, box.min.y)
    minZ = Math.min(minZ, box.min.z)
    maxX = Math.max(maxX, box.max.x)
    maxY = Math.max(maxY, box.max.y)
    maxZ = Math.max(maxZ, box.max.z)
  }

  if (!any) return fallback.clone()
  return new AcGePoint3d(
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2
  )
}
