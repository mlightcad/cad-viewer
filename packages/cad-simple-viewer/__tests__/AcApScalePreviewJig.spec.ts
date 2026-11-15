import type { AcDbEntity } from '@mlightcad/data-model'
import { AcGePoint3d } from '@mlightcad/data-model'

import { AcApScalePreviewJig } from '../src/command/modify/AcApScalePreviewJig'
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

describe('AcApScalePreviewJig', () => {
  it('publishes transient previews once and updates transforms on each render', () => {
    const view = createTransientFallbackView()
    const entities = [createEntity('line-1'), createEntity('line-2')]
    const jig = new AcApScalePreviewJig(
      view,
      entities,
      new AcGePoint3d(0, 0, 0)
    )

    jig.update(2)
    jig.render()
    jig.update(3)
    jig.render()
    jig.end()

    expect(view.addTransientEntity).toHaveBeenCalledTimes(1)
    expect(view.updateTransientPreviewTransforms).toHaveBeenCalledTimes(2)
    expect(view.removeTransientEntity).toHaveBeenCalledTimes(2)
  })

  it('updates batch preview matrix without publishing transients', () => {
    const view = createBatchView()
    const entities = [createEntity('line-1')]
    const jig = new AcApScalePreviewJig(
      view,
      entities,
      new AcGePoint3d(0, 0, 0)
    )

    jig.update(2)
    jig.render()
    jig.end()

    expect(view.addTransientEntity).not.toHaveBeenCalled()
    expect(view.updateEntityPreview).toHaveBeenCalled()
    expect(view.removeEntityPreview).toHaveBeenCalledWith('preview-1')
  })

  it('ignores a zero length so the preview never collapses', () => {
    const view = createBatchView()
    const jig = new AcApScalePreviewJig(
      view,
      [createEntity('line-1')],
      new AcGePoint3d(0, 0, 0)
    )

    jig.update(0)
    jig.render()

    const calls = (view.updateEntityPreview as jest.Mock).mock.calls as [
      string,
      { elements: number[] }
    ][]
    calls.forEach(([, matrix]) => expect(matrix.elements[0]).not.toBe(0))
    jig.end()
  })

  it('divides the dragged length by the reference length', () => {
    const view = createTransientFallbackView()
    const jig = new AcApScalePreviewJig(
      view,
      [createEntity('line-1')],
      new AcGePoint3d(1, 1, 0),
      4
    )

    jig.update(8)
    jig.render()

    const transforms = (view.updateTransientPreviewTransforms as jest.Mock).mock
      .calls[0][0] as { matrix: { elements: number[] } }[]
    // Column-major: element 0 is the X scale of a factor-2 matrix.
    expect(transforms[0].matrix.elements[0]).toBeCloseTo(2)
    jig.end()
  })
})
