import type { AcDbEntity } from '@mlightcad/data-model'
import { AcGePoint3d } from '@mlightcad/data-model'

import { AcApMovePreviewJig } from '../src/command/modify/AcApMovePreviewJig'
import { AcEdBaseView } from '../src/editor/view/AcEdBaseView'

function createEntity(objectId: string): AcDbEntity {
  const entity = {
    objectId,
    clone: jest.fn(() => createEntity(objectId))
  }
  return entity as unknown as AcDbEntity
}

function createTransientFallbackView() {
  return {
    createEntityPreview: jest.fn(() => null),
    updateEntityPreview: jest.fn(),
    removeEntityPreview: jest.fn(),
    addTransientEntity: jest.fn(),
    removeTransientEntity: jest.fn(),
    updateTransientPreviewTransforms: jest.fn()
  } as unknown as AcEdBaseView
}

function createBatchView() {
  return {
    createEntityPreview: jest.fn(() => 'preview-1'),
    updateEntityPreview: jest.fn(),
    removeEntityPreview: jest.fn(),
    addTransientEntity: jest.fn(),
    removeTransientEntity: jest.fn(),
    updateTransientPreviewTransforms: jest.fn()
  } as unknown as AcEdBaseView
}

describe('AcApMovePreviewJig', () => {
  it('publishes transient previews once and updates transforms on each render', () => {
    const view = createTransientFallbackView()
    const entities = [createEntity('line-1'), createEntity('line-2')]
    const jig = new AcApMovePreviewJig(view, entities, new AcGePoint3d(0, 0, 0))

    jig.update(new AcGePoint3d(5, 0, 0))
    jig.render()
    jig.update(new AcGePoint3d(10, 2, 0))
    jig.render()
    jig.end()

    expect(view.addTransientEntity).toHaveBeenCalledTimes(1)
    expect(view.updateTransientPreviewTransforms).toHaveBeenCalledTimes(2)
    expect(view.removeTransientEntity).toHaveBeenCalledTimes(2)
  })

  it('updates batch preview matrix without publishing transients', () => {
    const view = createBatchView()
    const entities = [createEntity('line-1')]
    const jig = new AcApMovePreviewJig(view, entities, new AcGePoint3d(0, 0, 0))

    jig.update(new AcGePoint3d(3, 4, 0))
    jig.render()
    jig.end()

    expect(view.addTransientEntity).not.toHaveBeenCalled()
    expect(view.updateEntityPreview).toHaveBeenCalled()
    expect(view.removeEntityPreview).toHaveBeenCalledWith('preview-1')
  })
})
