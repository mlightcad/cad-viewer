jest.mock('../src/editor/input/ui/AcEdMTextEditor', () => ({
  AcEdMTextEditor: { getActiveInputBox: jest.fn(() => null) }
}))

jest.mock('three/examples/jsm/libs/stats.module', () => ({
  __esModule: true,
  default: class StatsMock {}
}))

jest.mock('three/examples/jsm/renderers/CSS2DRenderer.js', () => ({
  CSS2DRenderer: class CSS2DRendererMock {}
}))

import { AcDbCircle, AcDbEntity, AcGePoint3d } from '@mlightcad/data-model'

import { AcTrView2d } from '../src/view/AcTrView2d'

/**
 * Internal state of {@link AcTrView2d} that the convert bookkeeping keeps.
 * Only the fields these tests need are provided, so the view is built with
 * `Object.create` instead of running the DOM-heavy constructor.
 */
interface ViewInternals {
  _scene: {
    hasEntity: (objectId: string) => boolean
    removeEntity: jest.Mock
  }
  _isDirty: boolean
  _claimedConvertObjectIds: Set<string>
  _entityConvertGeneration: Map<string, number>
  isEntityConvertScheduled: (objectId: string) => boolean
  releaseConvertClaim: (objectId: string) => void
}

function createBareView(entityInScene = false) {
  const view = Object.create(AcTrView2d.prototype) as AcTrView2d
  const internals = view as unknown as ViewInternals
  internals._scene = {
    hasEntity: () => entityInScene,
    removeEntity: jest.fn()
  }
  internals._isDirty = false
  internals._claimedConvertObjectIds = new Set()
  internals._entityConvertGeneration = new Map()
  return { view, internals }
}

function createCircle(objectId: string) {
  const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 5)
  circle.objectId = objectId
  return circle
}

/**
 * Regression for undo followed by redo not restoring a drawn entity.
 *
 * `batchConvert` claims an object id before committing its geometry and keeps
 * the claim for as long as the entity lives in the scene. Undo erases the
 * entity from the database, which calls {@link AcTrView2d.removeEntity}. That
 * used to drop the scene drawable but keep the claim, so the redo conversion
 * hit the "already scheduled" fast-path skip and the restored entity never
 * reappeared on screen.
 */
describe('AcTrView2d convert claims after an erase', () => {
  it('releases the claim so the redone entity converts again', () => {
    const { view, internals } = createBareView()
    const circle = createCircle('19')
    internals._claimedConvertObjectIds.add('19')
    // While claimed and not yet in the scene, a convert pass must skip it.
    expect(internals.isEntityConvertScheduled('19')).toBe(true)

    view.removeEntity(circle as unknown as AcDbEntity)

    expect(internals._scene.removeEntity).toHaveBeenCalledWith('19')
    expect(internals._claimedConvertObjectIds.has('19')).toBe(false)
    expect(internals.isEntityConvertScheduled('19')).toBe(false)
  })

  it('invalidates an in-flight convert for the erased entity', () => {
    const { view, internals } = createBareView()
    const circle = createCircle('19')
    internals._claimedConvertObjectIds.add('19')
    const before = internals._entityConvertGeneration.get('19') ?? 0

    view.removeEntity(circle as unknown as AcDbEntity)

    // Neither a deferred glyph commit nor a partially finished batch convert
    // may re-add geometry for the id that was just erased.
    expect(internals._entityConvertGeneration.get('19')).toBe(before + 1)
  })

  it('releases claims for every entity in a batch erase', () => {
    const { view, internals } = createBareView()
    const ids = ['19', '20', '21']
    ids.forEach(id => internals._claimedConvertObjectIds.add(id))

    view.removeEntity(ids.map(createCircle) as unknown as AcDbEntity[])

    ids.forEach(id => {
      expect(internals._claimedConvertObjectIds.has(id)).toBe(false)
      expect(internals._scene.removeEntity).toHaveBeenCalledWith(id)
    })
  })

  it('releases claims only for entities that leave the scene', () => {
    const { view, internals } = createBareView()
    internals._claimedConvertObjectIds.add('19')
    internals._claimedConvertObjectIds.add('20')

    view.removeEntity(createCircle('19') as unknown as AcDbEntity)

    expect(internals._claimedConvertObjectIds.has('19')).toBe(false)
    expect(internals._claimedConvertObjectIds.has('20')).toBe(true)
  })

  it('leaves generation counters untouched for an empty object id', () => {
    const { view, internals } = createBareView()

    view.removeEntity(createCircle('') as unknown as AcDbEntity)

    expect(internals._entityConvertGeneration.size).toBe(0)
  })
})
