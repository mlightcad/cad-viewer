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
import { isEffectiveSpatialQueryHit } from '../src/editor/view/AcEdSpatialQueryResult'

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

  test('passes through the registered root bbox and attaches child hits', () => {
    const spatialIndex = new AcTrHierarchicalSpatialIndex()
    const insertId = 'INSERT-7B33'

    spatialIndex.insert({
      minX: 394,
      minY: 0,
      maxX: 574,
      maxY: 56,
      id: insertId
    })
    spatialIndex.ensureChildIndex(insertId, [
      { minX: 394, minY: 0, maxX: 574, maxY: 56, id: 'line-1' }
    ])

    const hits = spatialIndex.search({
      minX: -10,
      minY: -72,
      maxX: 584,
      maxY: 410
    })

    expect(hits).toHaveLength(1)
    expect(hits[0].minX).toBeCloseTo(394)
    expect(hits[0].maxX).toBeCloseTo(574)
    expect(hits[0].children?.[0].id).toBe('line-1')
  })

  test('syncs root bbox when ensureChildIndex loads after stale insert', () => {
    const spatialIndex = new AcTrHierarchicalSpatialIndex()
    const insertId = 'INSERT-stale'

    spatialIndex.insert({
      minX: -180,
      minY: 0,
      maxX: 574,
      maxY: 56,
      id: insertId
    })
    spatialIndex.ensureChildIndex(insertId, [
      { minX: 394, minY: 0, maxX: 574, maxY: 56, id: 'line-1' }
    ])

    const hits = spatialIndex.search({
      minX: 0,
      minY: 0,
      maxX: 50,
      maxY: 50
    })

    expect(hits).toHaveLength(0)
  })

  test('surfaces stale root via empty children when insert overwrites synced root', () => {
    const spatialIndex = new AcTrHierarchicalSpatialIndex()
    const insertId = 'INSERT-stale-after'

    spatialIndex.ensureChildIndex(insertId, [
      { minX: 394, minY: 0, maxX: 574, maxY: 56, id: 'line-1' }
    ])
    spatialIndex.insert({
      minX: -180,
      minY: 0,
      maxX: 574,
      maxY: 56,
      id: insertId
    })

    const hits = spatialIndex.search({
      minX: 0,
      minY: 0,
      maxX: 50,
      maxY: 50
    })

    expect(hits).toHaveLength(1)
    expect(hits[0].minX).toBeCloseTo(-180)
    expect(hits[0].maxX).toBeCloseTo(574)
    expect(hits[0].children).toEqual([])
    expect(isEffectiveSpatialQueryHit(hits[0])).toBe(false)
  })

  test('isEffectiveSpatialQueryHit rejects empty child intersections', () => {
    expect(
      isEffectiveSpatialQueryHit({
        minX: 0,
        minY: 0,
        maxX: 10,
        maxY: 10,
        id: 'INSERT-1',
        children: []
      })
    ).toBe(false)
    expect(
      isEffectiveSpatialQueryHit({
        minX: 0,
        minY: 0,
        maxX: 10,
        maxY: 10,
        id: 'LINE-1'
      })
    ).toBe(true)
  })

  test('syncs root bbox when ensureChildIndex reloads child items', () => {
    const spatialIndex = new AcTrHierarchicalSpatialIndex()
    const insertId = 'INSERT-reload-root'

    spatialIndex.insert({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 10,
      id: insertId
    })
    spatialIndex.ensureChildIndex(insertId, [
      { minX: 0, minY: 0, maxX: 50, maxY: 10, id: 'old-line' }
    ])
    spatialIndex.ensureChildIndex(insertId, [
      { minX: 50, minY: 0, maxX: 100, maxY: 10, id: 'new-line' }
    ])

    const hits = spatialIndex.search({
      minX: 60,
      minY: 0,
      maxX: 90,
      maxY: 10
    })

    expect(hits).toHaveLength(1)
    expect(hits[0].children?.map(item => item.id)).toEqual(['new-line'])

    const miss = spatialIndex.search({
      minX: 0,
      minY: 0,
      maxX: 40,
      maxY: 10
    })
    expect(miss).toHaveLength(0)
  })

  test('reloads child items when ensureChildIndex is called again for the same id', () => {
    const spatialIndex = new AcTrHierarchicalSpatialIndex()
    const insertId = 'INSERT-reload'

    spatialIndex.insert({
      minX: 0,
      minY: 0,
      maxX: 100,
      maxY: 10,
      id: insertId
    })
    spatialIndex.ensureChildIndex(insertId, [
      { minX: 0, minY: 0, maxX: 50, maxY: 10, id: 'old-line' }
    ])
    spatialIndex.ensureChildIndex(insertId, [
      { minX: 50, minY: 0, maxX: 100, maxY: 10, id: 'new-line' }
    ])

    const hits = spatialIndex.search({
      minX: 60,
      minY: 0,
      maxX: 90,
      maxY: 10
    })

    expect(hits).toHaveLength(1)
    expect(hits[0].children?.map(item => item.id)).toEqual(['new-line'])
  })

  test('window search requires every indexed child to fit inside the pick box', () => {
    const spatialIndex = new AcTrHierarchicalSpatialIndex()
    const insertId = 'INSERT-window'

    spatialIndex.insert({
      minX: 0,
      minY: 0,
      maxX: 300,
      maxY: 10,
      id: insertId
    })
    spatialIndex.ensureChildIndex(insertId, [
      { minX: 0, minY: 0, maxX: 100, maxY: 10, id: 'line-left' },
      { minX: 200, minY: 0, maxX: 300, maxY: 10, id: 'line-right' }
    ])

    const pickBox = { minX: 0, minY: 0, maxX: 100, maxY: 10 }

    const crossing = spatialIndex.search(pickBox, { selectionMode: 'crossing' })
    expect(crossing).toHaveLength(1)
    expect(crossing[0].children?.map(item => item.id)).toEqual(['line-left'])

    const window = spatialIndex.search(pickBox, { selectionMode: 'window' })
    expect(window).toHaveLength(0)

    const windowAllInside = spatialIndex.search(
      { minX: -5, minY: -5, maxX: 305, maxY: 15 },
      { selectionMode: 'window' }
    )
    expect(windowAllInside).toHaveLength(1)
    expect(windowAllInside[0].id).toBe(insertId)
  })
})
