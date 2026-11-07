import {
  AcDbDatabase,
  AcDbLayerTableRecord,
  AcGeBox2d,
  AcGePoint2d
} from '@mlightcad/data-model'

import type { AcEdBaseView } from '../src/editor/view/AcEdBaseView'
import {
  AcApNamedViewService,
  MLIGHT_VIEW_LAYER_SNAP_APPID,
  VIEW_PAPERSPACE_FLAG
} from '../src/service/AcApNamedViewService'

function createMockView(box: AcGeBox2d): AcEdBaseView {
  const min = box.min
  const max = box.max
  let current = box.clone()
  return {
    width: 800,
    height: 600,
    screenToWorld(point: { x: number; y: number }) {
      const t = current
      const x =
        t.min.x + (point.x / 800) * Math.max(t.max.x - t.min.x, Number.EPSILON)
      const y =
        t.max.y - (point.y / 600) * Math.max(t.max.y - t.min.y, Number.EPSILON)
      return new AcGePoint2d(x, y)
    },
    zoomTo(next: AcGeBox2d, _margin: number) {
      current = next.clone()
    },
    getCurrentBox() {
      return current.clone()
    }
  } as unknown as AcEdBaseView & { getCurrentBox: () => AcGeBox2d }
}

describe('AcApNamedViewService', () => {
  let db: AcDbDatabase

  beforeEach(() => {
    db = new AcDbDatabase()
    db.tables.layerTable.add(
      new AcDbLayerTableRecord({ name: 'A', isOff: true })
    )
    const layerB = new AcDbLayerTableRecord({ name: 'B', isOff: false })
    layerB.isFrozen = true
    db.tables.layerTable.add(layerB)
  })

  test('createView captures camera box and layer snapshot via XDATA', () => {
    const box = new AcGeBox2d(
      new AcGePoint2d(10, 20),
      new AcGePoint2d(110, 70)
    )
    const view = createMockView(box)

    expect(
      AcApNamedViewService.createView(db, view, {
        name: 'Detail-A',
        saveLayerSnapshot: true
      })
    ).toBe(true)

    expect(db.tables.appIdTable.has(MLIGHT_VIEW_LAYER_SNAP_APPID)).toBe(true)
    const record = db.tables.viewTable.getAt('Detail-A')
    expect(record).toBeDefined()
    expect(record!.centerPoint.x).toBeCloseTo(60)
    expect(record!.centerPoint.y).toBeCloseTo(45)
    expect(record!.viewWidth).toBeCloseTo(100)
    expect(record!.viewHeight).toBeCloseTo(50)
    expect(record!.standardFlags & VIEW_PAPERSPACE_FLAG).toBe(0)

    const snap = AcApNamedViewService.readLayerSnapshot(record!)
    expect(snap).toBeDefined()
    const byName = new Map(snap!.states.map(s => [s.name, s]))
    expect(byName.get('A')?.isOn).toBe(false)
    expect(byName.get('B')?.isFrozen).toBe(true)
  })

  test('restoreView zooms to saved box and applies layer snapshot', () => {
    const box = new AcGeBox2d(new AcGePoint2d(0, 0), new AcGePoint2d(200, 100))
    const view = createMockView(
      new AcGeBox2d(new AcGePoint2d(-1000, -1000), new AcGePoint2d(1000, 1000))
    ) as AcEdBaseView & { getCurrentBox: () => AcGeBox2d }

    AcApNamedViewService.createView(db, view, {
      name: 'Plan',
      box,
      saveLayerSnapshot: true
    })

    // Change layers away from the snapshot
    const layerA = db.tables.layerTable.getAt('A')!
    layerA.isOff = false
    const layerB = db.tables.layerTable.getAt('B')!
    // thaw B
    layerB.standardFlags = (layerB.standardFlags ?? 0) & ~1

    expect(AcApNamedViewService.restoreView(db, view, 'Plan', true)).toBe(true)

    const restored = view.getCurrentBox()
    expect(restored.min.x).toBeCloseTo(0)
    expect(restored.max.x).toBeCloseTo(200)
    expect(db.tables.layerTable.getAt('A')!.isOff).toBe(true)
    expect(db.tables.layerTable.getAt('B')!.isFrozen).toBe(true)
  })

  test('listViews groups paperspace views under layout', () => {
    const view = createMockView(
      new AcGeBox2d(new AcGePoint2d(0, 0), new AcGePoint2d(10, 10))
    )
    AcApNamedViewService.createView(db, view, {
      name: 'ModelView',
      isPaperSpace: false,
      saveLayerSnapshot: false
    })
    AcApNamedViewService.createView(db, view, {
      name: 'LayoutView',
      isPaperSpace: true,
      saveLayerSnapshot: false
    })

    const list = AcApNamedViewService.listViews(db)
    expect(list.find(v => v.name === 'ModelView')?.group).toBe('model')
    expect(list.find(v => v.name === 'LayoutView')?.group).toBe('layout')
    expect(list.find(v => v.name === 'LayoutView')?.hasLayerSnapshot).toBe(
      false
    )
  })

  test('isValidViewName rejects empty and reserved characters', () => {
    expect(AcApNamedViewService.isValidViewName('Plan-1')).toBe(true)
    expect(AcApNamedViewService.isValidViewName('')).toBe(false)
    expect(AcApNamedViewService.isValidViewName('a\nb')).toBe(false)
    expect(AcApNamedViewService.isValidViewName('a/b')).toBe(false)
  })

  test('deleteView removes the record', () => {
    const view = createMockView(
      new AcGeBox2d(new AcGePoint2d(0, 0), new AcGePoint2d(1, 1))
    )
    AcApNamedViewService.createView(db, view, { name: 'Temp' })
    expect(AcApNamedViewService.deleteView(db, 'Temp')).toBe(true)
    expect(db.tables.viewTable.has('Temp')).toBe(false)
  })

  test('updateLayerSnapshot refreshes stored visibility', () => {
    const view = createMockView(
      new AcGeBox2d(new AcGePoint2d(0, 0), new AcGePoint2d(1, 1))
    )
    AcApNamedViewService.createView(db, view, {
      name: 'Snap',
      saveLayerSnapshot: true
    })

    db.tables.layerTable.getAt('A')!.isOff = false
    expect(AcApNamedViewService.updateLayerSnapshot(db, 'Snap')).toBe(true)

    const snap = AcApNamedViewService.readLayerSnapshot(
      db.tables.viewTable.getAt('Snap')!
    )
    expect(snap!.states.find(s => s.name === 'A')?.isOn).toBe(true)
  })
})
