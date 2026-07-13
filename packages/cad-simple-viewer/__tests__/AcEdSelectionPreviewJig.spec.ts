import type { AcDbEntity } from '@mlightcad/data-model'
import { AcGeMatrix3d, AcGePoint3d } from '@mlightcad/data-model'

import {
  AcEdSelectionStaticPreviewJig,
  AcEdSelectionTransformPreviewJig
} from '../src/editor/input/AcEdSelectionPreviewJig'
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

class TestTransformJig extends AcEdSelectionTransformPreviewJig<AcGePoint3d> {
  protected buildTransforms(point: AcGePoint3d) {
    const matrix = new AcGeMatrix3d().makeTranslation(point.x, point.y, point.z)
    return this.previewEntries.map(entry => ({
      objectId: entry.entity.objectId,
      matrix
    }))
  }
}

describe('AcEdSelectionTransformPreviewJig', () => {
  it('publishes transient previews once and updates transforms on each render', () => {
    const view = createTransientFallbackView()
    const entities = [createEntity('line-1'), createEntity('line-2')]
    const jig = new TestTransformJig(view, entities)

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
    const jig = new TestTransformJig(view, entities)

    jig.update(new AcGePoint3d(3, 4, 0))
    jig.render()
    jig.end()

    expect(view.addTransientEntity).not.toHaveBeenCalled()
    expect(view.updateEntityPreview).toHaveBeenCalled()
    expect(view.removeEntityPreview).toHaveBeenCalledWith('preview-1')
  })

  it('creates one clone per source entity per copy factor', () => {
    const view = createTransientFallbackView()
    const entities = [createEntity('line-1'), createEntity('line-2')]
    const jig = new TestTransformJig(view, entities, 2)

    jig.update(new AcGePoint3d(0, 0, 0))
    jig.render()

    expect(view.addTransientEntity).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ objectId: 'line-1' }),
        expect.objectContaining({ objectId: 'line-2' })
      ])
    )
    const published = (view.addTransientEntity as jest.Mock).mock.calls[0][0]
    expect(published).toHaveLength(4)
  })
})

describe('AcEdSelectionStaticPreviewJig', () => {
  it('publishes static clones once and cleans up on end', () => {
    const view = createTransientFallbackView()
    const entities = [createEntity('line-1')]
    const jig = new AcEdSelectionStaticPreviewJig<number>(view, entities)

    jig.update(0)
    jig.render()
    jig.render()
    jig.end()

    expect(view.addTransientEntity).toHaveBeenCalledTimes(1)
    expect(view.updateTransientPreviewTransforms).not.toHaveBeenCalled()
    expect(view.removeTransientEntity).toHaveBeenCalledTimes(1)
  })

  it('skips transient publish when batch preview is active', () => {
    const view = createBatchView()
    const entities = [createEntity('line-1')]
    const jig = new AcEdSelectionStaticPreviewJig<number>(view, entities)

    jig.render()
    jig.end()

    expect(view.addTransientEntity).not.toHaveBeenCalled()
    expect(view.removeEntityPreview).toHaveBeenCalledWith('preview-1')
  })
})
