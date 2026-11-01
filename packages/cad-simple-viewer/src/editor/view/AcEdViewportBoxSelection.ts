import {
  AcDbEntity,
  AcDbObjectId,
  AcGeBox2d,
  AcGePoint2dLike
} from '@mlightcad/data-model'

import { isFiniteSpatialBBox } from '../../view/AcTrGroupWcsBboxAssert'
import type { AcEdSelectionMode } from './AcEdBaseView'
import {
  acedEntityIntersectsSelectionBox,
  acedNeedsCrossingGeometryRefine
} from './AcEdSelectionBoxIntersect'
import {
  AcEdSpatialQueryResultItem,
  AcEdSpatialQueryResultItemEx,
  isEffectiveSpatialQueryHit
} from './AcEdSpatialQueryResult'

/**
 * Paper-space → model-space projection for one paper viewport.
 *
 * Implemented by `AcTrViewportView` adapters so this module stays free of the
 * renderer package.
 */
export interface AcEdViewportBoxProjection {
  /** Viewport border in paper-space WCS (`AcGiViewport.box`). */
  paperBox: AcGeBox2d
  /** Layer names frozen in this viewport (VPLAYER / DXF group 331). */
  frozenLayers?: readonly string[]
  /** Paper-space WCS → model-space WCS through this viewport. */
  paperPointToModel(point: AcGePoint2dLike): AcGePoint2dLike
  /** Model-space WCS → paper-space WCS through this viewport. */
  modelPointToPaper(point: AcGePoint2dLike): AcGePoint2dLike
}

/**
 * Inputs for {@link acedCollectViewportBoxSelectionIds}.
 */
export interface AcEdViewportBoxSelectionArgs {
  /** Pick rectangle in the active (paper-space) layout WCS. */
  selectionBox: AcGeBox2d
  /** AutoCAD-style window / crossing semantics from the drag direction. */
  mode: AcEdSelectionMode
  /** Viewports of the active paper-space layout. */
  viewports: Iterable<AcEdViewportBoxProjection>
  /**
   * Queries the model-space layout for candidate entities.
   *
   * Called with a model-space WCS box that covers the part of the pick
   * rectangle visible through one viewport. The same `selectionMode` must be
   * forwarded to the spatial index: its window mode requires every indexed
   * child of a block reference to be inside the box, and only it knows the
   * full child set. Filtering on the returned `children` alone would treat a
   * partially overlapping INSERT as selected, because `search` lists only the
   * children that intersect the query box.
   *
   * This module still re-checks containment / intersection against the
   * paper-space projection of each hit, so a twisted viewport's rotated pick
   * rectangle is not approximated by its (larger) model-space AABB.
   */
  searchModel: (
    box: AcGeBox2d,
    mode: AcEdSelectionMode
  ) => readonly AcEdSpatialQueryResultItemEx[]
  /** Entity behind one spatial hit id, or `undefined` when unavailable. */
  entityOf: (id: AcDbObjectId) => AcDbEntity | undefined
}

/**
 * Collects model-space entities selected through paper-space viewports.
 *
 * Prefix `aced`: exported from the package entry (`editor/view`), so it carries
 * the editor-layer prefix like the other global helpers, e.g.
 * `acedEntityIntersectsSelectionBox`.
 *
 * A box drawn in a paper-space layout only queries the paper layout's spatial
 * index, which holds paper entities (viewport frames, sheet annotations). The
 * model-space content a viewport renders is therefore invisible to it — the
 * same reason {@link AcTrView2d.pick} needs its own drill-through pass for
 * clicks. This mirrors that drill-through for window / crossing rectangles:
 * the part of the pick rectangle visible through each viewport is mapped into
 * model WCS, queried there, and the hits are mapped back to paper space so
 * both selection modes keep their exact AutoCAD meaning.
 *
 * Hits are deduplicated by object id (overlapping viewports can return the
 * same entity more than once) and entities on layers frozen in a viewport are
 * dropped, because they are not visible through that viewport. Only the region
 * of the pick rectangle that falls inside a viewport border is considered — the
 * rest of the viewport's model content is clipped away on screen.
 *
 * @param args - Pick rectangle, selection mode, viewports, and model query.
 * @returns Model-space entity ids selected through the viewports.
 */
export function acedCollectViewportBoxSelectionIds(
  args: AcEdViewportBoxSelectionArgs
): AcDbObjectId[] {
  const { selectionBox, mode, viewports, searchModel, entityOf } = args
  if (selectionBox.isEmpty()) return []

  const ids: AcDbObjectId[] = []
  const seen = new Set<AcDbObjectId>()

  for (const viewport of viewports) {
    // The pick region this viewport actually shows. Model content outside the
    // viewport border is clipped away and must not be selected.
    const visibleBox = selectionBox.clone().intersect(viewport.paperBox)
    if (visibleBox.isEmpty()) continue

    // Model-space query area: the box of the visible pick region. Mapping all
    // four corners keeps twisted viewports exact (the paper rectangle is
    // rotated into model space; its AABB is a superset of the true region,
    // which is fine for a crossing query narrowed below).
    const modelBox = projectBox(visibleBox, point =>
      viewport.paperPointToModel(point)
    )
    if (modelBox.isEmpty()) continue

    const hits = searchModel(modelBox, mode)
    for (let i = 0; i < hits.length; i++) {
      const item = hits[i]!
      if (!isEffectiveSpatialQueryHit(item)) continue
      if (seen.has(item.id)) continue

      const layerName = entityOf(item.id)?.layer
      if (
        layerName != null &&
        viewport.frozenLayers != null &&
        viewport.frozenLayers.includes(layerName)
      ) {
        continue
      }

      // Block references carry the child boxes that intersect the query; the
      // hierarchical root box is a coarse aggregate and would over-select.
      const childBoxes =
        item.children && item.children.length > 0 ? item.children : [item]
      const boxes: AcEdSpatialQueryResultItem[] = []
      for (let c = 0; c < childBoxes.length; c++) {
        const childBox = childBoxes[c]!
        if (!isFiniteSpatialBBox(childBox)) continue
        boxes.push(childBox)
      }
      if (boxes.length === 0) continue

      // Where the entity lands on the sheet through this viewport. A block is
      // tested child by child: the union of two far-apart children covers the
      // empty space between them, which would false-positive on a pick box
      // that sits in that gap.
      let matched = false
      for (let c = 0; c < boxes.length; c++) {
        const childBox = boxes[c]!
        const paperItemBox = projectBox(
          new AcGeBox2d(
            { x: childBox.minX, y: childBox.minY },
            { x: childBox.maxX, y: childBox.maxY }
          ),
          point => viewport.modelPointToPaper(point)
        )
        if (paperItemBox.isEmpty()) continue

        if (mode === 'window') {
          // Contained in the visible part of the pick region: both fully
          // inside the rectangle and fully visible through the viewport. The
          // spatial query already required every child inside the model box.
          if (!visibleBox.containsBox(paperItemBox)) {
            matched = false
            break
          }
          matched = true
        } else if (visibleBox.intersectsBox(paperItemBox)) {
          matched = true
          break
        }
      }
      if (!matched) continue

      if (mode === 'crossing') {
        // The spatial query already ran on the model box, but a diagonal
        // leader's AABB can still cover an empty corner of the pick box. Test
        // the real curves in paper space: for a twisted viewport the paper
        // rectangle is rotated relative to model WCS, so a model-space test
        // against `modelBox` (the rotated rectangle's AABB) would be a
        // superset and select geometry that is not under the pick box.
        const entity = entityOf(item.id)
        if (
          entity &&
          acedNeedsCrossingGeometryRefine(item) &&
          !acedEntityIntersectsSelectionBox(entity, visibleBox, point =>
            viewport.modelPointToPaper(point)
          )
        ) {
          continue
        }
      }

      seen.add(item.id)
      ids.push(item.id)
    }
  }

  return ids
}

/**
 * Appends `extraIds` to `ids`, skipping duplicates.
 *
 * Prefix `aced`: exported from the package entry (`editor/view`), so it carries
 * the editor-layer prefix like the other global helpers.
 *
 * Box selection in a paper-space layout combines the active layout's own hits
 * with the model-space hits reached through its viewports; overlapping
 * viewports or a shared spatial hit can report the same entity twice.
 *
 * @param ids - Ids collected from the active layout; mutated in place.
 * @param extraIds - Ids to append when not already present.
 * @returns The same `ids` array, for chaining.
 */
export function acedMergeSelectionIds(
  ids: AcDbObjectId[],
  extraIds: readonly AcDbObjectId[]
): AcDbObjectId[] {
  if (extraIds.length === 0) return ids
  const seen = new Set(ids)
  for (let i = 0; i < extraIds.length; i++) {
    const id = extraIds[i]!
    if (seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

/**
 * Maps the four corners of `box` and returns the axis-aligned box of the
 * results. The AABB of an affinely mapped rectangle is exact for axis-aligned
 * mappings and a superset for rotated (twisted) ones.
 */
function projectBox(
  box: AcGeBox2d,
  project: (point: AcGePoint2dLike) => AcGePoint2dLike
): AcGeBox2d {
  return new AcGeBox2d().setFromPoints([
    project({ x: box.min.x, y: box.min.y }),
    project({ x: box.max.x, y: box.min.y }),
    project({ x: box.max.x, y: box.max.y }),
    project({ x: box.min.x, y: box.max.y })
  ])
}
