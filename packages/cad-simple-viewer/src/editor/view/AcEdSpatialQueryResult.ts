import { AcDbObjectId } from '@mlightcad/data-model'

import { isFiniteSpatialBBox } from '../../view/AcTrGroupWcsBboxAssert'

/**
 * Item returned by spatial query
 */
export interface AcEdSpatialQueryResultItem {
  minX: number
  minY: number
  maxX: number
  maxY: number
  id: AcDbObjectId
}

/**
 * Hierarchical spatial-query result.
 *
 * When a child index exists for {@link id}, {@link children} lists the
 * sub-entity boxes that intersect the query region. An empty array means the
 * root entry matched but no child geometry did (for example a stale coarse
 * root bbox, or a query box that falls inside the aggregate bounds but not
 * on any child). Selection and pick paths filter these with
 * {@link isEffectiveSpatialQueryHit}.
 */
export interface AcEdSpatialQueryResultItemEx extends AcEdSpatialQueryResultItem {
  children?: AcEdSpatialQueryResultItem[]
}

/**
 * Unions spatial-query child boxes into one axis-aligned WCS rectangle.
 *
 * Non-finite child boxes (for example deferred MText placeholders seeded with
 * `±Infinity`) are skipped so the union matches
 * {@link AcTrGroup.syncWcsBboxFromChildBoxes}.
 */
export function unionSpatialQueryItems(
  items: ReadonlyArray<AcEdSpatialQueryResultItem>,
  id?: AcDbObjectId
): AcEdSpatialQueryResultItem {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const box of items) {
    if (!isFiniteSpatialBBox(box)) {
      continue
    }
    minX = Math.min(minX, box.minX)
    minY = Math.min(minY, box.minY)
    maxX = Math.max(maxX, box.maxX)
    maxY = Math.max(maxY, box.maxY)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    id: id ?? items[0]?.id ?? ''
  }
}

/**
 * Returns whether a hierarchical spatial-query hit should participate in
 * selection, picking, or other user-facing spatial resolution.
 *
 * {@link AcTrHierarchicalSpatialIndex.search} may return hits whose
 * {@link AcEdSpatialQueryResultItemEx.children} is an empty array when the root
 * bbox intersects the query but no child geometry does. Filter those here rather
 * than hiding them inside the index search.
 */
export function isEffectiveSpatialQueryHit(
  item: AcEdSpatialQueryResultItemEx
): boolean {
  return !(item.children !== undefined && item.children.length === 0)
}

/**
 * Assigns distinct ids to spatial-query items that share a non-empty id before
 * they are stored in Map-backed child indexes
 * ({@link AcTrLinearSpatialIndex}, {@link AcTrRBushSpatialIndex}).
 *
 * Empty ids are left unchanged: those indexes store anonymous children under
 * internal keys so multi-region hatch islands (fill polygons with no
 * `objectId`) stay pickable without fabricating gsMark values for osnap.
 */
export function uniquifySpatialItemIds(
  items: ReadonlyArray<AcEdSpatialQueryResultItem>
): AcEdSpatialQueryResultItem[] {
  const seen = new Map<string, number>()
  return items.map(item => {
    const raw = item.id
    if (typeof raw !== 'string' || raw.length === 0) {
      return item
    }
    const count = seen.get(raw) ?? 0
    seen.set(raw, count + 1)
    if (count === 0) {
      return item
    }
    return { ...item, id: `${raw}#${count}` }
  })
}
