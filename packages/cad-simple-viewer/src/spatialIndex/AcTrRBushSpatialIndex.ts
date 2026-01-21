import { AcDbObjectId } from '@mlightcad/data-model'
import RBush from 'rbush'

import { AcEdSpatialQueryResultItem } from '../editor/view'
import { AcTrSpatialIndex, AcTrSpatialIndexBBox } from './AcTrSpatialIndex'

export class AcTrRBushSpatialIndex implements AcTrSpatialIndex {
  private readonly tree: RBush<AcEdSpatialQueryResultItem>
  private readonly idMap: Map<AcDbObjectId, AcEdSpatialQueryResultItem>

  constructor(maxEntries?: number) {
    this.tree = new RBush<AcEdSpatialQueryResultItem>(maxEntries)
    this.idMap = new Map<AcDbObjectId, AcEdSpatialQueryResultItem>()
  }

  insert(item: AcEdSpatialQueryResultItem) {
    if (!this.idMap.has(item.id)) {
      this.tree.insert(item)
      this.idMap.set(item.id, item)
    }
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
    this.idMap.delete(item.id)
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
    this.idMap.delete(id)
  }

  clear() {
    this.tree.clear()
    this.idMap.clear()
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
