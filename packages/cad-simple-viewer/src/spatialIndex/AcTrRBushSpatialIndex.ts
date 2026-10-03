import { AcDbObjectId } from '@mlightcad/data-model'
import RBush from 'rbush'

import {
  AcEdSpatialQueryResultItem,
  spatialItemStorageKey
} from '../editor/view/AcEdSpatialQueryResult'
import { isFiniteSpatialBBox } from '../view/AcTrGroupWcsBboxAssert'
import {
  AcTrSpatialIndex,
  AcTrSpatialIndexBBox,
  AcTrSpatialIndexStats,
  AcTrSpatialSearchOptions,
  estimateSpatialItemsBytes,
  isSpatialBoxFullyInside
} from './AcTrSpatialIndex'

/** Approx. Map entry overhead (key pointer + value pointer + slot). */
const ID_MAP_ENTRY_BYTES = 40
/** Rough R-tree node overhead relative to leaf item payload. */
const RBUSH_TREE_OVERHEAD_FACTOR = 1.4

export class AcTrRBushSpatialIndex implements AcTrSpatialIndex {
  private readonly tree: RBush<AcEdSpatialQueryResultItem>
  private readonly idMap: Map<AcDbObjectId, AcEdSpatialQueryResultItem>

  constructor(maxEntries?: number) {
    this.tree = new RBush<AcEdSpatialQueryResultItem>(maxEntries)
    this.idMap = new Map<AcDbObjectId, AcEdSpatialQueryResultItem>()
  }

  insert(item: AcEdSpatialQueryResultItem) {
    // RBush parent-node bounds use Math.min/max; a single NaN bbox poisons the
    // tree so every later search returns empty (pick / osnap fail globally).
    if (!isFiniteSpatialBBox(item)) {
      return
    }
    const key = spatialItemStorageKey(item)
    // Empty ids (hatch fill islands) must not share one Map slot — otherwise
    // later inserts overwrite earlier islands and only the last stays pickable.
    if (key !== undefined) {
      const existing = this.idMap.get(key)
      if (existing) {
        if (
          existing.minX === item.minX &&
          existing.minY === item.minY &&
          existing.maxX === item.maxX &&
          existing.maxY === item.maxY &&
          existing.occurrence === item.occurrence
        ) {
          return
        }
        this.remove(existing)
      }
    }
    this.tree.insert(item)
    if (key !== undefined) {
      this.idMap.set(key, item)
    }
  }

  load(items: readonly AcEdSpatialQueryResultItem[]) {
    const finiteItems = items.filter(isFiniteSpatialBBox)
    this.tree.load(finiteItems)
    for (const item of finiteItems) {
      const key = spatialItemStorageKey(item)
      if (key !== undefined) {
        this.idMap.set(key, item)
      }
    }
  }

  remove(
    item: AcEdSpatialQueryResultItem,
    equals?: (
      a: AcEdSpatialQueryResultItem,
      b: AcEdSpatialQueryResultItem
    ) => boolean
  ): void {
    this.tree.remove(
      item,
      equals ??
        ((a, b) =>
          a === b ||
          (spatialItemStorageKey(a) === spatialItemStorageKey(b) &&
            a.minX === b.minX &&
            a.minY === b.minY &&
            a.maxX === b.maxX &&
            a.maxY === b.maxY))
    )
    const key = spatialItemStorageKey(item)
    if (key !== undefined) {
      this.idMap.delete(key)
    }
  }

  removeById(id: AcDbObjectId): void {
    if (!(typeof id === 'string' && id.length > 0)) {
      return
    }
    const rootItem = this.idMap.get(id)
    if (rootItem) {
      this.remove(rootItem)
      return
    }
    for (const item of this.idMap.values()) {
      if (item.id === id) this.remove(item)
    }
  }

  /**
   * Returns the item currently indexed for {@link id}, when present.
   */
  getById(id: AcDbObjectId): AcEdSpatialQueryResultItem | undefined {
    if (!(typeof id === 'string' && id.length > 0)) {
      return undefined
    }
    return this.idMap.get(id)
  }

  clear() {
    this.tree.clear()
    this.idMap.clear()
  }

  search(
    bbox: AcTrSpatialIndexBBox,
    options?: AcTrSpatialSearchOptions
  ): AcEdSpatialQueryResultItem[] {
    const hits = this.tree.search(bbox)
    if (options?.selectionMode !== 'window') {
      return hits
    }
    return hits.filter(item => isSpatialBoxFullyInside(item, bbox))
  }

  collides(bbox: AcTrSpatialIndexBBox): boolean {
    return this.tree.collides(bbox)
  }

  all(): AcEdSpatialQueryResultItem[] {
    return this.tree.all()
  }

  getStats(): AcTrSpatialIndexStats {
    const items = this.tree.all()
    const itemCount = items.length
    const itemBytes = estimateSpatialItemsBytes(items)
    const idMapBytes = this.idMap.size * ID_MAP_ENTRY_BYTES
    return {
      kind: 'rbush',
      itemCount,
      estimatedBytes: Math.round(
        itemBytes * RBUSH_TREE_OVERHEAD_FACTOR + idMapBytes
      )
    }
  }
}
