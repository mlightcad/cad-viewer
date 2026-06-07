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

import { AcCmColor } from '@mlightcad/data-model'
import type { AcTrEntity } from '@mlightcad/three-renderer'
import * as THREE from 'three'

const mockComputeBoundingBox = jest.fn(
  (
    target: THREE.Box3,
    options?: { excludeObjectIds?: ReadonlySet<string> }
  ) => {
    lastCapturedExclude = options?.excludeObjectIds
    target.min.set(0, 0, 0)
    target.max.set(10, 10, 0)
    return target
  }
)
const mockRemoveEntity = jest.fn()
const mockAddEntity = jest.fn()
let lastCapturedExclude: ReadonlySet<string> | undefined

jest.mock('@mlightcad/three-renderer', () => {
  const THREE = require('three')
  return {
    AcTrBatchedGroup: jest.fn().mockImplementation(() => {
      const group = new THREE.Group()
      group.addEntity = mockAddEntity
      group.removeEntity = mockRemoveEntity
      group.hasEntity = jest.fn()
      group.setEntityVisible = jest.fn().mockReturnValue(true)
      group.getEntityVisible = jest.fn()
      group.clear = jest.fn()
      group.computeBoundingBox = mockComputeBoundingBox
      return group
    }),
    AcTrGroup: class AcTrGroup {}
  }
})

import { AcTrLayout } from '../src/view/AcTrLayout'

function createLayerInfo(name = '0') {
  return {
    name,
    isFrozen: false,
    isOff: false,
    color: new AcCmColor()
  }
}

function createEntity(
  objectId: string,
  layerName = '0'
): AcTrEntity & { box: THREE.Box3 } {
  return {
    objectId,
    layerName,
    ownerId: 'layout-1',
    userData: {},
    box: new THREE.Box3(new THREE.Vector3(1, 1, 0), new THREE.Vector3(2, 2, 0))
  } as AcTrEntity & { box: THREE.Box3 }
}

describe('AcTrLayout bounding box', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRemoveEntity.mockReturnValue(false)
    lastCapturedExclude = undefined
  })

  it('recomputes layout box when a layer is turned off', () => {
    const layout = new AcTrLayout()
    layout.addLayer(createLayerInfo())
    layout.addEntity(createEntity('line-1'))

    layout.box
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(1)

    layout.updateLayer({ ...createLayerInfo(), isOff: true })

    mockComputeBoundingBox.mockClear()
    expect(layout.box.isEmpty()).toBe(true)
    expect(mockComputeBoundingBox).not.toHaveBeenCalled()
  })

  it('recomputes layout box when entity visibility changes', () => {
    const layout = new AcTrLayout()
    layout.addLayer(createLayerInfo())
    layout.addEntity(createEntity('line-1'))

    layout.box
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(1)

    layout.setEntityVisible('line-1', false)

    layout.box
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(2)
  })

  it('tracks extendBbox exclusions for zoom framing', () => {
    const layout = new AcTrLayout()
    layout.addLayer(createLayerInfo())
    const entity = createEntity('ray-1')

    layout.addEntity(entity, false)
    layout.box
    expect(lastCapturedExclude?.has('ray-1')).toBe(true)

    layout.addEntity(entity, true)
    layout.box
    expect(lastCapturedExclude?.has('ray-1')).toBe(false)
  })

  it('recomputes layout box when an entity is removed', () => {
    const layout = new AcTrLayout()
    layout.addLayer(createLayerInfo())
    layout.addEntity(createEntity('line-1'))

    layout.box
    expect(layout.box.isEmpty()).toBe(false)
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(1)

    mockRemoveEntity.mockReturnValue(true)
    mockComputeBoundingBox.mockImplementationOnce((target: THREE.Box3) => {
      target.makeEmpty()
      return target
    })

    expect(layout.removeEntity('line-1')).toBe(true)

    expect(layout.box.isEmpty()).toBe(true)
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(2)
    expect(mockRemoveEntity).toHaveBeenCalledWith('line-1')
  })

  it('does not recompute layout box when entity removal fails', () => {
    const layout = new AcTrLayout()
    layout.addLayer(createLayerInfo())
    layout.addEntity(createEntity('line-1'))

    layout.box
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(1)

    mockComputeBoundingBox.mockClear()
    expect(layout.removeEntity('missing-id')).toBe(false)
    layout.box

    expect(mockComputeBoundingBox).not.toHaveBeenCalled()
  })

  it('recomputes layout box when an entity is updated', () => {
    const layout = new AcTrLayout()
    layout.addLayer(createLayerInfo())
    layout.addEntity(createEntity('line-1'))

    layout.box
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(1)

    mockRemoveEntity.mockReturnValue(true)
    mockComputeBoundingBox.mockImplementationOnce((target: THREE.Box3) => {
      target.min.set(5, 5, 0)
      target.max.set(20, 20, 0)
      return target
    })

    expect(layout.updateEntity(createEntity('line-1'))).toBe(true)

    expect(layout.box.max.x).toBe(20)
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(2)
    expect(mockRemoveEntity).toHaveBeenCalledWith('line-1')
    expect(mockAddEntity).toHaveBeenCalled()
  })

  it('does not recompute layout box when entity update fails', () => {
    const layout = new AcTrLayout()
    layout.addLayer(createLayerInfo())
    layout.addEntity(createEntity('line-1'))

    layout.box
    mockComputeBoundingBox.mockClear()

    mockRemoveEntity.mockReturnValue(false)
    const entity = createEntity('line-1')
    entity.visible = false
    expect(layout.updateEntity(entity)).toBe(false)

    layout.box
    expect(mockComputeBoundingBox).not.toHaveBeenCalled()
  })
})
