import {
  AcDbArc,
  AcDbCircle,
  AcDbDatabase,
  AcDbLine,
  AcDbPolyline,
  AcDbSpline,
  AcDbText,
  acdbHostApplicationServices,
  AcGePoint2d,
  AcGePoint3d
} from '@mlightcad/data-model'
import {
  defaultBatchDrawPolicy,
  RTE_REBASE_THRESHOLD
} from '@mlightcad/three-renderer'
import { AcTrRenderer } from '@mlightcad/three-renderer'
import * as THREE from 'three'

import {
  isDirectBatchCandidate,
  tryBuildDirectEntityMeta
} from '../src/view/AcTrDirectBatch'

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

describe('AcTrDirectBatch eligibility', () => {
  it('accepts line-curve candidates and rejects other entity types', () => {
    expect(isDirectBatchCandidate(new AcDbLine({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }))).toBe(
      true
    )
    expect(isDirectBatchCandidate(new AcDbPolyline())).toBe(true)
    expect(
      isDirectBatchCandidate(new AcDbArc(new AcGePoint3d(0, 0, 0), 10, 0, Math.PI))
    ).toBe(true)
    expect(isDirectBatchCandidate(new AcDbCircle(new AcGePoint3d(0, 0, 0), 5))).toBe(
      true
    )
    expect(
      isDirectBatchCandidate(
        new AcDbSpline(
          [
            new AcGePoint3d(0, 0, 0),
            new AcGePoint3d(1, 1, 0),
            new AcGePoint3d(2, -1, 0),
            new AcGePoint3d(3, 0, 0)
          ],
          [0, 0, 0, 0, 1, 1, 1, 1]
        )
      )
    ).toBe(true)
    expect(isDirectBatchCandidate(new AcDbText())).toBe(false)
  })

  it('builds meta for LINE via worldDraw tessellation capture', () => {
    withWorkingDatabase(db => {
      const renderer = createRenderer()
      const line = new AcDbLine(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 0, 0)
      )
      db.tables.blockTable.modelSpace.appendEntity(line)

      const meta = tryBuildDirectEntityMeta(line, renderer)
      expect(meta).not.toBeNull()
      if (!meta) return
      expect(meta.objectId).toBe(line.objectId)
      expect(meta.ownerId).toBe(line.ownerId)
      expect(meta.layerName).toBe(line.layer)
      expect(meta.kind).toBe('lineBasic')
      expect(meta.wcsBbox.min.x).toBeCloseTo(0)
      expect(meta.wcsBbox.max.x).toBeCloseTo(10)
      meta.geometry.dispose()
    })
  })

  it('builds meta for CIRCLE / ARC / SPLINE via subWorldDraw capture', () => {
    withWorkingDatabase(db => {
      const renderer = createRenderer()

      const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 5)
      db.tables.blockTable.modelSpace.appendEntity(circle)
      const circleMeta = tryBuildDirectEntityMeta(circle, renderer)
      expect(circleMeta).not.toBeNull()
      if (!circleMeta) return
      expect(circleMeta.wcsBbox.min.x).toBeCloseTo(-5, 0)
      expect(circleMeta.wcsBbox.max.x).toBeCloseTo(5, 0)
      circleMeta.geometry.dispose()

      const arc = new AcDbArc(new AcGePoint3d(0, 0, 0), 10, 0, Math.PI)
      db.tables.blockTable.modelSpace.appendEntity(arc)
      const arcMeta = tryBuildDirectEntityMeta(arc, renderer)
      expect(arcMeta).not.toBeNull()
      arcMeta?.geometry.dispose()

      const spline = new AcDbSpline(
        [
          new AcGePoint3d(0, 0, 0),
          new AcGePoint3d(1, 1, 0),
          new AcGePoint3d(2, -1, 0),
          new AcGePoint3d(3, 0, 0)
        ],
        [0, 0, 0, 0, 1, 1, 1, 1]
      )
      db.tables.blockTable.modelSpace.appendEntity(spline)
      const splineMeta = tryBuildDirectEntityMeta(spline, renderer)
      expect(splineMeta).not.toBeNull()
      splineMeta?.geometry.dispose()
    })
  })

  it('accepts thin polylines as lineStrip and wide ones as mesh', () => {
    withWorkingDatabase(db => {
      const renderer = createRenderer()

      const thin = new AcDbPolyline()
      thin.addVertexAt(0, new AcGePoint2d(0, 0))
      thin.addVertexAt(1, new AcGePoint2d(10, 0))
      db.tables.blockTable.modelSpace.appendEntity(thin)
      expect(thin.directBatchPrimitive).toBe('lineStrip')
      const thinMeta = tryBuildDirectEntityMeta(thin, renderer)
      expect(thinMeta).not.toBeNull()
      expect(thinMeta?.kind).toBe('lineBasic')
      thinMeta?.geometry.dispose()

      const wide = new AcDbPolyline()
      wide.addVertexAt(0, new AcGePoint2d(0, 0), 0, 1, 1)
      wide.addVertexAt(1, new AcGePoint2d(10, 0), 0, 1, 1)
      db.tables.blockTable.modelSpace.appendEntity(wide)
      expect(wide.directBatchPrimitive).toBe('area')
      const wideMeta = tryBuildDirectEntityMeta(wide, renderer)
      expect(wideMeta).not.toBeNull()
      expect(wideMeta?.kind).toBe('mesh')
      wideMeta?.geometry.dispose()
    })
  })

  it('falls back when draw policy resolves to unbatch', () => {
    withWorkingDatabase(db => {
      const renderer = createRenderer()
      renderer.batchDrawPolicy = defaultBatchDrawPolicy
      const largeX = RTE_REBASE_THRESHOLD + 1000
      const line = new AcDbLine(
        new AcGePoint3d(largeX, 0, 0),
        new AcGePoint3d(largeX + 10, 0, 0)
      )
      db.tables.blockTable.modelSpace.appendEntity(line)

      expect(tryBuildDirectEntityMeta(line, renderer)).toBeNull()
    })
  })
})

