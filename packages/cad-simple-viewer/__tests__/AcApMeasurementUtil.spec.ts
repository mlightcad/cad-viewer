import { AcCmColor, AcGiLineWeight, type AcDbDatabase } from '@mlightcad/data-model'

import {
  currentMeasurementStyle,
  getMeasurementFontSize,
  getMeasurementLineWeight,
  MEASUREMENT_FONT_SIZE,
  MEASUREMENT_LINE_WEIGHT,
  measurementCanvasLineWidth,
  measurementColor,
  resetMeasurementDrawStyle,
  setMeasurementDrawColor,
  setMeasurementDrawFontSize,
  setMeasurementDrawLineWeight
} from '../src/util/AcApMeasurementUtil'

function mockDb(): AcDbDatabase {
  return {} as AcDbDatabase
}

describe('AcApMeasurementUtil', () => {
  afterEach(() => {
    resetMeasurementDrawStyle()
  })

  it('keeps factory line weight and font size until they are changed', () => {
    expect(getMeasurementLineWeight()).toBe(MEASUREMENT_LINE_WEIGHT)
    expect(getMeasurementFontSize()).toBe(MEASUREMENT_FONT_SIZE)
  })

  it('stores session draw color, line weight, and font size for later measurements', () => {
    const color = new AcCmColor()
    color.setRGB(10, 20, 30)
    setMeasurementDrawColor(color)
    setMeasurementDrawLineWeight(AcGiLineWeight.LineWeight013)
    setMeasurementDrawFontSize(18)

    const drawn = measurementColor(mockDb())
    expect(drawn.red).toBe(10)
    expect(drawn.green).toBe(20)
    expect(drawn.blue).toBe(30)
    expect(getMeasurementLineWeight()).toBe(AcGiLineWeight.LineWeight013)
    expect(getMeasurementFontSize()).toBe(18)

    const style = currentMeasurementStyle(mockDb())
    expect(style.fontSize).toBe(18)
    expect(style.lineWeight).toBe(AcGiLineWeight.LineWeight013)
    expect(style.color.red).toBe(10)
  })

  it('ignores non-positive font sizes', () => {
    setMeasurementDrawFontSize(16)
    setMeasurementDrawFontSize(0)
    setMeasurementDrawFontSize(-4)
    expect(getMeasurementFontSize()).toBe(16)
  })

  it('maps CAD line weight 070 to a 2.5px canvas stroke', () => {
    expect(measurementCanvasLineWidth(MEASUREMENT_LINE_WEIGHT)).toBeCloseTo(2.5)
  })

  it('ignores non-positive line weights', () => {
    setMeasurementDrawLineWeight(AcGiLineWeight.LineWeight211)
    setMeasurementDrawLineWeight(AcGiLineWeight.ByLayer)
    setMeasurementDrawLineWeight(AcGiLineWeight.ByBlock)
    expect(getMeasurementLineWeight()).toBe(AcGiLineWeight.LineWeight211)
  })
})
