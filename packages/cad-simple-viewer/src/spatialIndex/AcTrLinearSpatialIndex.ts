import { AcDbObjectId } from '@mlightcad/data-model'

import { AcEdSpatialQueryResultItem } from '../editor/view'
import { AcTrSpatialIndex, AcTrSpatialIndexBBox } from './AcTrSpatialIndex'

/**
 * A simple spatial index implementation that performs linear scanning
 * over all stored bounding boxes.
 *
 * This index does not build any spatial acceleration structure. All
 * spatial queries are executed by iterating through the full item list
 * and testing bounding-box intersection one by one.
 *
 * Typical use cases:
 * - Small datasets where index construction overhead is unnecessary
 * - Highly dynamic data with frequent insert/remove operations
 * - Debugging or validation of spatial query correctness
 * - Fallback implementation when spatial indexing is not available
 *
 * Time complexity:
 * - Insert / Remove: O(1)
 * - Search / Collides: O(n)
 *
 * This implementation is memory-efficient and predictable, but does
 * not scale well for large numbers of items.
 */
export class AcTrLinearSpatialIndex implements AcTrSpatialIndex {
  /** Items indexed by object id */
  private items = new Map<AcDbObjectId, AcEdSpatialQueryResultItem>()

  insert(item: AcEdSpatialQueryResultItem): void {
    this.items.set(item.id, item)
  }

  load(items: readonly AcEdSpatialQueryResultItem[]): void {
    for (const item of items) {
      this.items.set(item.id, item)
    }
  }

  remove(item: AcEdSpatialQueryResultItem): void {
    this.items.delete(item.id)
  }

  removeById(id: AcDbObjectId): void {
    this.items.delete(id)
  }

  clear(): void {
    this.items.clear()
  }

  search(bbox: AcTrSpatialIndexBBox): AcEdSpatialQueryResultItem[] {
    const result: AcEdSpatialQueryResultItem[] = []

    for (const item of this.items.values()) {
      if (intersects(item, bbox)) {
        result.push(item)
      }
    }

    return result
  }

  collides(bbox: AcTrSpatialIndexBBox): boolean {
    for (const item of this.items.values()) {
      if (intersects(item, bbox)) {
        return true
      }
    }
    return false
  }

  all(): AcEdSpatialQueryResultItem[] {
    return Array.from(this.items.values())
  }
}

function intersects(a: AcTrSpatialIndexBBox, b: AcTrSpatialIndexBBox): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  )
}
