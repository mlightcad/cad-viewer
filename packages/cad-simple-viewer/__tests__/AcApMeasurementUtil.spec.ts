import { AcCmColor, type AcDbDatabase, AcGiLineWeight } from '@mlightcad/data-model'

import {
  acapGetCurrentMeasurementStyle,
  acapGetMeasurementFontSize,
  acapGetMeasurementLineWeight,
  acapMeasurementCanvasLineWidth,
  acapGetMeasurementColor,
  acapResetMeasurementDrawStyle,
  acapSetMeasurementDrawColor,
  acapSetMeasurementDrawFontSize,
  acapSetMeasurementDrawLineWeight,
  MEASUREMENT_FONT_SIZE,
  MEASUREMENT_LINE_WEIGHT
} from '../src/util/AcApMeasurementUtil'

function mockDb(): AcDbDatabase {
  return {} as AcDbDatabase
}

describe('AcApMeasurementUtil', () => {
  afterEach(() => {
    acapResetMeasurementDrawStyle()
  })

  it('keeps factory line weight and font size until they are changed', () => {
    expect(acapGetMeasurementLineWeight()).toBe(MEASUREMENT_LINE_WEIGHT)
    expect(acapGetMeasurementFontSize()).toBe(MEASUREMENT_FONT_SIZE)
  })

  it('stores session draw color, line weight, and font size for later measurements', () => {
    const color = new AcCmColor()
    color.setRGB(10, 20, 30)
    acapSetMeasurementDrawColor(color)
    acapSetMeasurementDrawLineWeight(AcGiLineWeight.LineWeight013)
    acapSetMeasurementDrawFontSize(18)

    const drawn = acapGetMeasurementColor(mockDb())
    expect(drawn.red).toBe(10)
    expect(drawn.green).toBe(20)
    expect(drawn.blue).toBe(30)
    expect(acapGetMeasurementLineWeight()).toBe(AcGiLineWeight.LineWeight013)
    expect(acapGetMeasurementFontSize()).toBe(18)

    const style = acapGetCurrentMeasurementStyle(mockDb())
    expect(style.fontSize).toBe(18)
    expect(style.lineWeight).toBe(AcGiLineWeight.LineWeight013)
    expect(style.color.red).toBe(10)
  })

  it('ignores non-positive font sizes', () => {
    acapSetMeasurementDrawFontSize(16)
    acapSetMeasurementDrawFontSize(0)
    acapSetMeasurementDrawFontSize(-4)
    expect(acapGetMeasurementFontSize()).toBe(16)
  })

  it('maps CAD line weight 070 to a 2.5px canvas stroke', () => {
    expect(acapMeasurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT)).toBeCloseTo(2.5)
  })

  it('ignores non-positive line weights', () => {
    acapSetMeasurementDrawLineWeight(AcGiLineWeight.LineWeight211)
    acapSetMeasurementDrawLineWeight(AcGiLineWeight.ByLayer)
    acapSetMeasurementDrawLineWeight(AcGiLineWeight.ByBlock)
    expect(acapGetMeasurementLineWeight()).toBe(AcGiLineWeight.LineWeight211)
  })
})
