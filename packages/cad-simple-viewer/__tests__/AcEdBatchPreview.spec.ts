import { AcGeMatrix3d, AcGePoint3d } from '@mlightcad/data-model'

import {
  AcEdBatchedPreview,
  scaleCopyDisplacement
} from '../src/editor/input/AcEdBatchPreview'
import { AcEdBaseView } from '../src/editor/view/AcEdBaseView'

function createMockView(options: {
  canCreate?: boolean
  handleId?: string | null
  multiHandle?: boolean
}) {
  const createdIds: string[][] = []
  const updatedMatrices: AcGeMatrix3d[] = []
  const removedIds: string[] = []
  let nextHandle = 0

  const view = {
    canCreateEntityPreview: jest.fn(() => options.canCreate ?? true),
    createEntityPreview: jest.fn((entityIds: string[]) => {
      createdIds.push(entityIds)
      if (entityIds.length === 0) {
        return null
      }
      if (options.handleId === null) {
        return null
      }
      if (options.multiHandle) {
        return `preview-${++nextHandle}`
      }
      return options.handleId === undefined ? 'preview-1' : options.handleId
    }),
    updateEntityPreview: jest.fn((_handleId: string, matrix: AcGeMatrix3d) => {
      updatedMatrices.push(matrix)
    }),
    removeEntityPreview: jest.fn((handleId: string) => {
      removedIds.push(handleId)
    }),
    updateTransientPreviewTransforms: jest.fn()
  } as unknown as AcEdBaseView

  return { view, createdIds, updatedMatrices, removedIds }
}

describe('AcEdBatchedPreview', () => {
  it('uses batch preview when ids are scene-resident', () => {
    const { view, createdIds, removedIds } = createMockView({})
    const ids = ['id-1', 'id-2', 'id-3']

    const preview = new AcEdBatchedPreview(view, ids)
    expect(preview.useBatchPreview).toBe(true)
    expect(view.createEntityPreview).toHaveBeenCalledTimes(1)
    expect(view.updateEntityPreview).toHaveBeenCalledTimes(1)
    expect(createdIds).toHaveLength(1)
    expect(createdIds[0]).toEqual(ids)

    preview.updateMatrix(view, new AcGeMatrix3d().makeTranslation(1, 2, 3))
    expect(view.updateEntityPreview).toHaveBeenCalledTimes(2)

    preview.dispose(view)
    expect(removedIds).toEqual(['preview-1'])
  })

  it('falls back when selection is empty', () => {
    const { view, createdIds } = createMockView({})
    const preview = new AcEdBatchedPreview(view, [])
    expect(preview.useBatchPreview).toBe(false)
    expect(createdIds).toHaveLength(0)
  })

  it('falls back when preview handle creation fails', () => {
    const { view, createdIds } = createMockView({
      canCreate: true,
      handleId: null
    })
    const ids = ['id-1', 'id-2', 'id-3']

    const preview = new AcEdBatchedPreview(view, ids)
    expect(preview.useBatchPreview).toBe(false)
    expect(createdIds).toHaveLength(1)
  })

  it('updates placement for a single copy preview', () => {
    const { view } = createMockView({})
    const preview = new AcEdBatchedPreview(view, ['id-1'], 1)

    preview.updatePlacements(view, new AcGePoint3d(3, 4, 0), false)
    expect(view.updateEntityPreview).toHaveBeenCalledTimes(2)
  })

  it('creates one preview overlay per array copy', () => {
    const { view, createdIds, removedIds } = createMockView({
      multiHandle: true
    })
    const ids = ['id-1', 'id-2']

    const previews = new AcEdBatchedPreview(view, ids, 3)
    expect(previews.useBatchPreview).toBe(true)
    expect(createdIds).toHaveLength(3)

    previews.updatePlacements(view, new AcGePoint3d(9, 0, 0), false)
    expect(view.updateEntityPreview).toHaveBeenCalledTimes(6)

    previews.dispose(view)
    expect(removedIds).toEqual(['preview-1', 'preview-2', 'preview-3'])
  })

  it('falls back when one overlay fails to create', () => {
    let createCount = 0
    const { view, removedIds } = createMockView({
      multiHandle: true
    })
    ;(view.createEntityPreview as jest.Mock).mockImplementation(
      (entityIds: string[]) => {
        createCount += 1
        return createCount < 2 ? `preview-${createCount}` : null
      }
    )

    const previews = new AcEdBatchedPreview(view, ['id-1'], 2)
    expect(previews.useBatchPreview).toBe(false)
    expect(removedIds).toEqual(['preview-1'])
  })
})

describe('scaleCopyDisplacement', () => {
  it('scales linearly for normal array mode', () => {
    expect(
      scaleCopyDisplacement(new AcGePoint3d(6, 0, 0), 2, 3, false)
    ).toEqual(new AcGePoint3d(12, 0, 0))
  })

  it('distributes evenly for fit array mode', () => {
    expect(scaleCopyDisplacement(new AcGePoint3d(9, 0, 0), 2, 3, true)).toEqual(
      new AcGePoint3d(6, 0, 0)
    )
  })
})
