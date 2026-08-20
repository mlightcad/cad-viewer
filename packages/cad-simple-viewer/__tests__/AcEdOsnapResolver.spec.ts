import {
  AcDbDatabase,
  AcDbLine,
  AcDbOsnapMode,
  acdbHostApplicationServices,
  acdbOsnapModesToMask,
  AcGePoint3d
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

function createMockView(
  pickResults: Array<{ id: string }>
): AcEdBaseView {
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
})
