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
import { isEffectiveSpatialQueryHit } from '../src/editor/view/AcEdSpatialQueryResult'

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
): AcTrEntity & { wcsBbox: THREE.Box3 } {
  return {
    objectId,
    layerName,
    ownerId: 'layout-1',
    userData: {},
    wcsBbox: new THREE.Box3(
      new THREE.Vector3(1, 1, 0),
      new THREE.Vector3(2, 2, 0)
    )
  } as AcTrEntity & { wcsBbox: THREE.Box3 }
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

describe('AcTrLayout spatial index', () => {
  function collectBoxSelectionIds(
    layout: AcTrLayout,
    pickBox: import('@mlightcad/data-model').AcGeBox2d,
    mode: 'window' | 'crossing'
  ) {
    const results = layout.search(pickBox, { selectionMode: mode })
    const ids: string[] = []
    results.forEach(item => {
      if (!isEffectiveSpatialQueryHit(item)) {
        return
      }
      ids.push(item.id)
    })
    return ids
  }

  it('indexes INSERT root bbox from child-box union when aggregate wcsBbox is stale', () => {
    const layout = new AcTrLayout()
    layout.addLayer(createLayerInfo())

    const entity = createEntity('INSERT-1')
    entity.wcsBbox = new THREE.Box3(
      new THREE.Vector3(-180, 0, 0),
      new THREE.Vector3(574, 56, 0)
    )
    ;(
      entity.userData as {
        spatialIndexChildBoxes?: Array<{
          minX: number
          minY: number
          maxX: number
          maxY: number
          id: string
        }>
      }
    ).spatialIndexChildBoxes = [
      { minX: 394, minY: 0, maxX: 574, maxY: 56, id: 'line-1' }
    ]

    layout.addEntity(entity)

    const hits = layout.search({
      min: { x: -10, y: -72 },
      max: { x: 584, y: 410 }
    } as unknown as import('@mlightcad/data-model').AcGeBox2d)

    expect(hits).toHaveLength(1)
    expect(hits[0].id).toBe('INSERT-1')
    expect(hits[0].minX).toBeCloseTo(394)
    expect(hits[0].maxX).toBeCloseTo(574)
  })

  it('does not window-select INSERT when only part of its geometry fits the pick box', () => {
    const layout = new AcTrLayout()
    layout.addLayer(createLayerInfo())

    const entity = createEntity('INSERT-2')
    entity.wcsBbox = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(300, 10, 0)
    )
    ;(
      entity.userData as {
        spatialIndexChildBoxes?: Array<{
          minX: number
          minY: number
          maxX: number
          maxY: number
          id: string
        }>
      }
    ).spatialIndexChildBoxes = [
      { minX: 0, minY: 0, maxX: 100, maxY: 10, id: 'line-left' },
      { minX: 200, minY: 0, maxX: 300, maxY: 10, id: 'line-right' }
    ]

    layout.addEntity(entity)

    const pickBox = {
      min: { x: 0, y: 0 },
      max: { x: 100, y: 10 }
    } as unknown as import('@mlightcad/data-model').AcGeBox2d

    const hits = layout.search(pickBox)
    expect(hits).toHaveLength(1)
    expect(hits[0].maxX).toBeCloseTo(300)

    const windowContained =
      hits[0].minX >= pickBox.min.x &&
      hits[0].maxX <= pickBox.max.x &&
      hits[0].minY >= pickBox.min.y &&
      hits[0].maxY <= pickBox.max.y

    expect(windowContained).toBe(false)
  })

  it('crossing-selects INSERT when child geometry intersects the pick box', () => {
    const layout = new AcTrLayout()
    layout.addLayer(createLayerInfo())

    const entity = createEntity('INSERT-cross')
    entity.wcsBbox = new THREE.Box3(
      new THREE.Vector3(-180, 0, 0),
      new THREE.Vector3(574, 56, 0)
    )
    ;(
      entity.userData as {
        spatialIndexChildBoxes?: Array<{
          minX: number
          minY: number
          maxX: number
          maxY: number
          id: string
        }>
      }
    ).spatialIndexChildBoxes = [
      { minX: 394, minY: 0, maxX: 574, maxY: 56, id: 'line-1' }
    ]

    layout.addEntity(entity)

    const pickBox = {
      min: { x: 400, y: 0 },
      max: { x: 500, y: 56 }
    } as unknown as import('@mlightcad/data-model').AcGeBox2d

    expect(collectBoxSelectionIds(layout, pickBox, 'crossing')).toEqual([
      'INSERT-cross'
    ])
  })

  it('window-selects INSERT when the child union fits entirely inside the pick box', () => {
    const layout = new AcTrLayout()
    layout.addLayer(createLayerInfo())

    const entity = createEntity('INSERT-window')
    entity.wcsBbox = new THREE.Box3(
      new THREE.Vector3(-180, 0, 0),
      new THREE.Vector3(574, 56, 0)
    )
    ;(
      entity.userData as {
        spatialIndexChildBoxes?: Array<{
          minX: number
          minY: number
          maxX: number
          maxY: number
          id: string
        }>
      }
    ).spatialIndexChildBoxes = [
      { minX: 394, minY: 0, maxX: 574, maxY: 56, id: 'line-1' }
    ]

    layout.addEntity(entity)

    const pickBox = {
      min: { x: 390, y: -5 },
      max: { x: 580, y: 60 }
    } as unknown as import('@mlightcad/data-model').AcGeBox2d

    expect(collectBoxSelectionIds(layout, pickBox, 'window')).toEqual([
      'INSERT-window'
    ])
  })
})
