import { AcDbObjectId } from '@mlightcad/data-model'
import { AcTrGroup } from '@mlightcad/three-renderer'

import {
  AcEdSpatialQueryResultItem,
  AcEdSpatialQueryResultItemEx
} from '../editor/view'
import { AcTrLinearSpatialIndex } from './AcTrLinearSpatialIndex'
import { AcTrRBushSpatialIndex } from './AcTrRBushSpatialIndex'
import { AcTrSpatialIndex, AcTrSpatialIndexBBox } from './AcTrSpatialIndex'

/**
 * A two-level (hierarchical) spatial index designed for complex CAD
 * scene structures such as blocks, groups, layers, or nested entities.
 *
 * The index consists of:
 *
 * 1. A first-level spatial index that stores coarse bounding boxes
 *    (AcEdSpatialQueryResultItem) and maps each result to an `id`.
 *
 * 2. A second-level map from `id` to another spatial index, which
 *    contains more detailed spatial data for that specific entity,
 *    block, or group.
 *
 * Spatial queries are executed in two phases:
 * - First, the query is performed against the root spatial index to
 *   find candidate items.
 * - Then, for each candidate, the corresponding second-level spatial
 *   index (if present) is queried for more precise results.
 * - Results from both levels are merged into a single query result.
 *
 * This design allows:
 * - Mixing different spatial index implementations (e.g. R-tree and
 *   linear scan) at different hierarchy levels
 * - Efficient querying of large, nested CAD datasets
 * - Lazy or selective construction of fine-grained spatial indexes
 *
 * This class is particularly suitable for CAD viewers and editors
 * where entities are grouped hierarchically but still require fast
 * spatial queries such as selection, picking, and hit-testing.
 */
export class AcTrHierarchicalSpatialIndex implements AcTrSpatialIndex {
  static THRESHOLD = 100
  private readonly rootIndex: AcTrSpatialIndex<AcEdSpatialQueryResultItem>
  private readonly childIndexes = new Map<string, AcTrSpatialIndex>()

  constructor(rootIndex?: AcTrSpatialIndex<AcEdSpatialQueryResultItem>) {
    this.rootIndex = rootIndex ?? new AcTrRBushSpatialIndex()
  }

  /** Register second-level index for an id */
  setChildIndex(id: string, index: AcTrSpatialIndex): void {
    this.childIndexes.set(id, index)
  }

  /** Remove second-level index */
  removeChildIndex(id: string): void {
    this.childIndexes.delete(id)
  }

  insert(item: AcEdSpatialQueryResultItem): void {
    this.rootIndex.insert(item)
    this.childIndexes.get(item.id)?.insert(item)
  }

  load(items: readonly AcEdSpatialQueryResultItem[]): void {
    this.rootIndex.load(items)
  }

  remove(
    item: AcEdSpatialQueryResultItem,
    equals?: (
      a: AcEdSpatialQueryResultItem,
      b: AcEdSpatialQueryResultItem
    ) => boolean
  ): void {
    this.rootIndex.remove(item, equals)
    this.childIndexes.delete(item.id)
  }

  removeById(id: AcDbObjectId): void {
    this.rootIndex.removeById(id)
    this.childIndexes.delete(id)
  }

  clear(): void {
    this.rootIndex.clear()
    this.childIndexes.forEach(i => i.clear())
  }

  search(bbox: AcTrSpatialIndexBBox): AcEdSpatialQueryResultItemEx[] {
    const level1 = this.rootIndex.search(bbox)
    const result: AcEdSpatialQueryResultItemEx[] = []

    for (const hit of level1) {
      const child = this.childIndexes.get(hit.id)
      if (!child) {
        result.push(hit as AcEdSpatialQueryResultItem)
        continue
      }

      const level2 = child.search(bbox)
      result.push({
        ...hit,
        children: level2
      })
    }

    return result
  }

  collides(bbox: AcTrSpatialIndexBBox): boolean {
    if (!this.rootIndex.collides(bbox)) return false

    const level1 = this.rootIndex.search(bbox)
    return level1.some(hit => {
      const child = this.childIndexes.get(hit.id)
      return child ? child.collides(bbox) : true
    })
  }

  all(): AcEdSpatialQueryResultItem[] {
    const result: AcEdSpatialQueryResultItem[] = []

    for (const hit of this.rootIndex.all()) {
      const child = this.childIndexes.get(hit.id)
      if (child) result.push(...child.all())
      else result.push(hit as AcEdSpatialQueryResultItem)
    }

    return result
  }

  createChildIndex(group: AcTrGroup) {
    const size = group.boxes.length
    let spatialIndex: AcTrSpatialIndex | undefined = undefined
    if (size > AcTrHierarchicalSpatialIndex.THRESHOLD) {
      spatialIndex = new AcTrRBushSpatialIndex()
    } else if (size > 0) {
      spatialIndex = new AcTrLinearSpatialIndex()
    }

    if (spatialIndex) {
      group.boxes.forEach(box => {
        spatialIndex.insert(box)
      })
      this.setChildIndex(group.objectId, spatialIndex)
    }
    return spatialIndex
  }
}
