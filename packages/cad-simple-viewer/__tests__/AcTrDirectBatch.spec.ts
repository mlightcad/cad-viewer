// Mock @mlightcad/data-model to add directBatchPrimitive getter to AcDbPolyline
// and patch worldDraw to emit the correct draw calls
jest.mock('@mlightcad/data-model', () => {
  const actual = jest.requireActual('@mlightcad/data-model')

  // Patch AcDbPolyline prototype to add directBatchPrimitive getter
  if (actual.AcDbPolyline) {
    // Store width info per-instance
    const originalAddVertexAt =
      actual.AcDbPolyline.prototype.addVertexAt
    Object.defineProperty(actual.AcDbPolyline.prototype, 'directBatchPrimitive', {
      get(this: InstanceType<typeof actual.AcDbPolyline>) {
        // Check if any vertex has non-zero width (startWidth or endWidth)
        if (this._widths) {
          for (const w of this._widths) {
            if (w.startWidth > 0 || w.endWidth > 0) {
              return 'area'
            }
          }
        }
        return 'lineStrip'
      },
      configurable: true
    })

    // Wrap addVertexAt to track width info and vertices
    actual.AcDbPolyline.prototype.addVertexAt = function (
      index: number,
      point: unknown,
      bulge: number,
      startWidth: number,
      endWidth: number,
      ...rest: unknown[]
    ) {
      if (!this._widths) {
        this._widths = []
        this._vertices = []
      }
      this._widths[index] = { startWidth, endWidth }
      this._vertices[index] = point
      return originalAddVertexAt.call(this, index, point, bulge, startWidth, endWidth, ...rest)
    }

    // Patch worldDraw to emit area() for wide polylines
    const originalWorldDraw = actual.AcDbPolyline.prototype.worldDraw
    if (originalWorldDraw) {
      actual.AcDbPolyline.prototype.worldDraw = function (
        this: InstanceType<typeof actual.AcDbPolyline> & { _vertices?: unknown[] },
        renderer: unknown
      ) {
        const primitive = this.directBatchPrimitive
        if (primitive === 'area') {
          // For wide polylines, call renderer.area()
          // Build a mock area that implements the tessellate and legacy APIs
          const AcGePoint2d = actual.AcGePoint2d
          const loop: unknown[] = []
          const vertices = this._vertices || []
          for (let i = 0; i < vertices.length; i++) {
            const pt = vertices[i] as { x: number; y: number }
            loop.push(new AcGePoint2d(pt.x, pt.y))
          }
          const hierarchy = { index: -1, children: [{ index: 0, children: [] }] }
          // Mock tessellate to return the loop (proper tessellation)
          const area = {
            tessellate: () => [loop],
            getPoints: () => [loop],
            buildHierarchy: () => hierarchy
          }
          return (renderer as { area: (area: unknown) => unknown }).area(area)
        }
        // For thin polylines, use the original worldDraw
        return originalWorldDraw.call(this, renderer)
      }
    }
  }

  return actual
})

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
      wide.addVertexAt(2, new AcGePoint2d(10, 5), 0, 1, 1)
      wide.addVertexAt(3, new AcGePoint2d(0, 5), 0, 1, 1)
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

