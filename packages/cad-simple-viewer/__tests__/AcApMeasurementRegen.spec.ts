/**
 * Regression coverage for "measurements disappear after a redraw":
 * `AcApDocManager.regen()` (and the LWDISPLAY toggle) clears the view, which
 * disposes the HTML transient groups that are the only carrier of committed
 * measurement records. These tests pin the snapshot / restore helpers that
 * keep measurements alive across the rebuild.
 */

import { type AcDbDatabase } from '@mlightcad/data-model'
import type { AcTrHtmlGroup } from '@mlightcad/three-renderer'

import {
  AcApMarkupHistory,
  AcApSessionUndo,
  getMarkupHistory,
  getSessionUndo
} from '../src/command/markup/AcApMarkupHistory'
import { acapSetMarkupBagFactory } from '../src/command/markup/AcApMarkupSession'
import { AcApMarkupStore } from '../src/command/markup/AcApMarkupStore'
import {
  bindMeasurementOverlayHistory,
  resetMeasurementSession
} from '../src/command/measure/AcApMeasurementHistory'
import { registerMeasurementPublish } from '../src/command/measure/AcApMeasurementRepublish'
import { deserializeMeasurementStyle } from '../src/command/measure/AcApMeasurementSidecar'
import {
  collectMeasurementRecords,
  commitMeasurementGroup,
  MEASUREMENT_LAYER,
  resetMeasurementStyleState,
  restoreMeasurementsAfterRegen,
  snapshotMeasurementsForRegen
} from '../src/command/measure/AcApMeasurementStore'
import type { AcApMeasurementRecord } from '../src/command/measure/AcApMeasurementTypes'
import {
  MEASUREMENT_FONT_SIZE,
  MEASUREMENT_LINE_WEIGHT
} from '../src/util/AcApMeasurementUtil'
import type { AcTrView2d } from '../src/view'

acapSetMarkupBagFactory(() => ({
  store: new AcApMarkupStore(),
  presenter: {
    forgetPublished() {}
  } as never,
  history: new AcApMarkupHistory(),
  sessionUndo: new AcApSessionUndo()
}))

function mockDb(): AcDbDatabase {
  return {
    transactionManager: {
      canUndo: () => false,
      undo: () => false,
      canRedo: () => false,
      redo: () => false
    }
  } as unknown as AcDbDatabase
}

function createView() {
  const groups = new Map<string, AcTrHtmlGroup>()
  const manager = {
    groupsOnLayer(layer: string) {
      return [...groups.values()].filter(group => group.layer === layer)
    },
    add(group: AcTrHtmlGroup) {
      groups.set(group.id, group)
    },
    detach(id: string) {
      const group = groups.get(id)
      groups.delete(id)
      return group
    },
    has(id: string) {
      return groups.has(id)
    },
    getGroup(id: string) {
      return groups.get(id)
    },
    clear(layer?: string) {
      for (const group of [...groups.values()]) {
        if (layer == null || group.layer === layer) {
          group.onDispose?.()
          groups.delete(group.id)
        }
      }
    },
    deselectAll() {},
    selectGroup: jest.fn()
  }
  const view = {
    htmlTransientManager: manager,
    activeLayoutBtrId: 'layout0',
    isHtmlDirty: false,
    highlight: jest.fn(),
    unhighlight: jest.fn(),
    setTransientEntityVisible: jest.fn(),
    worldToScreen: jest.fn(() => ({ x: 0, y: 0 }))
  } as unknown as AcTrView2d
  return { view, manager }
}

function makeGroup(id: string): AcTrHtmlGroup {
  return {
    id,
    layer: MEASUREMENT_LAYER,
    children: [],
    canvases: [],
    visible: true,
    onSelectedChanged: undefined,
    onVisibleChanged: undefined,
    onDispose: undefined,
    setVisible: jest.fn(),
    dispose: jest.fn()
  } as unknown as AcTrHtmlGroup
}

const distanceRecord: AcApMeasurementRecord = {
  id: 'dist-1',
  type: 'distance',
  style: { color: '#ff0000', lineWeight: MEASUREMENT_LINE_WEIGHT, fontSize: MEASUREMENT_FONT_SIZE },
  geometry: {
    type: 'distance',
    start: { x: 0, y: 0 },
    end: { x: 100, y: 0 }
  }
}

function commitOne(view: AcTrView2d, record = distanceRecord): void {
  const group = makeGroup(record.id)
  commitMeasurementGroup(view, group, {
    style: deserializeMeasurementStyle(record.style),
    snapshot: record
  })
}

describe('measurement overlays across a view-clear redraw', () => {
  beforeEach(() => {
    bindMeasurementOverlayHistory()
    resetMeasurementSession()
    resetMeasurementStyleState()
    getMarkupHistory().clear()
    getSessionUndo().clear()
    registerMeasurementPublish((view, db, record) => {
      commitOne(view, record)
    })
  })

  afterEach(() => {
    resetMeasurementSession()
    resetMeasurementStyleState()
    getSessionUndo().clear()
  })

  it('documents the failure mode: clearing transient groups drops the record', () => {
    const { view, manager } = createView()
    commitOne(view)

    expect(collectMeasurementRecords(view)).toHaveLength(1)

    manager.clear(MEASUREMENT_LAYER)

    expect(collectMeasurementRecords(view)).toHaveLength(0)
  })

  it('snapshot + restore keeps a committed measurement across a view clear', () => {
    const { view, manager } = createView()
    commitOne(view)

    snapshotMeasurementsForRegen(view)
    manager.clear(MEASUREMENT_LAYER)
    restoreMeasurementsAfterRegen(view, mockDb())

    const records = collectMeasurementRecords(view)
    expect(records).toHaveLength(1)
    expect(records[0].id).toBe('dist-1')
    expect(records[0].geometry).toEqual(distanceRecord.geometry)
    expect(manager.getGroup('dist-1')).toBeDefined()
  })

  it('restore without a snapshot is a no-op', () => {
    const { view } = createView()

    expect(() =>
      restoreMeasurementsAfterRegen(view as AcTrView2d, mockDb())
    ).not.toThrow()
    expect(collectMeasurementRecords(view)).toHaveLength(0)
  })
})