import { AcDbObjectId } from '@mlightcad/data-model'

import { AcEdSpatialQueryResultItem } from '../editor/view'

export type AcTrSpatialIndexBBox = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface AcTrSpatialIndex<
  T extends AcEdSpatialQueryResultItem = AcEdSpatialQueryResultItem
> {
  /**
   * Inserts an item. To insert many items at once, use `load()`.
   *
   * @param item The item to insert.
   */
  insert(item: T): void

  /**
   * Bulk-inserts the given items into the tree.
   *
   * Bulk insertion is usually ~2-3 times faster than inserting items one by
   * one. After bulk loading (bulk insertion into an empty tree), subsequent
   * query performance is also ~20-30% better.
   *
   * Note that when you do bulk insertion into an existing tree, it bulk-loads
   * the given data into a separate tree and inserts the smaller tree into the
   * larger tree. This means that bulk insertion works very well for clustered
   * data (where items in one update are close to each other), but makes query
   * performance worse if the data is scattered.
   *
   * @param items The items to load.
   */
  load(items: readonly T[]): void

  /**
   * Removes a previously inserted item, comparing by reference.
   *
   * To remove all items, use `clear()`.
   *
   * @param item The item to remove.
   * @param equals A custom function that allows comparing by value instead.
   *               Useful when you have only a copy of the object you need
   *               removed (e.g. loaded from server).
   */
  remove(item: T, equals?: (a: T, b: T) => boolean): void

  /**
   * Removes a previously inserted item by its id.
   *
   * To remove all items, use `clear()`.
   *
   * @param id The id of a previously inserted item
   */
  removeById(id: AcDbObjectId): void

  /**
   * Removes all items.
   */
  clear(): void

  /**
   * Returns an array of data items (points or rectangles) that the given
   * bounding box intersects.
   *
   * Note that the search method accepts a bounding box in `{minX, minY, maxX,
   * maxY}` format regardless of the data format.
   *
   * @param box The bounding box in which to search.
   */
  search(box: AcTrSpatialIndexBBox): T[]

  /**
   * Returns all items contained in the tree.
   */
  all(): T[]

  /**
   * Returns `true` if there are any items intersecting the given bounding
   * box, otherwise `false`.
   *
   * @param box The bounding box in which to search.
   */
  collides(box: AcTrSpatialIndexBBox): boolean
}
