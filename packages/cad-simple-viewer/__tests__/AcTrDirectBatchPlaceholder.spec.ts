import {
  AcDbDatabase,
  acdbHostApplicationServices,
  AcDbLine,
  AcDbPolyline,
  AcGePoint2d,
  AcGePoint3d
} from '@mlightcad/data-model'
import { AcTrEntity, AcTrRenderer } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { tryBuildDirectEntityMeta } from '../src/view/AcTrDirectBatch'

function createRenderer() {
  const webgl = {
    getSize: (target: THREE.Vector2) => target.set(800, 600),
    setSize: jest.fn(),
    getClearColor: () => new THREE.Color(0, 0, 0),
    getClearAlpha: () => 1,
    autoClear: true,
    domElement: {} as HTMLCanvasElement
  } as unknown as THREE.WebGLRenderer
  return new AcTrRenderer(webgl)
}

function withWorkingDatabase(run: (db: AcDbDatabase) => void) {
  const db = new AcDbDatabase()
  const services = acdbHostApplicationServices() as unknown as {
    _workingDatabase: AcDbDatabase | null
    workingDatabase: AcDbDatabase
  }
  const previous = services._workingDatabase
  services.workingDatabase = db
  try {
    run(db)
  } finally {
    services._workingDatabase = previous
  }
}

/** Counts geometry attachments so a capture can never populate a drawable. */
function trackDrawableAdds() {
  const owners: THREE.Object3D[] = []
  const spy = jest
    .spyOn(AcTrEntity.prototype, 'add')
    .mockImplementation(function (
      this: THREE.Object3D,
      ...objects: THREE.Object3D[]
    ) {
      owners.push(this)
      return THREE.Object3D.prototype.add.apply(this, objects)
    } as typeof AcTrEntity.prototype.add)
  return { owners, spy }
}

function trackCreatedEntities() {
  return jest.spyOn(AcTrRenderer.prototype, 'createEntity')
}

describe('direct-batch capture placeholder', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('reuses one dispose-immune placeholder for every captured entity', () => {
    const createEntitySpy = trackCreatedEntities()
    // The placeholder overrides `dispose`, so no `AcTrEntity.prototype.dispose`
    // call may reach a real entity during the whole capture.
    const disposeSpy = jest.spyOn(AcTrEntity.prototype, 'dispose')

    withWorkingDatabase(db => {
      const renderer = createRenderer()
      const placeholder = renderer.createDirectCapturePlaceholder()
      // Warm the lazy singleton before spying on the drawable sink.
      const tracker = trackDrawableAdds()

      const owned: Array<ReturnType<typeof tryBuildDirectEntityMeta>> = []
      const entities = [
        new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0)),
        new AcDbLine(new AcGePoint3d(0, 5, 0), new AcGePoint3d(10, 5, 0)),
        new AcDbLine(new AcGePoint3d(0, 9, 0), new AcGePoint3d(10, 9, 0))
      ]
      for (const entity of entities) {
        db.tables.blockTable.modelSpace.appendEntity(entity)
        const meta = tryBuildDirectEntityMeta(entity, renderer)
        expect(meta).not.toBeNull()
        owned.push(meta)
      }

      // The capture path allocated no real entity at all.
      expect(createEntitySpy).not.toHaveBeenCalled()
      // ... and attached no geometry to any drawable, including the shared
      // placeholder (which must stay empty so it can never render).
      expect(tracker.owners).toHaveLength(0)
      expect(tracker.spy).not.toHaveBeenCalled()

      // Releasing the captured products must not tear the shared placeholder
      // down: the pre-fix code disposed a fresh placeholder once per capture.
      for (const meta of owned) {
        meta!.geometry.dispose()
      }

      const afterRelease = renderer.createDirectCapturePlaceholder()
      expect(afterRelease).toBe(placeholder)
      expect(afterRelease).toBeInstanceOf(AcTrEntity)
      expect(afterRelease.children).toHaveLength(0)
      expect(afterRelease.parent).toBeNull()
      // Still usable by the next capture session.
      expect(afterRelease.objectId).toBe(entities[2].objectId)
      expect(afterRelease.layerName).toBe(entities[2].layer)
      // The fix must not have started routing capture releases through the
      // prototype `dispose`.
      expect(disposeSpy).not.toHaveBeenCalled()
    })
  })

  it('keeps the placeholder alive across captures and out of the metas', () => {
    const disposeSpy = jest.spyOn(AcTrEntity.prototype, 'dispose')

    withWorkingDatabase(db => {
      const renderer = createRenderer()
      const placeholder = renderer.createDirectCapturePlaceholder()

      const line = new AcDbLine(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 5, 0)
      )
      db.tables.blockTable.modelSpace.appendEntity(line)

      for (let round = 0; round < 4; round++) {
        const meta = tryBuildDirectEntityMeta(line, renderer)
        expect(meta).not.toBeNull()
        // The placeholder never reaches the direct-batch product.
        expect(meta!.geometry).not.toBe(placeholder)
        expect(meta!.worldOffset).not.toBe(placeholder)
        expect(meta!.objectId).toBe(line.objectId)
        expect(meta!.layerName).toBe(line.layer)
        expect(meta!.visible).toBe(line.visibility !== false)

        // Still the same instance, still empty, still detached.
        expect(renderer.createDirectCapturePlaceholder()).toBe(placeholder)
        expect(placeholder.children).toHaveLength(0)
        expect(placeholder.parent).toBeNull()

        meta!.geometry.dispose()
      }

      // 4 capture-path releases happened; none of them actually disposed.
      expect(disposeSpy).not.toHaveBeenCalled()
    })
  })

  it('keeps the placeholder immune to an explicit dispose call', () => {
    withWorkingDatabase(() => {
      const renderer = createRenderer()
      const placeholder = renderer.createDirectCapturePlaceholder()

      placeholder.dispose()
      placeholder.removeFromParent()

      expect(renderer.createDirectCapturePlaceholder()).toBe(placeholder)
      expect(placeholder.children).toHaveLength(0)
      expect(placeholder.parent).toBeNull()
      // renderContext still wired, so `worldDraw` metadata writes keep working.
      expect(placeholder.renderContext).toBeDefined()
    })
  })

  it('routes area-captured solids through the same placeholder', () => {
    const createEntitySpy = trackCreatedEntities()

    withWorkingDatabase(db => {
      const renderer = createRenderer()
      const placeholder = renderer.createDirectCapturePlaceholder()

      const wide = new AcDbPolyline()
      wide.addVertexAt(0, new AcGePoint2d(0, 0), 0, 1, 1)
      wide.addVertexAt(1, new AcGePoint2d(10, 0), 0, 1, 1)
      db.tables.blockTable.modelSpace.appendEntity(wide)
      expect(wide.directBatchPrimitive).toBe('area')

      const meta = tryBuildDirectEntityMeta(wide, renderer)
      expect(meta).not.toBeNull()
      expect(createEntitySpy).not.toHaveBeenCalled()
      expect(renderer.createDirectCapturePlaceholder()).toBe(placeholder)
      expect(meta!.kind).toBe('mesh')
      meta!.geometry.dispose()
    })
  })
})
