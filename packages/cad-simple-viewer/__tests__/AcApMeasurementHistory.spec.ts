import { AcCmColor, type AcDbDatabase } from '@mlightcad/data-model'
import type { AcTrHtmlGroup } from '@mlightcad/three-renderer'

import {
  getMarkupHistory,
  getSessionUndo
} from '../src/command/markup/AcApMarkupHistory'
import {
  bindMeasurementOverlayHistory,
  resetMeasurementSession,
  runMeasurementEdit
} from '../src/command/measure/AcApMeasurementHistory'
import {
  applyMeasurementStyle,
  commitMeasurementGroup,
  getMeasurementStyle,
  MEASUREMENT_LAYER,
  refreshMeasurementValueLabels
} from '../src/command/measure/AcApMeasurementStore'
import {
  MEASUREMENT_FONT_SIZE,
  MEASUREMENT_LINE_WEIGHT
} from '../src/util/AcApMeasurementUtil'
import type { AcTrView2d } from '../src/view'

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
    reattach(group: AcTrHtmlGroup) {
      groups.set(group.id, group)
    },
    has(id: string) {
      return groups.has(id)
    },
    getGroup(id: string) {
      return groups.get(id)
    }
  }
  const view = {
    htmlTransientManager: manager,
    isDirty: false,
    removeTransientEntity: jest.fn(),
    addTransientEntity: jest.fn(),
    highlight: jest.fn(),
    unhighlight: jest.fn(),
    setTransientEntityVisible: jest.fn()
  } as unknown as AcTrView2d
  return { view, manager }
}

function makeGroup(id: string): AcTrHtmlGroup {
  return {
    id,
    layer: MEASUREMENT_LAYER,
    children: [],
    dispose: jest.fn()
  } as unknown as AcTrHtmlGroup
}

describe('AcApMeasurementHistory', () => {
  beforeEach(() => {
    bindMeasurementOverlayHistory()
    resetMeasurementSession()
    getMarkupHistory().clear()
    getSessionUndo().clear()
  })

  afterEach(() => {
    resetMeasurementSession()
    getSessionUndo().clear()
  })

  it('undo detaches a created measurement and redo reattaches it', () => {
    const { view, manager } = createView()
    const group = makeGroup('m-create')
    runMeasurementEdit(view, 'Create Measurement', () => {
      manager.add(group)
    })

    expect(manager.getGroup('m-create')).toBe(group)
    expect(getSessionUndo().undo(mockDb())).toBe('overlay')
    expect(manager.getGroup('m-create')).toBeUndefined()
    expect(getSessionUndo().redo(mockDb())).toBe('overlay')
    expect(manager.getGroup('m-create')).toBe(group)
  })

  it('undo restores a deleted measurement', () => {
    const { view, manager } = createView()
    const group = makeGroup('m-del')
    runMeasurementEdit(view, 'Create Measurement', () => {
      manager.add(group)
    })

    runMeasurementEdit(view, 'Delete Measurement', () => {
      manager.detach(group.id)
    })
    expect(manager.getGroup('m-del')).toBeUndefined()

    expect(getSessionUndo().undo(mockDb())).toBe('overlay')
    expect(manager.getGroup('m-del')).toBe(group)
  })

  it('undo restores a measurement style-only edit', () => {
    const { view, manager } = createView()
    const group = makeGroup('m-style')
    const color = new AcCmColor()
    color.setRGB(123, 45, 67)
    commitMeasurementGroup(view, group, {
      style: {
        color,
        lineWeight: MEASUREMENT_LINE_WEIGHT,
        fontSize: MEASUREMENT_FONT_SIZE
      }
    })
    expect(manager.getGroup('m-style')).toBe(group)
    expect(getMeasurementStyle('m-style')?.fontSize).toBe(MEASUREMENT_FONT_SIZE)

    runMeasurementEdit(view, 'Measurement Style', () => {
      applyMeasurementStyle(view, group, { fontSize: 20 })
    })
    expect(getMeasurementStyle('m-style')?.fontSize).toBe(20)

    expect(getSessionUndo().undo(mockDb())).toBe('overlay')
    expect(getMeasurementStyle('m-style')?.fontSize).toBe(MEASUREMENT_FONT_SIZE)
    expect(getSessionUndo().redo(mockDb())).toBe('overlay')
    expect(getMeasurementStyle('m-style')?.fontSize).toBe(20)
  })

  it('refreshes committed measurement badge text from the stored value', () => {
    const { view, manager } = createView()
    const setText = jest.fn()
    const group = {
      id: 'm-label',
      layer: MEASUREMENT_LAYER,
      children: [{ setText }],
      dispose: jest.fn()
    } as unknown as AcTrHtmlGroup
    const color = new AcCmColor()
    commitMeasurementGroup(view, group, {
      style: {
        color,
        lineWeight: MEASUREMENT_LINE_WEIGHT,
        fontSize: MEASUREMENT_FONT_SIZE
      },
      value: { kind: 'length', value: 12.3 }
    })
    expect(manager.getGroup('m-label')).toBe(group)

    const db = {
      _lunits: 2,
      _luprec: 1,
      _aunits: 0,
      _auprec: 0,
      get lunits() {
        return this._lunits
      },
      get luprec() {
        return this._luprec
      },
      get aunits() {
        return this._aunits
      },
      get auprec() {
        return this._auprec
      },
      formatter: {
        formatLength(value: number) {
          return Number(value).toFixed(
            (db as { _luprec: number })._luprec
          )
        }
      }
    }

    refreshMeasurementValueLabels(view, db as unknown as AcDbDatabase)
    expect(setText).toHaveBeenCalledWith('12.3')
  })
})
