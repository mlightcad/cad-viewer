import {
  AcDbArc,
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbCircle,
  AcDbDatabase,
  AcDbEllipse,
  AcDbEntity,
  AcDbLine,
  AcDbOsnapMode,
  AcDbPolyline,
  acdbHostApplicationServices,
  acdbOsnapModesToMask,
  AcGeCircArc2d,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGePoint3d,
  AcGeVector3d
} from '@mlightcad/data-model'

import { AcApSettingManager } from '../src/app/AcApSettingManager'
import { AcEdOsnapResolver } from '../src/editor/input/AcEdOsnapResolver'
import { AcEdBaseView } from '../src/editor/view/AcEdBaseView'
import {
  acEdDrawingOsnapPoints,
  acEdDrawingIntersectCurves
} from '../src/editor/view/AcEdDrawingGeometry'
import type { AcEdDrawingPickResult } from '../src/editor/view/AcEdDrawingPickResult'

function installLocalStorageMock() {
  const store = new Map<string, string>()
  const localStorageMock = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    }
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true
  })
}

function withWorkingDatabase(run: (db: AcDbDatabase) => void) {
  const db = new AcDbDatabase()
  db.createDefaultData()
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

function candidate(
  database: AcDbDatabase,
  entity: AcDbEntity,
  transform = new AcGeMatrix3d(),
  overrides: Partial<AcEdDrawingPickResult> = {}
): AcEdDrawingPickResult {
  const box = entity.geometricExtents.clone().applyMatrix4(transform)
  return {
    database,
    entity,
    transform,
    rootId: entity.objectId,
    path: [],
    instancePath: [],
    minX: box.min.x,
    minY: box.min.y,
    maxX: box.max.x,
    maxY: box.max.y,
    isCurrent: () => true,
    ...overrides
  }
}

function createMockView(candidates: AcEdDrawingPickResult[]): AcEdBaseView {
  return {
    pickDrawingEntities: jest.fn().mockReturnValue(candidates),
    pick: jest.fn(() => {
      throw new Error('Editing pick must not be used for snapping')
    }),
    // 1 CSS px == 1 WCS unit so threshold equals hitRadiusPx
    screenToWorld: jest.fn(({ x, y }: { x: number; y: number }) => ({
      x,
      y,
      z: 0
    }))
  } as unknown as AcEdBaseView
}

describe('AcEdOsnapResolver', () => {
  beforeEach(() => {
    installLocalStorageMock()
  })

  it('snaps to intersection of two crossing lines', () => {
    withWorkingDatabase(db => {
      const a = new AcDbLine(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 10, 0)
      )
      const b = new AcDbLine(
        new AcGePoint3d(0, 10, 0),
        new AcGePoint3d(10, 0, 0)
      )
      db.tables.blockTable.modelSpace.appendEntity(a)
      db.tables.blockTable.modelSpace.appendEntity(b)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Intersection,
        AcDbOsnapMode.EndPoint
      ])

      const view = createMockView([candidate(db, a), candidate(db, b)])
      const resolver = new AcEdOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 5.1, y: 4.9 },
        hitRadiusPx: 20
      })

      expect(snap).toEqual({
        x: 5,
        y: 5,
        z: 0,
        type: AcDbOsnapMode.Intersection
      })
      expect(AcEdOsnapResolver.osnapModeToMarkerType(snap!.type)).toBe(
        'intersection'
      )
    })
  })

  it('does not report intersection when only nearest is enabled', () => {
    withWorkingDatabase(db => {
      const a = new AcDbLine(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 10, 0)
      )
      const b = new AcDbLine(
        new AcGePoint3d(0, 10, 0),
        new AcGePoint3d(10, 0, 0)
      )
      db.tables.blockTable.modelSpace.appendEntity(a)
      db.tables.blockTable.modelSpace.appendEntity(b)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Nearest
      ])

      const view = createMockView([candidate(db, a), candidate(db, b)])
      const resolver = new AcEdOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 5.1, y: 4.9 },
        hitRadiusPx: 20
      })

      expect(snap?.type).not.toBe(AcDbOsnapMode.Intersection)
      expect(snap?.type).toBe(AcDbOsnapMode.Nearest)
    })
  })

  it('does not report intersection for disjoint display-space extents', () => {
    withWorkingDatabase(db => {
      const left = new AcDbLine(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 0, 0)
      )
      const right = new AcDbLine(
        new AcGePoint3d(100, 0, 0),
        new AcGePoint3d(110, 0, 0)
      )
      db.tables.blockTable.modelSpace.appendEntity(left)
      db.tables.blockTable.modelSpace.appendEntity(right)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Intersection,
        AcDbOsnapMode.EndPoint
      ])

      const view = createMockView([candidate(db, left), candidate(db, right)])
      const resolver = new AcEdOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 5, y: 0 },
        hitRadiusPx: 20
      })
      expect(snap?.type).not.toBe(AcDbOsnapMode.Intersection)
    })
  })

  it('snaps to intersection using only hit INSERT children, not the whole block', () => {
    withWorkingDatabase(db => {
      const block = new AcDbBlockTableRecord()
      block.name = 'INT_BLK'
      db.tables.blockTable.add(block)

      // Dense block contents that must not all participate in INT.
      for (let i = 0; i < 40; i++) {
        block.appendEntity(
          new AcDbLine(new AcGePoint3d(i, -50, 0), new AcGePoint3d(i, 50, 0))
        )
      }
      const diagonal = new AcDbLine(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 10, 0)
      )
      block.appendEntity(diagonal)

      const insert = new AcDbBlockReference('INT_BLK')
      insert.position = new AcGePoint3d(0, 0, 0)
      db.tables.blockTable.modelSpace.appendEntity(insert)

      const crossing = new AcDbLine(
        new AcGePoint3d(0, 10, 0),
        new AcGePoint3d(10, 0, 0)
      )
      db.tables.blockTable.modelSpace.appendEntity(crossing)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Intersection
      ])

      const blockCurvesSpy = jest.spyOn(insert, 'subGetIntersectCurves')
      const view = createMockView([
        candidate(db, diagonal, insert.blockTransform, {
          rootId: insert.objectId,
          path: [diagonal.objectId]
        }),
        candidate(db, crossing)
      ])
      const resolver = new AcEdOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 5.1, y: 4.9 },
        hitRadiusPx: 20
      })

      expect(blockCurvesSpy).not.toHaveBeenCalled()
      expect(snap).toEqual({
        x: 5,
        y: 5,
        z: 0,
        type: AcDbOsnapMode.Intersection
      })
      blockCurvesSpy.mockRestore()
    })
  })

  it('snaps block-line × model polyline INT regardless of pick order', () => {
    withWorkingDatabase(db => {
      const block = new AcDbBlockTableRecord()
      block.name = 'XFRAME_BLK'
      db.tables.blockTable.add(block)

      const diagonal = new AcDbLine(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 10, 0)
      )
      block.appendEntity(diagonal)

      const insert = new AcDbBlockReference('XFRAME_BLK')
      insert.position = new AcGePoint3d(0, 0, 0)
      db.tables.blockTable.modelSpace.appendEntity(insert)

      const crossing = new AcDbPolyline()
      crossing.addVertexAt(0, new AcGePoint2d(0, 10))
      crossing.addVertexAt(1, new AcGePoint2d(10, 0))
      db.tables.blockTable.modelSpace.appendEntity(crossing)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Intersection
      ])

      const expectInt = (candidates: AcEdDrawingPickResult[]) => {
        const resolver = new AcEdOsnapResolver(createMockView(candidates))
        expect(
          resolver.resolve({ cursorWcs: { x: 5.1, y: 4.9 }, hitRadiusPx: 20 })
        ).toEqual({ x: 5, y: 5, z: 0, type: AcDbOsnapMode.Intersection })
      }

      const insertHit = candidate(db, diagonal, insert.blockTransform, {
        rootId: insert.objectId,
        path: [diagonal.objectId]
      })
      const polyHit = candidate(db, crossing)
      // Native primitive intersections must be independent of source order.
      expectInt([polyHit, insertHit])
      expectInt([insertHit, polyHit])
    })
  })

  it('prefers endpoint over coincident intersection at the same location', () => {
    withWorkingDatabase(db => {
      // T-junction: vertical line endpoint lies on horizontal line
      const horizontal = new AcDbLine(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 0, 0)
      )
      const vertical = new AcDbLine(
        new AcGePoint3d(5, 0, 0),
        new AcGePoint3d(5, 10, 0)
      )
      db.tables.blockTable.modelSpace.appendEntity(horizontal)
      db.tables.blockTable.modelSpace.appendEntity(vertical)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.EndPoint,
        AcDbOsnapMode.Intersection
      ])

      const view = createMockView([
        candidate(db, horizontal),
        candidate(db, vertical)
      ])
      const resolver = new AcEdOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 5.05, y: 0.05 },
        hitRadiusPx: 20
      })

      expect(snap?.type).toBe(AcDbOsnapMode.EndPoint)
      expect(snap?.x).toBeCloseTo(5, 5)
      expect(snap?.y).toBeCloseTo(0, 5)
    })
  })

  it('acquires a center tick when hovering a large circle without snapping to the center', () => {
    withWorkingDatabase(db => {
      const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 100)
      db.tables.blockTable.modelSpace.appendEntity(circle)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])

      const view = createMockView([candidate(db, circle)])
      const resolver = new AcEdOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 100, y: 0 },
        hitRadiusPx: 20
      })

      expect(snap).toBeUndefined()
      expect(resolver.acquiredCenterMarks).toHaveLength(1)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(0, 5)
      expect(resolver.acquiredCenterMarks[0]?.y).toBeCloseTo(0, 5)
      expect(
        AcEdOsnapResolver.displayCenterMarks(resolver.acquiredCenterMarks, snap)
      ).toHaveLength(1)
    })
  })

  it('snaps to an acquired circle center after the cursor moves onto the tick', () => {
    withWorkingDatabase(db => {
      const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 100)
      db.tables.blockTable.modelSpace.appendEntity(circle)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])

      const view = createMockView([candidate(db, circle)])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 100, y: 0 },
        hitRadiusPx: 20
      })
      ;(view.pickDrawingEntities as jest.Mock).mockReturnValue([])
      const snap = resolver.resolve({
        cursorWcs: { x: 1, y: 0 },
        hitRadiusPx: 20
      })

      expect(snap?.type).toBe(AcDbOsnapMode.Center)
      expect(snap?.x).toBeCloseTo(0, 5)
      expect(snap?.y).toBeCloseTo(0, 5)
      expect(
        AcEdOsnapResolver.displayCenterMarks(resolver.acquiredCenterMarks, snap)
      ).toHaveLength(0)
    })
  })

  it('keeps the acquired center tick after the cursor leaves the curve until the command ends', () => {
    withWorkingDatabase(db => {
      const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 100)
      db.tables.blockTable.modelSpace.appendEntity(circle)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])

      const view = createMockView([candidate(db, circle)])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 100, y: 0 },
        hitRadiusPx: 20
      })
      ;(view.pickDrawingEntities as jest.Mock).mockReturnValue([])
      const snap = resolver.resolve({
        cursorWcs: { x: 200, y: 0 },
        hitRadiusPx: 20
      })

      expect(snap).toBeUndefined()
      expect(resolver.acquiredCenterMarks).toHaveLength(1)

      const nearCenter = resolver.resolve({
        cursorWcs: { x: 1, y: 0 },
        hitRadiusPx: 20
      })
      expect(nearCenter?.type).toBe(AcDbOsnapMode.Center)

      resolver.clearAcquiredCenters()
      expect(resolver.acquiredCenterMarks).toHaveLength(0)
    })
  })

  it('snaps to circle center immediately when the center is already within the aperture', () => {
    withWorkingDatabase(db => {
      const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 10)
      db.tables.blockTable.modelSpace.appendEntity(circle)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])

      const view = createMockView([candidate(db, circle)])
      const resolver = new AcEdOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 10, y: 0 },
        hitRadiusPx: 20
      })

      expect(snap?.type).toBe(AcDbOsnapMode.Center)
      expect(snap?.x).toBeCloseTo(0, 5)
      expect(snap?.y).toBeCloseTo(0, 5)
    })
  })

  it('acquires the arc center when hovering an arc', () => {
    withWorkingDatabase(db => {
      const arc = new AcDbArc(new AcGePoint3d(0, 0, 0), 50, 0, Math.PI / 2)
      db.tables.blockTable.modelSpace.appendEntity(arc)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])

      const view = createMockView([candidate(db, arc)])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 50, y: 0 },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(1)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(0, 5)
      expect(resolver.acquiredCenterMarks[0]?.y).toBeCloseTo(0, 5)
    })
  })

  it('acquires the ellipse center when hovering an ellipse', () => {
    withWorkingDatabase(db => {
      const ellipse = new AcDbEllipse(
        new AcGePoint3d(2, 3, 0),
        AcGeVector3d.Z_AXIS,
        AcGeVector3d.X_AXIS,
        40,
        20,
        0,
        Math.PI * 2
      )
      db.tables.blockTable.modelSpace.appendEntity(ellipse)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])

      const view = createMockView([candidate(db, ellipse)])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 42, y: 3 },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(1)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(2, 5)
      expect(resolver.acquiredCenterMarks[0]?.y).toBeCloseTo(3, 5)
    })
  })

  it('acquires the bulge-arc center when hovering a polyline arc segment', () => {
    withWorkingDatabase(db => {
      const polyline = new AcDbPolyline()
      polyline.addVertexAt(0, new AcGePoint2d(0, 0), 1)
      polyline.addVertexAt(1, new AcGePoint2d(10, 0))
      db.tables.blockTable.modelSpace.appendEntity(polyline)

      const expected = new AcGeCircArc2d({ x: 0, y: 0 }, { x: 10, y: 0 }, 1)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])

      const view = createMockView([candidate(db, polyline)])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({
        cursorWcs: {
          x: expected.midPoint.x,
          y: expected.midPoint.y
        },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(1)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(
        expected.center.x,
        5
      )
      expect(resolver.acquiredCenterMarks[0]?.y).toBeCloseTo(
        expected.center.y,
        5
      )
    })
  })

  it('does not acquire a center tick when hovering a line', () => {
    withWorkingDatabase(db => {
      const line = new AcDbLine(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 0, 0)
      )
      db.tables.blockTable.modelSpace.appendEntity(line)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center,
        AcDbOsnapMode.EndPoint
      ])

      const view = createMockView([candidate(db, line)])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 5, y: 0 },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(0)
    })
  })

  it('accumulates center ticks from multiple hovered circles in one command', () => {
    withWorkingDatabase(db => {
      const a = new AcDbCircle(new AcGePoint3d(0, 0, 0), 40)
      const b = new AcDbCircle(new AcGePoint3d(100, 0, 0), 40)
      db.tables.blockTable.modelSpace.appendEntity(a)
      db.tables.blockTable.modelSpace.appendEntity(b)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])

      const view = createMockView([candidate(db, a)])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 40, y: 0 },
        hitRadiusPx: 20
      })
      ;(view.pickDrawingEntities as jest.Mock).mockReturnValue([
        candidate(db, b)
      ])
      resolver.resolve({
        cursorWcs: { x: 140, y: 0 },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(2)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(0, 5)
      expect(resolver.acquiredCenterMarks[1]?.x).toBeCloseTo(100, 5)
    })
  })

  it('acquires the center of a circle inside a block reference', () => {
    withWorkingDatabase(db => {
      const block = new AcDbBlockTableRecord()
      block.name = 'CEN_BLK'
      db.tables.blockTable.add(block)
      const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 80)
      block.appendEntity(circle)

      const insert = new AcDbBlockReference('CEN_BLK')
      insert.position = new AcGePoint3d(30, 10, 0)
      db.tables.blockTable.modelSpace.appendEntity(insert)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])

      const view = createMockView([
        candidate(db, circle, insert.blockTransform, {
          rootId: insert.objectId,
          path: [circle.objectId]
        })
      ])
      const resolver = new AcEdOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 110, y: 10 },
        hitRadiusPx: 20
      })

      expect(snap).toBeUndefined()
      expect(resolver.acquiredCenterMarks).toHaveLength(1)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(30, 5)
      expect(resolver.acquiredCenterMarks[0]?.y).toBeCloseTo(10, 5)
    })
  })

  it('acquires the bulge-arc center of a polyline inside a block reference', () => {
    withWorkingDatabase(db => {
      const block = new AcDbBlockTableRecord()
      block.name = 'PL_BLK'
      db.tables.blockTable.add(block)
      const polyline = new AcDbPolyline()
      polyline.addVertexAt(0, new AcGePoint2d(0, 0), 1)
      polyline.addVertexAt(1, new AcGePoint2d(10, 0))
      block.appendEntity(polyline)

      const insert = new AcDbBlockReference('PL_BLK')
      insert.position = new AcGePoint3d(20, 0, 0)
      db.tables.blockTable.modelSpace.appendEntity(insert)

      const local = new AcGeCircArc2d({ x: 0, y: 0 }, { x: 10, y: 0 }, 1)
      const expected = new AcGePoint3d(
        local.center.x,
        local.center.y,
        0
      ).applyMatrix4(insert.blockTransform)
      const mid = new AcGePoint3d(
        local.midPoint.x,
        local.midPoint.y,
        0
      ).applyMatrix4(insert.blockTransform)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])

      const view = createMockView([
        candidate(db, polyline, insert.blockTransform, {
          rootId: insert.objectId,
          path: [polyline.objectId]
        })
      ])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: mid.x, y: mid.y },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(1)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(expected.x, 5)
      expect(resolver.acquiredCenterMarks[0]?.y).toBeCloseTo(expected.y, 5)
    })
  })

  it('transforms nested insert centers through the parent block transform', () => {
    withWorkingDatabase(db => {
      const inner = new AcDbBlockTableRecord()
      inner.name = 'INNER_CEN_BLK'
      db.tables.blockTable.add(inner)
      const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 50)
      inner.appendEntity(circle)

      const outer = new AcDbBlockTableRecord()
      outer.name = 'OUTER_CEN_BLK'
      db.tables.blockTable.add(outer)
      const nestedInsert = new AcDbBlockReference('INNER_CEN_BLK')
      nestedInsert.position = new AcGePoint3d(10, 0, 0)
      outer.appendEntity(nestedInsert)

      const insert = new AcDbBlockReference('OUTER_CEN_BLK')
      insert.position = new AcGePoint3d(100, 20, 0)
      insert.scaleFactors = new AcGePoint3d(2, 2, 1)
      db.tables.blockTable.modelSpace.appendEntity(insert)

      const expected = new AcGePoint3d(0, 0, 0)
        .applyMatrix4(nestedInsert.blockTransform)
        .applyMatrix4(insert.blockTransform)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])

      const view = createMockView([
        candidate(
          db,
          circle,
          insert.blockTransform.clone().multiply(nestedInsert.blockTransform),
          {
            rootId: insert.objectId,
            path: [nestedInsert.objectId, circle.objectId]
          }
        )
      ])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: expected.x + 50, y: expected.y },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(1)
      expect(resolver.acquiredCenterMarks[0]?.x).toBeCloseTo(expected.x, 5)
      expect(resolver.acquiredCenterMarks[0]?.y).toBeCloseTo(expected.y, 5)
      expect(resolver.acquiredCenterMarks[0]?.x).not.toBeCloseTo(10, 5)
    })
  })

  it('uses the captured source database and inverse-transforms the full previous point', () => {
    withWorkingDatabase(source => {
      const line = new AcDbLine(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(2, 0, 0)
      )
      source.tables.blockTable.modelSpace.appendEntity(line)
      const transform = new AcGeMatrix3d()
        .makeTranslation(100, 50, 5)
        .multiply(new AcGeMatrix3d().makeRotationZ(Math.PI / 2))
        .multiply(new AcGeMatrix3d().makeScale(2, 2, 2))
      const query = jest.spyOn(line, 'subGetOsnapPoints')
      withWorkingDatabase(host => {
        const view = createMockView([
          candidate(source, line, transform, { referenceId: 'reference-a' })
        ])
        AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
          AcDbOsnapMode.EndPoint
        ])
        const snap = new AcEdOsnapResolver(view).resolve({
          cursorWcs: { x: 100, y: 54 },
          lastPoint: { x: 100, y: 52, z: 9 },
          hitRadiusPx: 1
        })
        expect(snap?.x).toBeCloseTo(100)
        expect(snap?.y).toBeCloseTo(54)
        expect(snap?.z).toBeCloseTo(5)
        const previous = query.mock.calls[0][2]
        expect(previous.x).toBeCloseTo(1)
        expect(previous.y).toBeCloseTo(0)
        expect(previous.z).toBeCloseTo(2)
        expect(acdbHostApplicationServices().workingDatabase).toBe(host)
        expect(line.startPoint).toEqual(new AcGePoint3d(0, 0, 0))
        expect(line.endPoint).toEqual(new AcGePoint3d(2, 0, 0))
        expect(view.pick).not.toHaveBeenCalled()
      })
      query.mockRestore()
    })
  })

  it.each([1, -1])(
    'intersects a rotated/scaled arc using native curves (mirror %s)',
    mirror => {
      withWorkingDatabase(db => {
        const arc = new AcDbArc(new AcGePoint3d(0, 0, 0), 2, 0, Math.PI / 2)
        const line = new AcDbLine(
          new AcGePoint3d(1, -3, 0),
          new AcGePoint3d(1, 3, 0)
        )
        db.tables.blockTable.modelSpace.appendEntity(arc)
        db.tables.blockTable.modelSpace.appendEntity(line)
        // XY similarity with a different normal scale is a valid planar insertion.
        const transform = new AcGeMatrix3d()
          .makeTranslation(10, 20, 0)
          .multiply(new AcGeMatrix3d().makeRotationZ(Math.PI / 3))
          .multiply(new AcGeMatrix3d().makeScale(2 * mirror, 2, 1))
        const expected = new AcGePoint3d(1, Math.sqrt(3), 0).applyMatrix4(
          transform
        )
        const falseIntersection = new AcGePoint3d(
          1,
          -Math.sqrt(3),
          0
        ).applyMatrix4(transform)
        const view = createMockView([
          candidate(db, arc, transform, { referenceId: 'arc-source' }),
          candidate(db, line, transform, { referenceId: 'line-source' })
        ])
        AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
          AcDbOsnapMode.Intersection
        ])
        const resolver = new AcEdOsnapResolver(view)
        const snap = resolver.resolve({ cursorWcs: expected, hitRadiusPx: 0.1 })
        expect(snap?.type).toBe(AcDbOsnapMode.Intersection)
        expect(snap?.x).toBeCloseTo(expected.x)
        expect(snap?.y).toBeCloseTo(expected.y)
        expect(
          resolver.resolve({ cursorWcs: falseIntersection, hitRadiusPx: 0.1 })
        ).toBeUndefined()
        expect(arc.startAngle).toBe(0)
        expect(arc.endAngle).toBeCloseTo(Math.PI / 2)
      })
    }
  )

  it.each(['reference', 'instance', 'path', 'viewport', 'database'] as const)(
    'keeps independent %s identity for repeated native handles',
    identity => {
      withWorkingDatabase(db => {
        const line = new AcDbLine(
          new AcGePoint3d(-10, 0, 0),
          new AcGePoint3d(10, 0, 0)
        )
        db.tables.blockTable.modelSpace.appendEntity(line)
        let otherDatabase!: AcDbDatabase
        let otherLine!: AcDbLine
        withWorkingDatabase(other => {
          otherDatabase = other
          otherLine = new AcDbLine(
            new AcGePoint3d(-10, 0, 0),
            new AcGePoint3d(10, 0, 0)
          )
          other.tables.blockTable.modelSpace.appendEntity(otherLine)
        })
        expect(otherLine.objectId).toBe(line.objectId)
        const first = candidate(db, line, new AcGeMatrix3d(), {
          referenceId: 'a',
          instancePath: [0]
        })
        const second = candidate(
          identity === 'database' ? otherDatabase : db,
          identity === 'database' ? otherLine : line,
          new AcGeMatrix3d().makeRotationZ(Math.PI / 2),
          {
            referenceId: identity === 'reference' ? 'b' : 'a',
            instancePath: identity === 'instance' ? [1] : [0],
            path: identity === 'path' ? ['nested-occurrence'] : [],
            viewportId: identity === 'viewport' ? 'viewport-b' : undefined
          }
        )
        AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
          AcDbOsnapMode.Intersection
        ])
        const snap = new AcEdOsnapResolver(
          createMockView([first, second])
        ).resolve({
          cursorWcs: { x: 0.1, y: 0.1 },
          hitRadiusPx: 1
        })
        expect(snap?.type).toBe(AcDbOsnapMode.Intersection)
        expect(snap?.x).toBeCloseTo(0)
        expect(snap?.y).toBeCloseTo(0)
      })
    }
  )

  it('retires hidden/replaced centers independently even when two sources share a center', () => {
    withWorkingDatabase(db => {
      const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 100)
      db.tables.blockTable.modelSpace.appendEntity(circle)
      let firstCurrent = true
      let secondCurrent = true
      const view = createMockView([
        candidate(db, circle, new AcGeMatrix3d(), {
          referenceId: 'a',
          isCurrent: () => firstCurrent
        }),
        candidate(db, circle, new AcGeMatrix3d(), {
          referenceId: 'b',
          isCurrent: () => secondCurrent
        })
      ])
      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({ cursorWcs: { x: 100, y: 0 }, hitRadiusPx: 1 })
      expect(resolver.acquiredCenterMarks).toHaveLength(2)
      ;(view.pickDrawingEntities as jest.Mock).mockReturnValue([])
      firstCurrent = false
      expect(resolver.acquiredCenterMarks).toHaveLength(1)
      expect(
        resolver.resolve({ cursorWcs: { x: 0, y: 0 }, hitRadiusPx: 1 })?.type
      ).toBe(AcDbOsnapMode.Center)
      secondCurrent = false
      expect(
        resolver.resolve({ cursorWcs: { x: 0, y: 0 }, hitRadiusPx: 1 })
      ).toBeUndefined()
      expect(resolver.acquiredCenterMarks).toHaveLength(0)
    })
  })

  it('discards stale source candidates before native entity queries', () => {
    withWorkingDatabase(db => {
      const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 2)
      db.tables.blockTable.modelSpace.appendEntity(circle)
      const query = jest.spyOn(circle, 'subGetOsnapPoints')
      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Nearest
      ])
      const view = createMockView([
        candidate(db, circle, new AcGeMatrix3d(), { isCurrent: () => false })
      ])
      expect(
        new AcEdOsnapResolver(view).resolve({ cursorWcs: { x: 2, y: 0 } })
      ).toBeUndefined()
      expect(query).not.toHaveBeenCalled()
      query.mockRestore()
    })
  })

  it('uses world-space native distances for an anisotropically scaled line', () => {
    withWorkingDatabase(db => {
      const line = new AcDbLine(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 10, 0)
      )
      db.tables.blockTable.modelSpace.appendEntity(line)
      const source = candidate(db, line, new AcGeMatrix3d().makeScale(2, 1, 1))
      const nearest = acEdDrawingOsnapPoints(
        source,
        AcDbOsnapMode.Nearest,
        new AcGePoint3d(10, 0, 0)
      )
      expect(nearest).toHaveLength(1)
      expect(nearest[0].x).toBeCloseTo(8)
      expect(nearest[0].y).toBeCloseTo(4)
      const perpendicular = acEdDrawingOsnapPoints(
        source,
        AcDbOsnapMode.Perpendicular,
        new AcGePoint3d(10, 0, 0)
      )
      expect(perpendicular[0].x).toBeCloseTo(8)
      expect(perpendicular[0].y).toBeCloseTo(4)
    })
  })

  it('supports planar XY similarity but omits unsupported affine curved metric modes', () => {
    withWorkingDatabase(db => {
      const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 2)
      db.tables.blockTable.modelSpace.appendEntity(circle)
      const planar = candidate(
        db,
        circle,
        new AcGeMatrix3d().makeScale(2, 2, 1)
      )
      const nearest = acEdDrawingOsnapPoints(
        planar,
        AcDbOsnapMode.Nearest,
        new AcGePoint3d(5, 0, 0)
      )
      expect(nearest[0].x).toBeCloseTo(4)
      expect(nearest[0].y).toBeCloseTo(0)
      const affine = candidate(
        db,
        circle,
        new AcGeMatrix3d().makeScale(2, 1, 1)
      )
      for (const mode of [
        AcDbOsnapMode.Nearest,
        AcDbOsnapMode.Perpendicular,
        AcDbOsnapMode.Tangent
      ]) {
        expect(
          acEdDrawingOsnapPoints(affine, mode, new AcGePoint3d(5, 1, 0))
        ).toEqual([])
      }
      expect(acEdDrawingIntersectCurves(affine)).toEqual([])
      expect(
        acEdDrawingOsnapPoints(affine, AcDbOsnapMode.Center, new AcGePoint3d())
      ).toEqual([new AcGePoint3d()])
    })
  })

  it('retains aperture size when the view camera is rotated', () => {
    withWorkingDatabase(db => {
      const line = new AcDbLine(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(10, 0, 0)
      )
      db.tables.blockTable.modelSpace.appendEntity(line)
      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.EndPoint
      ])
      const view = createMockView([candidate(db, line)])
      ;(view.screenToWorld as jest.Mock).mockImplementation(({ x, y }) => ({
        x: -y,
        y: x,
        z: 0
      }))
      expect(
        new AcEdOsnapResolver(view).resolve({
          cursorWcs: { x: 0.1, y: 0 },
          hitRadiusPx: 1
        })?.type
      ).toBe(AcDbOsnapMode.EndPoint)
    })
  })

  it('does not acquire or snap to a model center outside its paper viewport', () => {
    withWorkingDatabase(db => {
      const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 100)
      db.tables.blockTable.modelSpace.appendEntity(circle)
      const source = candidate(
        db,
        circle,
        new AcGeMatrix3d().makeTranslation(100, 50, 0),
        {
          viewportId: 'paper-viewport',
          clipBounds: { minX: 150, minY: 30, maxX: 250, maxY: 70 }
        }
      )
      const view = createMockView([source])
      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])
      const resolver = new AcEdOsnapResolver(view)
      expect(
        resolver.resolve({ cursorWcs: { x: 200, y: 50 }, hitRadiusPx: 10 })
      ).toBeUndefined()
      expect(resolver.acquiredCenterMarks).toHaveLength(0)
      // Even if a broad source query reaches the circle, clipped snap points must not escape.
      expect(
        resolver.resolve({ cursorWcs: { x: 100, y: 50 }, hitRadiusPx: 10 })
      ).toBeUndefined()
      ;(view.pickDrawingEntities as jest.Mock).mockReturnValue([])
      expect(
        resolver.resolve({ cursorWcs: { x: 100, y: 50 }, hitRadiusPx: 10 })
      ).toBeUndefined()
      // The displayed part of the same curve remains usable.
      ;(view.pickDrawingEntities as jest.Mock).mockReturnValue([source])
      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Nearest
      ])
      const snap = resolver.resolve({
        cursorWcs: { x: 200, y: 50 },
        hitRadiusPx: 10
      })
      expect(snap?.x).toBeCloseTo(200)
      expect(snap?.y).toBeCloseTo(50)
    })
  })

  it.each([0, 1])(
    'requires an intersection to survive contributor %s viewport clipping',
    clippedIndex => {
      withWorkingDatabase(db => {
        const horizontal = new AcDbLine(
          new AcGePoint3d(-10, 0, 0),
          new AcGePoint3d(10, 0, 0)
        )
        const vertical = new AcDbLine(
          new AcGePoint3d(0, -10, 0),
          new AcGePoint3d(0, 10, 0)
        )
        db.tables.blockTable.modelSpace.appendEntity(horizontal)
        db.tables.blockTable.modelSpace.appendEntity(vertical)
        const inside = { minX: -5, minY: -5, maxX: 5, maxY: 5 }
        const outside =
          clippedIndex === 0
            ? { minX: 1, minY: -5, maxX: 5, maxY: 5 }
            : { minX: -5, minY: 1, maxX: 5, maxY: 5 }
        const candidates = [horizontal, vertical].map((entity, index) =>
          candidate(db, entity, new AcGeMatrix3d(), {
            viewportId: `viewport-${index}`,
            clipBounds: index === clippedIndex ? outside : inside
          })
        )
        const view = createMockView(candidates)
        AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
          AcDbOsnapMode.Intersection
        ])
        const resolver = new AcEdOsnapResolver(view)
        expect(
          resolver.resolve({ cursorWcs: { x: 0, y: 0 }, hitRadiusPx: 2 })
        ).toBeUndefined()
        ;(view.pickDrawingEntities as jest.Mock).mockReturnValue(
          candidates.map(source => ({ ...source, clipBounds: inside }))
        )
        expect(
          resolver.resolve({ cursorWcs: { x: 0, y: 0 }, hitRadiusPx: 2 })
        ).toEqual({
          x: 0,
          y: 0,
          z: 0,
          type: AcDbOsnapMode.Intersection
        })
      })
    }
  )
})
