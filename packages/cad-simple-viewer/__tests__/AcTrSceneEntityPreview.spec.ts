import * as THREE from 'three'

jest.mock('@mlightcad/three-renderer', () => ({
  AcTrEntityPreview: {
    box3ToBounds2d: jest.fn()
  },
  AcTrHtmlTransientManager: class AcTrHtmlTransientManager {},
  AcTrPreviewOverlayManager: class AcTrPreviewOverlayManager {},
  AcTrTransientManager: class AcTrTransientManager {}
}))

import { AcTrLayout } from '../src/view/AcTrLayout'
import { AcTrScene } from '../src/view/AcTrScene'

type StubLayoutConfig = Record<
  string,
  { min: [number, number, number]; max: [number, number, number] } | 'missing'
>

function createStubLayout(previewableIds: StubLayoutConfig): AcTrLayout {
  const layout = {
    computeEntityPreviewBoundsBox: jest.fn(
      (entityIds: string[], target = new THREE.Box3()) => {
        target.makeEmpty()
        for (const id of entityIds) {
          const bounds = previewableIds[id]
          if (!bounds || bounds === 'missing') {
            continue
          }
          target.union(
            new THREE.Box3(
              new THREE.Vector3(...bounds.min),
              new THREE.Vector3(...bounds.max)
            )
          )
        }
        return target
      }
    ),
    findPreviewableEntityIds: jest.fn((entityIds: string[]) =>
      entityIds.filter(id => {
        const bounds = previewableIds[id]
        return bounds != null && bounds !== 'missing'
      })
    ),
    createEntityPreviewRoot: jest.fn((entityIds: string[]) => {
      const matched = entityIds.filter(id => {
        const bounds = previewableIds[id]
        return bounds != null && bounds !== 'missing'
      })
      if (matched.length === 0) {
        return null
      }
      const root = new THREE.Group()
      root.name = `PreviewStub:${matched.join(',')}`
      return root
    }),
    canCreateEntityPreview: jest.fn(() => true)
  }

  return layout as unknown as AcTrLayout
}

function registerLayout(
  scene: AcTrScene,
  layoutId: string,
  layout: AcTrLayout,
  options?: { active?: boolean; model?: boolean }
) {
  const internal = scene as unknown as {
    _layouts: Map<string, AcTrLayout>
    _activeLayoutBtrId: string
    _modelSpaceBtrId: string
  }
  internal._layouts.set(layoutId, layout)
  if (options?.active) {
    internal._activeLayoutBtrId = layoutId
  }
  if (options?.model) {
    internal._modelSpaceBtrId = layoutId
  }
}

describe('AcTrScene entity preview layout policy', () => {
  it('active-first bounds use the first layout that matches', () => {
    const scene = new AcTrScene()
    const active = createStubLayout({
      'line-a': { min: [0, 0, 0], max: [10, 10, 0] }
    })
    const model = createStubLayout({
      'line-b': { min: [100, 100, 0], max: [120, 120, 0] }
    })

    registerLayout(scene, 'active', active, { active: true })
    registerLayout(scene, 'model', model, { model: true })

    const box = (
      scene as unknown as {
        computeEntityPreviewBoundsBox: (
          ids: string[],
          scope: 'active-first' | 'all'
        ) => THREE.Box3
      }
    ).computeEntityPreviewBoundsBox(['line-a', 'line-b'], 'active-first')

    expect(box.min.x).toBeCloseTo(0)
    expect(box.max.x).toBeCloseTo(10)
    expect(active.computeEntityPreviewBoundsBox).toHaveBeenCalled()
    expect(model.computeEntityPreviewBoundsBox).not.toHaveBeenCalled()
  })

  it('scope all deduplicates entities across layouts', () => {
    const scene = new AcTrScene()
    const active = createStubLayout({
      shared: { min: [0, 0, 0], max: [10, 10, 0] },
      'only-active': { min: [20, 0, 0], max: [30, 10, 0] }
    })
    const model = createStubLayout({
      shared: { min: [0, 0, 0], max: [10, 10, 0] },
      'only-model': { min: [100, 0, 0], max: [110, 10, 0] }
    })

    registerLayout(scene, 'active', active, { active: true })
    registerLayout(scene, 'model', model, { model: true })

    const root = scene.createEntityPreviewRoot(
      ['shared', 'only-active', 'only-model'],
      { scope: 'all' }
    )

    expect(root).not.toBeNull()
    expect(root!.children).toHaveLength(2)
    expect(active.createEntityPreviewRoot).toHaveBeenCalledWith(
      ['shared', 'only-active'],
      expect.objectContaining({ missingEntity: 'skip' })
    )
    expect(model.createEntityPreviewRoot).toHaveBeenCalledWith(
      ['only-model'],
      expect.objectContaining({ missingEntity: 'skip' })
    )
  })

  it('findPreviewableEntityIds reports skipped ids across layouts', () => {
    const scene = new AcTrScene()
    const active = createStubLayout({
      'line-1': { min: [0, 0, 0], max: [10, 10, 0] }
    })
    const model = createStubLayout({
      'line-2': { min: [50, 0, 0], max: [60, 10, 0] }
    })

    registerLayout(scene, 'active', active, { active: true })
    registerLayout(scene, 'model', model, { model: true })

    expect(
      scene.findPreviewableEntityIds(['line-1', 'line-2', 'missing'], 'all')
    ).toEqual(['line-1', 'line-2'])
  })

  it('createPreview only uses the active layout with strict entity policy', () => {
    const scene = new AcTrScene()
    const active = createStubLayout({
      'line-1': { min: [0, 0, 0], max: [10, 10, 0] }
    })
    const model = createStubLayout({
      'line-2': { min: [50, 0, 0], max: [60, 10, 0] }
    })

    registerLayout(scene, 'active', active, { active: true })
    registerLayout(scene, 'model', model, { model: true })

    const overlay = scene as unknown as {
      _previewOverlayManager: { add: jest.Mock }
    }
    overlay._previewOverlayManager = {
      add: jest.fn(() => ({ id: 'preview-handle' }))
    }

    scene.createPreview(['line-1'])
    expect(active.createEntityPreviewRoot).toHaveBeenCalledWith(['line-1'], {
      missingEntity: 'fail',
      requireAllEntities: true
    })
    expect(model.createEntityPreviewRoot).not.toHaveBeenCalled()

    jest.clearAllMocks()
    expect(scene.createPreview(['line-2'])).toBeNull()
    expect(active.createEntityPreviewRoot).toHaveBeenCalledWith(['line-2'], {
      missingEntity: 'fail',
      requireAllEntities: true
    })
    expect(model.createEntityPreviewRoot).not.toHaveBeenCalled()
  })

  it('canCreatePreview checks the active layout without building preview geometry', () => {
    const scene = new AcTrScene()
    const active = createStubLayout({
      'line-1': { min: [0, 0, 0], max: [10, 10, 0] }
    })
    active.canCreateEntityPreview = jest.fn(() => true)

    registerLayout(scene, 'active', active, { active: true })

    expect(scene.canCreatePreview(['line-1'])).toBe(true)
    expect(active.canCreateEntityPreview).toHaveBeenCalledWith(['line-1'], {
      requireAllEntities: true
    })
    expect(active.createEntityPreviewRoot).not.toHaveBeenCalled()
  })
})
