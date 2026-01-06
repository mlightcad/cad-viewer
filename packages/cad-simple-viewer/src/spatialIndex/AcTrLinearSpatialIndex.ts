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
  private items: AcEdSpatialQueryResultItem[] = []

  insert(item: AcEdSpatialQueryResultItem): void {
    this.items.push(item)
  }

  load(items: readonly AcEdSpatialQueryResultItem[]): void {
    this.items.push(...items)
  }

  remove(item: AcEdSpatialQueryResultItem): void {
    this.items = this.items.filter(i => i.id !== item.id)
  }

  removeById(id: AcDbObjectId) {
    this.items = this.items.filter(i => i.id !== id)
  }

  clear(): void {
    this.items.length = 0
  }

  search(bbox: AcTrSpatialIndexBBox): AcEdSpatialQueryResultItem[] {
    return this.items.filter(i => intersects(i, bbox))
  }

  collides(bbox: AcTrSpatialIndexBBox): boolean {
    return this.items.some(i => intersects(i, bbox))
  }

  all(): AcEdSpatialQueryResultItem[] {
    return [...this.items]
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
