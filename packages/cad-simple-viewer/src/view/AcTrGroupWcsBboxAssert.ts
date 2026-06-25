import type { AcTrGroup } from '@mlightcad/three-renderer'
import * as THREE from 'three'

const WCS_BBOX_TOLERANCE = 1e-5

export interface AcTrGroupWcsBboxLike {
  wcsBbox: THREE.Box3
  wcsChildBoxes: ReadonlyArray<{
    minX: number
    minY: number
    maxX: number
    maxY: number
  }>
}

/**
 * Tests whether a 2D axis-aligned box has finite extents.
 *
 * Deferred MText/Shape geometry can seed `±Infinity` placeholders in
 * {@link AcTrGroup.wcsChildBoxes}; those entries must be skipped when unioning
 * bounds for spatial indexing.
 */
export function isFiniteSpatialBBox(box: {
  minX: number
  minY: number
  maxX: number
  maxY: number
}): boolean {
  return (
    Number.isFinite(box.minX) &&
    Number.isFinite(box.minY) &&
    Number.isFinite(box.maxX) &&
    Number.isFinite(box.maxY)
  )
}

/**
 * Unions per-child WCS boxes into one axis-aligned WCS box.
 *
 * Non-finite child boxes are skipped, matching
 * {@link AcTrGroup.syncWcsBboxFromChildBoxes}.
 */
export function unionGroupWcsChildBoxes(
  group: AcTrGroupWcsBboxLike
): THREE.Box3 {
  const union = new THREE.Box3()
  for (const box of group.wcsChildBoxes) {
    if (!isFiniteSpatialBBox(box)) {
      continue
    }
    union.union(
      new THREE.Box3(
        new THREE.Vector3(box.minX, box.minY, 0),
        new THREE.Vector3(box.maxX, box.maxY, 0)
      )
    )
  }
  return union
}

/**
 * Verifies that a block group's aggregate {@link AcTrGroup.wcsBbox} matches the
 * union of its per-child {@link AcTrGroup.wcsChildBoxes}.
 *
 * Called from {@link AcTrView2d.handleGroup} in non-production builds. After
 * {@link AcDbRenderingCache.draw} applies the INSERT transform via
 * `applyMatrix`, both fields must stay in sync for spatial indexing.
 */
export function assertGroupWcsBboxesConsistent(
  group: AcTrGroupWcsBboxLike
): void {
  if (group.wcsChildBoxes.length === 0) {
    return
  }

  const union = unionGroupWcsChildBoxes(group)
  const wcs = group.wcsBbox
  const cornersMatch =
    Math.abs(wcs.min.x - union.min.x) <= WCS_BBOX_TOLERANCE &&
    Math.abs(wcs.min.y - union.min.y) <= WCS_BBOX_TOLERANCE &&
    Math.abs(wcs.min.z - union.min.z) <= WCS_BBOX_TOLERANCE &&
    Math.abs(wcs.max.x - union.max.x) <= WCS_BBOX_TOLERANCE &&
    Math.abs(wcs.max.y - union.max.y) <= WCS_BBOX_TOLERANCE &&
    Math.abs(wcs.max.z - union.max.z) <= WCS_BBOX_TOLERANCE

  if (!cornersMatch) {
    throw new Error(
      `[AcTrView2d] Group wcsBbox [${wcs.min.x}, ${wcs.min.y}]–[${wcs.max.x}, ${wcs.max.y}] ` +
        `does not match wcsChildBoxes union [${union.min.x}, ${union.min.y}]–[${union.max.x}, ${union.max.y}]. ` +
        'Ensure AcDbRenderingCache.draw applied the INSERT transform before handleGroup.'
    )
  }
}

/** @internal Narrow helper for handleGroup dev checks. */
export function assertAcTrGroupWcsBboxesConsistent(group: AcTrGroup): void {
  assertGroupWcsBboxesConsistent(group)
}
