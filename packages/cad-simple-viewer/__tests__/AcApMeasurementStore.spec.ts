import { AcCmColor } from '@mlightcad/data-model'
import type { AcTrHtmlGroup } from '@mlightcad/three-renderer'

import {
  AcApMarkupHistory,
  AcApSessionUndo
} from '../src/command/markup/AcApMarkupHistory'
import { acapSetMarkupBagFactory } from '../src/command/markup/AcApMarkupSession'
import { AcApMarkupStore } from '../src/command/markup/AcApMarkupStore'
import { resetMeasurementSession } from '../src/command/measure/AcApMeasurementHistory'
import { stringifyMeasurementSidecar } from '../src/command/measure/AcApMeasurementSidecar'
import {
  applyMeasurementStyle,
  collectMeasurementRecords,
  commitMeasurementGroup,
  MEASUREMENT_LAYER
} from '../src/command/measure/AcApMeasurementStore'
import type { AcApMeasurementRecord } from '../src/command/measure/AcApMeasurementTypes'
import {
  MEASUREMENT_FONT_SIZE,
  MEASUREMENT_LINE_WEIGHT,
  OVERLAY_HAIRLINE_LINE_WEIGHT
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
    isHtmlDirty: false,
    internalCamera: { zoom: 1 },
    worldToScreen: (p: { x: number; y: number }) => ({
      x: p.x * 10,
      y: p.y * 10
    }),
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
    canvases: [],
    dispose: jest.fn()
  } as unknown as AcTrHtmlGroup
}

function hairlineSnapshot(id: string): AcApMeasurementRecord {
  return {
    id,
    type: 'point',
    style: {
      color: 'rgb(10,20,30)',
      lineWeight: MEASUREMENT_LINE_WEIGHT,
      fontSize: MEASUREMENT_FONT_SIZE,
      textHeightWcs: 1.3,
      // Legacy field ignored on export.
      strokeWidthWcs: 0.25
    },
    geometry: { type: 'point', position: { x: 1, y: 2 } }
  }
}

describe('AcApMeasurementStore hairline stroke', () => {
  afterEach(() => {
    resetMeasurementSession()
  })

  it('always exports hairline and omits strokeWidthWcs', () => {
    const { view, manager } = createView()
    const group = makeGroup('hairline-edit')
    const color = new AcCmColor()
    color.setRGB(10, 20, 30)
    commitMeasurementGroup(view, group, {
      style: {
        color,
        lineWeight: OVERLAY_HAIRLINE_LINE_WEIGHT,
        fontSize: MEASUREMENT_FONT_SIZE
      },
      snapshot: hairlineSnapshot(group.id)
    })
    expect(manager.getGroup('hairline-edit')).toBe(group)

    applyMeasurementStyle(view, group, { fontSize: 16 })

    const [record] = collectMeasurementRecords(view)
    expect(record?.style.lineWeight).toBe(0)
    expect(record?.style.strokeWidthWcs).toBeUndefined()
    expect(record?.style.fontSize).toBe(16)

    const json = stringifyMeasurementSidecar({
      version: 1,
      measurements: collectMeasurementRecords(view)
    })
    expect(json).not.toMatch(/"strokeWidthWcs"\s*:/)
    expect(json).toMatch(/"lineWeight"\s*:\s*0/)
  })

  it('does not invent a 0 WCS stroke for a hairline snapshot', () => {
    const { view } = createView()
    const group = makeGroup('hairline-commit')
    const color = new AcCmColor()
    color.setRGB(8, 232, 222)
    commitMeasurementGroup(view, group, {
      style: {
        color,
        lineWeight: OVERLAY_HAIRLINE_LINE_WEIGHT,
        fontSize: MEASUREMENT_FONT_SIZE
      },
      snapshot: {
        id: group.id,
        type: 'point',
        style: {
          color: 'rgb(8,232,222)',
          lineWeight: OVERLAY_HAIRLINE_LINE_WEIGHT,
          fontSize: MEASUREMENT_FONT_SIZE,
          textHeightWcs: 1.3
        },
        geometry: { type: 'point', position: { x: 0, y: 0 } }
      }
    })

    const [record] = collectMeasurementRecords(view)
    expect(record?.style.lineWeight).toBe(0)
    expect(record?.style.strokeWidthWcs).toBeUndefined()
  })
})
