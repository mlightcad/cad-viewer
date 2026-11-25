import {
  AcDbObjectId,
  AcGePoint2dLike,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import type {
  AcEdBaseView,
  AcEdViewportCoordinateMapper
} from '../../editor/view/AcEdBaseView.js'

/**
 * Maps a model-space point into the active layout WCS when a paper-space
 * viewport mapper is available; otherwise returns the XY of the input.
 */
export function acapStretchPointToLayout(
  point: AcGePoint3dLike,
  mapper?: AcEdViewportCoordinateMapper
): AcGePoint2dLike {
  if (!mapper) return { x: point.x, y: point.y }
  const paper = mapper.modelToPaper(point)
  return { x: paper.x, y: paper.y }
}

/**
 * Converts a layout-space displacement into the entity's own WCS.
 *
 * Grip edit maps the tip and base through {@link AcEdViewportCoordinateMapper.paperToModel}
 * so scaled/rotated viewports produce the correct model delta. Model-space
 * layouts (no `viewportId`) pass the layout delta through unchanged.
 */
export function acapStretchLayoutDeltaToEntitySpace(
  view: AcEdBaseView,
  viewportId: AcDbObjectId | undefined,
  layoutBase: AcGePoint3dLike,
  layoutDelta: AcGePoint3dLike
): AcGePoint3dLike {
  if (!viewportId) {
    return {
      x: layoutDelta.x,
      y: layoutDelta.y,
      z: layoutDelta.z ?? 0
    }
  }

  const mapper = view.getViewportCoordinateMapper(viewportId)
  if (!mapper) {
    return {
      x: layoutDelta.x,
      y: layoutDelta.y,
      z: layoutDelta.z ?? 0
    }
  }

  const base = mapper.paperToModel({ x: layoutBase.x, y: layoutBase.y })
  const tip = mapper.paperToModel({
    x: layoutBase.x + layoutDelta.x,
    y: layoutBase.y + layoutDelta.y
  })
  return {
    x: tip.x - base.x,
    y: tip.y - base.y,
    z: layoutDelta.z ?? 0
  }
}
