import { AcDbObjectId } from '@mlightcad/data-model'

/** Model-space view frustum of one paper-space viewport, for grip mapping. */
export interface AcEdGripViewportCandidate {
  viewportId: AcDbObjectId
  viewBox: {
    min: { x: number; y: number }
    max: { x: number; y: number }
  }
}

function acedBoxesOverlapXy(
  a: { min: { x: number; y: number }; max: { x: number; y: number } },
  b: { min: { x: number; y: number }; max: { x: number; y: number } }
): boolean {
  return (
    a.min.x <= b.max.x &&
    a.max.x >= b.min.x &&
    a.min.y <= b.max.y &&
    a.max.y >= b.min.y
  )
}

/**
 * Picks which paper-space viewport should own grip display/edit mapping for
 * a model-space entity.
 *
 * Preference order:
 * 1. `preferredViewportId` when it is still among the candidates (click pick)
 * 2. First candidate whose `viewBox` overlaps the entity extents
 * 3. First candidate (single-viewport layouts / extents missing)
 */
export function acedPickViewportForModelExtents(
  extents:
    | { min: { x: number; y: number }; max: { x: number; y: number } }
    | null
    | undefined,
  candidates: readonly AcEdGripViewportCandidate[],
  preferredViewportId?: AcDbObjectId
): AcDbObjectId | undefined {
  if (candidates.length === 0) return undefined

  if (preferredViewportId != null) {
    for (const candidate of candidates) {
      if (candidate.viewportId === preferredViewportId) {
        return preferredViewportId
      }
    }
  }

  if (extents) {
    for (const candidate of candidates) {
      if (acedBoxesOverlapXy(extents, candidate.viewBox)) {
        return candidate.viewportId
      }
    }
  }

  return candidates[0]?.viewportId
}
