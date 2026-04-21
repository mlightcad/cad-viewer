jest.mock('rbush', () => {
  class RBushMock<
    T extends { minX: number; minY: number; maxX: number; maxY: number }
  > {
    private items: T[] = []

    insert(item: T) {
      this.items.push(item)
    }

    load(items: readonly T[]) {
      this.items.push(...items)
    }

    remove(item: T, equals?: (a: T, b: T) => boolean) {
      if (equals) {
        const index = this.items.findIndex(entry => equals(entry, item))
        if (index >= 0) this.items.splice(index, 1)
        return
      }
      const index = this.items.indexOf(item)
      if (index >= 0) this.items.splice(index, 1)
    }

    clear() {
      this.items = []
    }

    search(bbox: { minX: number; minY: number; maxX: number; maxY: number }) {
      return this.items.filter(
        item =>
          !(
            item.maxX < bbox.minX ||
            item.minX > bbox.maxX ||
            item.maxY < bbox.minY ||
            item.minY > bbox.maxY
          )
      )
    }

    collides(bbox: { minX: number; minY: number; maxX: number; maxY: number }) {
      return this.search(bbox).length > 0
    }

    all() {
      return [...this.items]
    }
  }

  return {
    __esModule: true,
    default: RBushMock
  }
})

import { AcTrHierarchicalSpatialIndex } from '../src/spatialIndex/AcTrHierarchicalSpatialIndex'

describe('AcTrHierarchicalSpatialIndex', () => {
  test('does not pollute child index with root item when objectId is reused', () => {
    const spatialIndex = new AcTrHierarchicalSpatialIndex()
    const insertId = 'INSERT_ID'

    spatialIndex.ensureChildIndex(insertId, [
      {
        minX: 1,
        minY: 1,
        maxX: 2,
        maxY: 2,
        id: 'SUB_ENTITY_ID'
      }
    ])

    spatialIndex.insert({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 10,
      id: insertId
    })

    const hits = spatialIndex.search({
      minX: 0,
      minY: 0,
      maxX: 3,
      maxY: 3
    })

    expect(hits).toHaveLength(1)
    expect(hits[0].id).toBe(insertId)
    expect(hits[0].children?.map((item: { id: string }) => item.id)).toEqual([
      'SUB_ENTITY_ID'
    ])
  })
})
