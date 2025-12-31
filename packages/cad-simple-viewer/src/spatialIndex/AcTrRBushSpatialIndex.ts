import { AcDbObjectId } from '@mlightcad/data-model'
import RBush from 'rbush'

import { AcEdSpatialQueryResultItem } from '../editor/view'
import { AcTrSpatialIndex, AcTrSpatialIndexBBox } from './AcTrSpatialIndex'

export class AcTrRBushSpatialIndex implements AcTrSpatialIndex {
  private readonly tree: RBush<AcEdSpatialQueryResultItem>

  constructor(maxEntries?: number) {
    this.tree = new RBush<AcEdSpatialQueryResultItem>(maxEntries)
  }

  insert(item: AcEdSpatialQueryResultItem) {
    this.tree.insert(item)
  }

  load(items: readonly AcEdSpatialQueryResultItem[]) {
    this.tree.load(items)
  }

  remove(
    item: AcEdSpatialQueryResultItem,
    equals?: (
      a: AcEdSpatialQueryResultItem,
      b: AcEdSpatialQueryResultItem
    ) => boolean
  ): void {
    this.tree.remove(item, equals)
  }

  removeById(id: AcDbObjectId): void {
    // Set minX, minY, maxX, and maxY to 0 in order to pass build
    this.tree.remove(
      {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        id: id
      },
      (a, b) => a.id === b.id
    )
  }

  clear() {
    this.tree.clear()
  }

  search(bbox: AcTrSpatialIndexBBox): AcEdSpatialQueryResultItem[] {
    return this.tree.search(bbox)
  }

  collides(bbox: AcTrSpatialIndexBBox): boolean {
    return this.tree.collides(bbox)
  }

  all(): AcEdSpatialQueryResultItem[] {
    return this.tree.all()
  }
}
