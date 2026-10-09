import { AcDbObjectId } from '@mlightcad/data-model'
import { AcTrGroup } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import {
  AcEdSpatialQueryResultItem,
  AcEdSpatialQueryResultItemEx,
  unionSpatialQueryItems,
  uniquifySpatialItemIds
} from '../editor/view/AcEdSpatialQueryResult'
import { isFiniteSpatialBBox } from '../view/AcTrGroupWcsBboxAssert'
import { AcTrLinearSpatialIndex } from './AcTrLinearSpatialIndex'
import { AcTrRBushSpatialIndex } from './AcTrRBushSpatialIndex'
import {
  AcTrSpatialIndex,
  AcTrSpatialIndexBBox,
  AcTrSpatialIndexStats,
  AcTrSpatialSearchOptions,
  isSpatialBoxFullyInside
} from './AcTrSpatialIndex'

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
/**
 * Block-local child boxes plus the INSERT matrix that maps them into WCS.
 *
 * Stored once per block reference until a spatial query needs the expanded
 * child index. The box array is shared across instances of one template.
 */
export interface AcTrLazySpatialChildren {
  boxes: readonly AcEdSpatialQueryResultItem[]
  matrix: THREE.Matrix4
}

export class AcTrHierarchicalSpatialIndex implements AcTrSpatialIndex {
  static THRESHOLD = 100
  private readonly rootIndex: AcTrSpatialIndex<AcEdSpatialQueryResultItem>
  private readonly childIndexes = new Map<string, AcTrSpatialIndex>()
  private readonly lazyChildren = new Map<string, AcTrLazySpatialChildren>()

  /**
   * Creates a hierarchical spatial index instance.
   *
   * The provided root index stores first-level, coarse-grained items. When no
   * index is provided, an R-tree based implementation is used by default to
   * balance insertion and query performance on typical CAD datasets.
   *
   * @param rootIndex Optional first-level spatial index implementation.
   */
  constructor(rootIndex?: AcTrSpatialIndex<AcEdSpatialQueryResultItem>) {
    this.rootIndex = rootIndex ?? new AcTrRBushSpatialIndex()
  }

  /**
   * Registers or replaces a second-level spatial index for a root item id.
   *
   * This only updates the child index map; it does not insert or update the
   * corresponding first-level item in the root index.
   *
   * @param id Root item id that owns the child index.
   * @param index Child index containing fine-grained geometry/items for `id`.
   */
  setChildIndex(id: string, index: AcTrSpatialIndex): void {
    this.childIndexes.set(id, index)
  }

  /**
   * Removes a registered second-level index by root item id.
   *
   * If no child index is registered for the id, this method is a no-op.
   *
   * @param id Root item id whose child index should be removed.
   */
  removeChildIndex(id: string): void {
    this.childIndexes.delete(id)
  }

  /**
   * Inserts one first-level item into the root spatial index.
   *
   * This method does not create or update any child index automatically.
   *
   * @param item The coarse-grained item to insert.
   */
  insert(item: AcEdSpatialQueryResultItem): void {
    this.rootIndex.insert(item)
  }

  /**
   * Bulk-loads first-level items into the root spatial index.
   *
   * Existing child indexes are not modified by this operation.
   *
   * @param items First-level items to be loaded.
   */
  load(items: readonly AcEdSpatialQueryResultItem[]): void {
    this.rootIndex.load(items)
  }

  /**
   * Removes one first-level item from the root index and clears its child index.
   *
   * The child index bound to `item.id` is always deleted to avoid stale
   * second-level data even when custom equality logic is used.
   *
   * @param item The root item to remove.
   * @param equals Optional custom equality function used by the root index.
   */
  remove(
    item: AcEdSpatialQueryResultItem,
    equals?: (
      a: AcEdSpatialQueryResultItem,
      b: AcEdSpatialQueryResultItem
    ) => boolean
  ): void {
    this.rootIndex.remove(item, equals)
    this.childIndexes.delete(item.id)
    this.lazyChildren.delete(item.id)
  }

  /**
   * Removes one first-level item by id and clears its child index.
   *
   * @param id Id of the root item to remove.
   */
  removeById(id: AcDbObjectId): void {
    this.rootIndex.removeById(id)
    this.childIndexes.delete(id)
    this.lazyChildren.delete(id)
  }

  /**
   * Clears all indexed data from both hierarchy levels.
   *
   * This method clears the root index, then clears each child index instance,
   * and finally removes all child index references from the map.
   */
  clear(): void {
    this.rootIndex.clear()
    this.childIndexes.forEach(i => i.clear())
    this.childIndexes.clear()
    this.lazyChildren.clear()
  }

  /**
   * Performs a hierarchical search against the given bounding box.
   *
   * Query flow:
   * 1. Search the root index for candidate hits.
   * 2. For each hit:
   *    - if no child index exists, return the root-level hit directly;
   *    - if a child index exists, search the child and attach intersecting
   *      results under `children`;
   *    - when a child index exists but no child box intersects the query,
   *      `children` is an empty array; callers that resolve selection or pick
   *      should filter with {@link isEffectiveSpatialQueryHit}.
   *
   * @param bbox Query bounding box.
   * @param options Optional query semantics. With `selectionMode: 'window'`,
   *   block references that have a child index must have every indexed child
   *   fully inside {@link bbox}; other hits must have their root box fully
   *   inside {@link bbox}.
   * @returns Aggregated search results from both levels.
   */
  search(
    bbox: AcTrSpatialIndexBBox,
    options?: AcTrSpatialSearchOptions
  ): AcEdSpatialQueryResultItemEx[] {
    const level1 = this.rootIndex.search(bbox)
    const result: AcEdSpatialQueryResultItemEx[] = []

    for (const hit of level1) {
      this.materializeLazyChildren(hit.id)
      const child = this.childIndexes.get(hit.id)
      if (!child) {
        if (
          options?.selectionMode !== 'window' ||
          isSpatialBoxFullyInside(hit, bbox)
        ) {
          result.push(hit as AcEdSpatialQueryResultItem)
        }
        continue
      }

      const level2 = child.search(bbox)
      const hitEx: AcEdSpatialQueryResultItemEx = {
        ...hit,
        children: level2
      }
      if (
        options?.selectionMode !== 'window' ||
        this.isWindowSelectionHit(hitEx, bbox)
      ) {
        result.push(hitEx)
      }
    }

    return result
  }

  /**
   * Window-selection containment for one hierarchical hit.
   *
   * INSERT entities with a child index are contained only when every finite
   * indexed child lies inside the pick box, not when a coarse root bbox fits.
   */
  private isWindowSelectionHit(
    hit: AcEdSpatialQueryResultItemEx,
    bbox: AcTrSpatialIndexBBox
  ): boolean {
    const child = this.childIndexes.get(hit.id)
    if (!child) {
      return isSpatialBoxFullyInside(hit, bbox)
    }

    const allChildren = child.all().filter(isFiniteSpatialBBox)
    if (allChildren.length === 0) {
      return false
    }

    return allChildren.every(item => isSpatialBoxFullyInside(item, bbox))
  }

  /**
   * Tests whether any indexed item collides with the given bounding box.
   *
   * A fast root-level rejection is performed first. If root-level candidates
   * exist, each candidate is checked as follows:
   * - deferred INSERT children are expanded first, same as {@link search};
   * - without child index: treated as colliding immediately;
   * - with child index: delegated to child-level `collides`.
   *
   * @param bbox Query bounding box.
   * @returns `true` if at least one collision is found; otherwise `false`.
   */
  collides(bbox: AcTrSpatialIndexBBox): boolean {
    if (!this.rootIndex.collides(bbox)) return false

    const level1 = this.rootIndex.search(bbox)
    return level1.some(hit => {
      this.materializeLazyChildren(hit.id)
      const child = this.childIndexes.get(hit.id)
      return child ? child.collides(bbox) : true
    })
  }

  /**
   * Returns all indexed items in a flattened form.
   *
   * For each root-level hit:
   * - if a child index exists, all child items are appended;
   * - otherwise the root-level item itself is appended.
   *
   * @returns Flattened list of all available items across both levels.
   */
  all(): AcEdSpatialQueryResultItem[] {
    const result: AcEdSpatialQueryResultItem[] = []

    for (const hit of this.rootIndex.all()) {
      const child = this.childIndexes.get(hit.id)
      if (child) result.push(...child.all())
      else result.push(hit as AcEdSpatialQueryResultItem)
    }

    return result
  }

  /**
   * Async variant of {@link all} that yields while flattening large child
   * indexes so smart-extents collection does not freeze the UI thread.
   *
   * Produces the same ordered list as {@link all} for the same index contents.
   *
   * @param work - Cooperative yield helper (optional).
   */
  async allAsync(work?: {
    maybeYield(): Promise<void>
  }): Promise<AcEdSpatialQueryResultItem[]> {
    const result: AcEdSpatialQueryResultItem[] = []
    let sinceYield = 0
    const roots = this.rootIndex.all()

    for (let r = 0; r < roots.length; r++) {
      const hit = roots[r]!
      const child = this.childIndexes.get(hit.id)
      if (child) {
        const children = child.all()
        for (let i = 0; i < children.length; i++) {
          result.push(children[i] as AcEdSpatialQueryResultItem)
          sinceYield++
          if (work && (sinceYield & 0x7ff) === 0x7ff) {
            await work.maybeYield()
          }
        }
      } else {
        result.push(hit as AcEdSpatialQueryResultItem)
        sinceYield++
        if (work && (sinceYield & 0x7ff) === 0x7ff) {
          await work.maybeYield()
        }
      }
    }

    return result
  }

  /**
   * Checks whether a second-level index exists for the specified id.
   *
   * @param id Root item id.
   * @returns `true` if a child index is registered for `id`.
   */
  hasChildIndex(id: AcDbObjectId) {
    return this.childIndexes.has(id) || this.lazyChildren.has(id)
  }

  /**
   * Remembers block-local child boxes for one INSERT without copying them.
   *
   * {@link search} expands the boxes into a child index the first time a query
   * hits this id. Extents queries that only read {@link all} stay on the root
   * box.
   *
   * @param id - INSERT object id.
   * @param source - Shared template boxes and this instance's matrix.
   */
  setLazyChildSource(id: AcDbObjectId, source: AcTrLazySpatialChildren) {
    this.lazyChildren.set(id, source)
  }

  /**
   * Returns the first-level (root) item for {@link id}, when present.
   *
   * Does not clear or inspect child indexes.
   */
  getRootById(id: AcDbObjectId): AcEdSpatialQueryResultItem | undefined {
    const root = this.rootIndex as AcTrSpatialIndex & {
      getById?: (id: AcDbObjectId) => AcEdSpatialQueryResultItem | undefined
    }
    return root.getById?.(id)
  }

  /**
   * Aggregates memory / cardinality stats from the root index and all children.
   */
  getStats(): AcTrSpatialIndexStats {
    const rootStats = this.rootIndex.getStats()
    let childItemCount = 0
    let childBytes = 0
    let rbushChildCount = 0
    let linearChildCount = 0

    for (const child of this.childIndexes.values()) {
      const childStats = child.getStats()
      childItemCount += childStats.itemCount
      childBytes += childStats.estimatedBytes
      if (childStats.kind === 'rbush') rbushChildCount++
      else if (childStats.kind === 'linear') linearChildCount++
    }

    // Child-index Map overhead (string id keys + pointers).
    const childMapBytes = this.childIndexes.size * 64

    return {
      kind: 'hierarchical',
      itemCount: rootStats.itemCount,
      estimatedBytes: rootStats.estimatedBytes + childBytes + childMapBytes,
      rootItemCount: rootStats.itemCount,
      childIndexCount: this.childIndexes.size,
      childItemCount,
      rbushChildCount,
      linearChildCount
    }
  }

  /**
   * Ensures a second-level index exists for a root id and optionally initializes it.
   *
   * Behavior:
   * - upserts the root index bbox to the union of `items`;
   * - if a child index already exists, its items are replaced with `items`;
   * - otherwise an index type is selected by `items.length`;
   * - selected index is populated with `items`, stored, and returned.
   *
   * No index is created for empty input (`items.length === 0`), and `undefined`
   * is returned in that case.
   *
   * @param id Root object id that owns the child index.
   * @param items Child items used to initialize a newly created index.
   * @returns Existing or newly created child index, or `undefined` for empty input.
   */
  ensureChildIndex(
    id: AcDbObjectId,
    items: readonly AcEdSpatialQueryResultItem[]
  ) {
    // Copy each item: callers may pass live `wcsChildBoxes` that later mutate
    // via Object.assign. RBush parent bounds would go stale if we stored those
    // references; the previous insert({ ...item }) path copied for the same reason.
    const finiteItems = uniquifySpatialItemIds(
      items.filter(isFiniteSpatialBBox)
    ).map(item => ({ ...item }))
    if (finiteItems.length === 0) {
      return undefined
    }

    const rootBox = unionSpatialQueryItems(finiteItems, id)
    if (isFiniteSpatialBBox(rootBox)) {
      this.insert(rootBox)
    }

    const existing = this.childIndexes.get(id)
    if (existing) {
      existing.clear()
      existing.load(finiteItems)
      return existing
    }

    const spatialIndex = this.createIndexBySize(finiteItems.length)
    if (!spatialIndex) return undefined

    spatialIndex.load(finiteItems)
    this.setChildIndex(id, spatialIndex)
    return spatialIndex
  }

  /**
   * Creates or retrieves the child index for a group object.
   *
   * This is a convenience wrapper around `ensureChildIndex`, using the group's
   * `objectId` and {@link AcTrGroup.wcsChildBoxes} as id and initialization data.
   *
   * @param group Group providing id and child box items.
   * @returns Existing or newly created child index, or `undefined` when empty.
   */
  createChildIndex(group: AcTrGroup) {
    return this.ensureChildIndex(group.objectId, group.wcsChildBoxes)
  }

  /**
   * Expands a deferred INSERT into a child index.
   *
   * No-op when the id was already expanded or has no lazy source. Does not
   * insert another root box; the caller registered the aggregate bbox.
   *
   * @param id - INSERT object id whose query hit needs child boxes.
   */
  private materializeLazyChildren(id: string) {
    if (this.childIndexes.has(id)) return
    const source = this.lazyChildren.get(id)
    if (!source) return
    this.lazyChildren.delete(id)
    const items: AcEdSpatialQueryResultItem[] = []
    for (let i = 0; i < source.boxes.length; i++) {
      const box = source.boxes[i]
      if (!box || !isFiniteSpatialBBox(box)) continue
      items.push(transformSpatialBox(box, source.matrix))
    }
    const finiteItems = uniquifySpatialItemIds(items)
    if (finiteItems.length === 0) return
    const spatialIndex = this.createIndexBySize(finiteItems.length)
    if (!spatialIndex) return
    spatialIndex.load(finiteItems)
    this.setChildIndex(id, spatialIndex)
  }

  private createIndexBySize(size: number) {
    if (size > AcTrHierarchicalSpatialIndex.THRESHOLD) {
      return new AcTrRBushSpatialIndex()
    }
    if (size > 0) {
      return new AcTrLinearSpatialIndex()
    }
    return undefined
  }
}

/**
 * Maps one block-local AABB through an INSERT matrix into a WCS AABB.
 *
 * @param box - Axis-aligned box in block space.
 * @param matrix - INSERT transform.
 * @returns The transformed axis-aligned box, with the same id.
 */
function transformSpatialBox(
  box: AcEdSpatialQueryResultItem,
  matrix: THREE.Matrix4
): AcEdSpatialQueryResultItem {
  const e = matrix.elements
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const xs = [box.minX, box.maxX]
  const ys = [box.minY, box.maxY]
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const x = xs[i]
      const y = ys[j]
      const wx = e[0] * x + e[4] * y + e[12]
      const wy = e[1] * x + e[5] * y + e[13]
      minX = Math.min(minX, wx)
      minY = Math.min(minY, wy)
      maxX = Math.max(maxX, wx)
      maxY = Math.max(maxY, wy)
    }
  }
  return { minX, minY, maxX, maxY, id: box.id }
}
