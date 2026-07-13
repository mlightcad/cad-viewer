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
const mockAddEntity = jest.fn()
const mockRemoveEntity = jest.fn()
const mockHasEntity = jest.fn()
let lastCapturedExclude: ReadonlySet<string> | undefined

jest.mock('@mlightcad/three-renderer', () => {
  const THREE = require('three')
  return {
    AcTrBatchedGroup: jest.fn().mockImplementation(() => {
      const group = new THREE.Group()
      group.addEntity = mockAddEntity
      group.removeEntity = mockRemoveEntity
      group.hasEntity = mockHasEntity
      group.setEntityVisible = jest.fn()
      group.getEntityVisible = jest.fn()
      group.clear = jest.fn()
      group.computeBoundingBox = mockComputeBoundingBox
      return group
    })
  }
})

import { AcTrLayer } from '../src/view/AcTrLayer'

function createLayerInfo(name = '0') {
  return {
    name,
    isFrozen: false,
    isOff: false,
    color: new AcCmColor()
  }
}

function createEntity(objectId: string): AcTrEntity {
  return { objectId, visible: true } as AcTrEntity
}

describe('AcTrLayer.updateEntity', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRemoveEntity.mockReturnValue(false)
    mockHasEntity.mockReturnValue(false)
  })

  it('adds a newly visible entity without a prior remove', () => {
    const layer = new AcTrLayer(createLayerInfo())
    const entity = createEntity('line-1')

    expect(layer.updateEntity(entity)).toBe(true)
    expect(mockRemoveEntity).toHaveBeenCalledWith('line-1')
    expect(mockAddEntity).toHaveBeenCalledWith(entity)
  })

  it('returns false when updating an invisible entity that was never added', () => {
    const layer = new AcTrLayer(createLayerInfo())
    const entity = { objectId: 'line-1', visible: false } as AcTrEntity

    expect(layer.updateEntity(entity)).toBe(false)
    expect(mockAddEntity).not.toHaveBeenCalled()
  })
})

describe('AcTrLayer bounding box', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRemoveEntity.mockReturnValue(false)
    lastCapturedExclude = undefined
  })

  it('recomputes layer box when the layer is turned off', () => {
    const layer = new AcTrLayer(createLayerInfo())
    layer.addEntity(createEntity('line-1'))

    layer.box
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(1)

    layer.update({ ...createLayerInfo(), isOff: true })

    mockComputeBoundingBox.mockClear()
    expect(layer.box.isEmpty()).toBe(true)
    expect(mockComputeBoundingBox).not.toHaveBeenCalled()
  })

  it('recomputes layer box after addEntity', () => {
    const layer = new AcTrLayer(createLayerInfo())

    layer.addEntity(createEntity('line-1'))

    expect(layer.box.isEmpty()).toBe(false)
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(1)
  })

  it('forwards excludeObjectIds to batch bounds computation', () => {
    const layer = new AcTrLayer(createLayerInfo())
    const excluded = new Set(['ray-1'])

    layer.computeBatchBoundingBox(new THREE.Box3(), excluded)

    expect(lastCapturedExclude).toBe(excluded)
  })

  it('recomputes layer box when an entity is removed', () => {
    const layer = new AcTrLayer(createLayerInfo())
    layer.addEntity(createEntity('line-1'))

    layer.box
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(1)

    mockRemoveEntity.mockReturnValue(true)
    mockComputeBoundingBox.mockImplementationOnce((target: THREE.Box3) => {
      target.makeEmpty()
      return target
    })

    expect(layer.removeEntity('line-1')).toBe(true)

    expect(layer.box.isEmpty()).toBe(true)
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(2)
  })

  it('does not recompute layer box when entity removal fails', () => {
    const layer = new AcTrLayer(createLayerInfo())
    layer.addEntity(createEntity('line-1'))

    layer.box
    mockComputeBoundingBox.mockClear()

    expect(layer.removeEntity('missing-id')).toBe(false)
    layer.box

    expect(mockComputeBoundingBox).not.toHaveBeenCalled()
  })

  it('recomputes layer box when an entity is updated', () => {
    const layer = new AcTrLayer(createLayerInfo())
    layer.addEntity(createEntity('line-1'))

    layer.box
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(1)

    mockRemoveEntity.mockReturnValue(true)
    mockComputeBoundingBox.mockImplementationOnce((target: THREE.Box3) => {
      target.min.set(5, 5, 0)
      target.max.set(20, 20, 0)
      return target
    })

    expect(layer.updateEntity(createEntity('line-1'))).toBe(true)

    expect(layer.box.max.x).toBe(20)
    expect(mockComputeBoundingBox).toHaveBeenCalledTimes(2)
  })

  it('does not recompute layer box when entity update fails', () => {
    const layer = new AcTrLayer(createLayerInfo())
    layer.addEntity(createEntity('line-1'))

    layer.box
    mockComputeBoundingBox.mockClear()

    mockRemoveEntity.mockReturnValue(false)
    const entity = createEntity('line-1')
    entity.visible = false
    expect(layer.updateEntity(entity)).toBe(false)

    layer.box
    expect(mockComputeBoundingBox).not.toHaveBeenCalled()
  })
})
