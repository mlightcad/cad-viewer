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

import { AcCmColor, AcGeBox2d } from '@mlightcad/data-model'
import type { AcTrEntity } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import {
  assertGroupWcsBboxesConsistent,
  unionGroupWcsChildBoxes
} from '../src/view/AcTrGroupWcsBboxAssert'
import { AcTrLayout } from '../src/view/AcTrLayout'

function createLayerInfo(name: string) {
  return {
    name,
    isFrozen: false,
    isOff: false,
    color: new AcCmColor()
  }
}

function createHandleGroupEntity(
  objectId: string,
  layerName: string,
  wcsBbox: THREE.Box3,
  spatialIndexChildBoxes: Array<{
    minX: number
    minY: number
    maxX: number
    maxY: number
    id: string
  }>
): AcTrEntity {
  const group = new THREE.Group() as unknown as AcTrEntity
  Object.assign(group.userData, {
    objectId,
    ownerId: 'layout-1',
    spatialIndexChildBoxes
  })
  Object.assign(group, {
    objectId,
    ownerId: 'layout-1',
    layerName,
    wcsBbox
  })
  return group
}

describe('AcTrGroupWcsBboxAssert', () => {
  it('passes when wcsBbox equals the union of wcsChildBoxes', () => {
    const group = {
      wcsBbox: new THREE.Box3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 15, 0)
      ),
      wcsChildBoxes: [
        { minX: 0, minY: 0, maxX: 10, maxY: 0, id: 'line-a' },
        { minX: 2, minY: 5, maxX: 8, maxY: 15, id: 'line-b' }
      ]
    }

    expect(() => assertGroupWcsBboxesConsistent(group)).not.toThrow()
    expect(unionGroupWcsChildBoxes(group).min).toMatchObject({ x: 0, y: 0 })
  })

  it('skips non-finite child boxes when unioning wcsChildBoxes', () => {
    const group = {
      wcsBbox: new THREE.Box3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 5, 0)
      ),
      wcsChildBoxes: [
        { minX: 0, minY: 0, maxX: 10, maxY: 5, id: 'line-a' },
        {
          minX: Number.POSITIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxX: Number.NEGATIVE_INFINITY,
          maxY: Number.NEGATIVE_INFINITY,
          id: 'deferred-text'
        }
      ]
    }

    expect(unionGroupWcsChildBoxes(group).min).toMatchObject({ x: 0, y: 0 })
    expect(unionGroupWcsChildBoxes(group).max).toMatchObject({ x: 10, y: 5 })
  })

  it('throws when wcsBbox diverges from wcsChildBoxes', () => {
    const group = {
      wcsBbox: new THREE.Box3(
        new THREE.Vector3(999, 999, 0),
        new THREE.Vector3(10, 5, 0)
      ),
      wcsChildBoxes: [{ minX: 0, minY: 0, maxX: 10, maxY: 5, id: 'line-a' }]
    }

    expect(() => assertGroupWcsBboxesConsistent(group)).toThrow(
      /does not match wcsChildBoxes union/
    )
  })
})

describe('handleGroup WCS spatial index registration', () => {
  it('indexes pre-transformed WCS bounds without applying group.matrix again', () => {
    const insertWcsBbox = new THREE.Box3(
      new THREE.Vector3(100, 200, 0),
      new THREE.Vector3(115, 210, 0)
    )
    const spatialIndexChildBoxes = [
      { minX: 100, minY: 200, maxX: 110, maxY: 200, id: 'line-0' },
      { minX: 105, minY: 205, maxX: 115, maxY: 210, id: 'line-l2' }
    ]

    assertGroupWcsBboxesConsistent({
      wcsBbox: insertWcsBbox,
      wcsChildBoxes: spatialIndexChildBoxes
    })

    const entity = createHandleGroupEntity(
      'INSERT-1',
      'L2',
      insertWcsBbox,
      spatialIndexChildBoxes
    )

    const layout = new AcTrLayout()
    layout.addLayer(createLayerInfo('L2'))
    layout.addEntity(entity)

    const queryBox = new AcGeBox2d()
    queryBox.min.set(109, 204)
    queryBox.max.set(111, 206)

    const hits = layout.search(queryBox)

    expect(hits).toHaveLength(1)
    expect(hits[0].id).toBe('INSERT-1')
    expect(hits[0].children?.map(item => item.id)).toEqual(['line-l2'])
  })

  it('documents that re-applying group.matrix would double-transform WCS bounds', () => {
    const wcsBbox = new THREE.Box3(
      new THREE.Vector3(100, 200, 0),
      new THREE.Vector3(110, 205, 0)
    )
    const insertMatrix = new THREE.Matrix4().makeTranslation(100, 200, 0)

    const wronglyTransformed = wcsBbox.clone()
    wronglyTransformed.applyMatrix4(insertMatrix)

    expect(wronglyTransformed.min.x).toBeCloseTo(200)
    expect(wcsBbox.min.x).toBeCloseTo(100)
  })
})
