import { AcCmColor } from '@mlightcad/data-model'
import type { AcTrEntity } from '@mlightcad/three-renderer'

const mockAddEntity = jest.fn()
const mockRemoveEntity = jest.fn()
const mockHasEntity = jest.fn()

jest.mock('@mlightcad/three-renderer', () => ({
  AcTrBatchedGroup: jest.fn().mockImplementation(() => ({
    addEntity: mockAddEntity,
    removeEntity: mockRemoveEntity,
    hasEntity: mockHasEntity,
    setEntityVisible: jest.fn(),
    getEntityVisible: jest.fn(),
    visible: true
  }))
}))

import { AcTrLayer } from '../src/view/AcTrLayer'

function createLayerInfo(name = '0') {
  return {
    name,
    isFrozen: false,
    isOff: false,
    color: new AcCmColor()
  }
}

describe('AcTrLayer.updateEntity', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRemoveEntity.mockReturnValue(false)
    mockHasEntity.mockReturnValue(false)
  })

  it('adds a newly visible entity without a prior remove', () => {
    const layer = new AcTrLayer(createLayerInfo())
    const entity = { objectId: 'line-1', visible: true } as AcTrEntity

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
