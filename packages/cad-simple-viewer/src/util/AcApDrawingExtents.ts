import {
  AcGeBox2d,
  AcGeBox3d,
  AcGePoint2d
} from '@mlightcad/data-model'

import type { AcEdBaseView } from '../editor'

/**
 * Minimal database surface needed to fall back to header extents.
 */
export type AcApDrawingExtentsDatabase = {
  extents: AcGeBox3d
}

/**
 * Projects a 3D extents box to world XY bounds.
 */
export function box3dToBox2d(extents: AcGeBox3d): AcGeBox2d {
  return new AcGeBox2d(
    new AcGePoint2d(extents.min.x, extents.min.y),
    new AcGePoint2d(extents.max.x, extents.max.y)
  )
}

/**
 * Resolves drawable world XY extents for framing and export.
 *
 * Prefers {@link AcEdBaseView.getDrawingExtents} (batch geometry — same source
 * as ZOOM Extents / `zoomToFitDrawing`). Falls back to header `EXTMIN`/`EXTMAX`
 * only when the scene has no drawable geometry yet (e.g. empty drawing or
 * before conversion).
 *
 * Callers that need accurate results after open should wait for scene idle
 * (`waitUntilIdle`) before invoking this helper.
 *
 * @param view - Active view that can report drawable extents.
 * @param database - Optional database used only when the scene box is empty.
 * @returns Resolved XY bounds, or `undefined` when both sources are empty.
 */
export function resolveDrawingExtents(
  view: Pick<AcEdBaseView, 'getDrawingExtents'>,
  database?: AcApDrawingExtentsDatabase
): AcGeBox2d | undefined {
  const fromScene = view.getDrawingExtents()
  if (fromScene && !fromScene.isEmpty()) {
    return fromScene
  }

  const header = database?.extents
  if (header && !header.isEmpty()) {
    return box3dToBox2d(header)
  }

  return undefined
}
