import { AcDbObjectId } from '@mlightcad/data-model'

import { AcEdSpatialQueryResultItem } from '../editor/view'
import {
  AcTrSpatialIndex,
  AcTrSpatialIndexBBox,
  AcTrSpatialIndexStats,
  AcTrSpatialSearchOptions,
  estimateSpatialItemsBytes,
  isSpatialBoxFullyInside
} from './AcTrSpatialIndex'

/** Approx. Map entry overhead (key pointer + value pointer + slot). */
const MAP_ENTRY_BYTES = 40

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
  /**
   * Items keyed by object id, or by an internal anon key when `item.id` is
   * empty so multiple hatch fill islands can coexist.
   */
  private items = new Map<string, AcEdSpatialQueryResultItem>()
  private anonKeySeq = 0

  private storageKey(item: AcEdSpatialQueryResultItem): string {
    if (typeof item.id === 'string' && item.id.length > 0) {
      return item.id
    }
    return `__anon_${this.anonKeySeq++}`
  }

  insert(item: AcEdSpatialQueryResultItem): void {
    if (typeof item.id === 'string' && item.id.length > 0) {
      this.items.set(item.id, item)
      return
    }
    this.items.set(this.storageKey(item), item)
  }

  load(items: readonly AcEdSpatialQueryResultItem[]): void {
    for (const item of items) {
      this.insert(item)
    }
  }

  remove(item: AcEdSpatialQueryResultItem): void {
    if (typeof item.id === 'string' && item.id.length > 0) {
      this.items.delete(item.id)
      return
    }
    for (const [key, value] of this.items) {
      if (
        value === item ||
        (value.id === item.id &&
          value.minX === item.minX &&
          value.minY === item.minY &&
          value.maxX === item.maxX &&
          value.maxY === item.maxY)
      ) {
        this.items.delete(key)
        return
      }
    }
  }

  removeById(id: AcDbObjectId): void {
    if (typeof id === 'string' && id.length > 0) {
      this.items.delete(id)
    }
  }

  clear(): void {
    this.items.clear()
  }

  search(
    bbox: AcTrSpatialIndexBBox,
    options?: AcTrSpatialSearchOptions
  ): AcEdSpatialQueryResultItem[] {
    const result: AcEdSpatialQueryResultItem[] = []

    for (const item of this.items.values()) {
      if (!intersects(item, bbox)) {
        continue
      }
      if (
        options?.selectionMode === 'window' &&
        !isSpatialBoxFullyInside(item, bbox)
      ) {
        continue
      }
      result.push(item)
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

  getStats(): AcTrSpatialIndexStats {
    const items = this.all()
    const itemCount = items.length
    return {
      kind: 'linear',
      itemCount,
      estimatedBytes:
        estimateSpatialItemsBytes(items) + itemCount * MAP_ENTRY_BYTES
    }
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
