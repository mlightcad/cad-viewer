import {
  AcDbArc,
  AcDbCircle,
  AcDbDatabase,
  AcDbEllipse,
  AcDbLine,
  AcDbOsnapMode,
  AcDbPolyline,
  acdbHostApplicationServices,
  acdbOsnapModesToMask,
  AcGeCircArc2d,
  AcGePoint2d,
  AcGePoint3d,
  AcGeVector3d
} from '@mlightcad/data-model'

import { AcApSettingManager } from '../src/app/AcApSettingManager'
import { AcEdOsnapResolver } from '../src/editor/input/AcEdOsnapResolver'
import { AcEdBaseView } from '../src/editor/view/AcEdBaseView'

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

function createMockView(pickResults: Array<{ id: string }>): AcEdBaseView {
  return {
    pick: jest.fn().mockReturnValue(pickResults),
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

      const view = createMockView([{ id: a.objectId }, { id: b.objectId }])
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

      const view = createMockView([{ id: a.objectId }, { id: b.objectId }])
      const resolver = new AcEdOsnapResolver(view)
      const snap = resolver.resolve({
        cursorWcs: { x: 5.1, y: 4.9 },
        hitRadiusPx: 20
      })

      expect(snap?.type).not.toBe(AcDbOsnapMode.Intersection)
      expect(snap?.type).toBe(AcDbOsnapMode.Nearest)
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
        { id: horizontal.objectId },
        { id: vertical.objectId }
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

      const view = createMockView([{ id: circle.objectId }])
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

      const view = createMockView([{ id: circle.objectId }])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 100, y: 0 },
        hitRadiusPx: 20
      })
      ;(view.pick as jest.Mock).mockReturnValue([])
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

  it('drops the acquired center tick after the cursor leaves the supporting circle', () => {
    withWorkingDatabase(db => {
      const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 100)
      db.tables.blockTable.modelSpace.appendEntity(circle)

      AcApSettingManager.instance.osnapModes = acdbOsnapModesToMask([
        AcDbOsnapMode.Center
      ])

      const view = createMockView([{ id: circle.objectId }])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 100, y: 0 },
        hitRadiusPx: 20
      })
      ;(view.pick as jest.Mock).mockReturnValue([])
      const snap = resolver.resolve({
        cursorWcs: { x: 200, y: 0 },
        hitRadiusPx: 20
      })

      expect(snap).toBeUndefined()
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

      const view = createMockView([{ id: circle.objectId }])
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

      const view = createMockView([{ id: arc.objectId }])
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

      const view = createMockView([{ id: ellipse.objectId }])
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

      const view = createMockView([{ id: polyline.objectId }])
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

      const view = createMockView([{ id: line.objectId }])
      const resolver = new AcEdOsnapResolver(view)
      resolver.resolve({
        cursorWcs: { x: 5, y: 0 },
        hitRadiusPx: 20
      })

      expect(resolver.acquiredCenterMarks).toHaveLength(0)
    })
  })
})
