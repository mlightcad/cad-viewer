import { drawingUnitsToPdfPoints, lineWeightToDrawingUnits } from '../src/AcPdfUnits'

describe('AcPdfUnits', () => {
  it('maps millimetres to PDF points', () => {
    expect(drawingUnitsToPdfPoints(4)).toBeCloseTo(72 / 25.4, 8)
  })

  it('maps inches to PDF points', () => {
    expect(drawingUnitsToPdfPoints(1)).toBeCloseTo(72, 8)
  })

  it('treats unitless drawings as millimetres', () => {
    expect(drawingUnitsToPdfPoints(0)).toBeCloseTo(drawingUnitsToPdfPoints(4), 8)
  })

  it('converts AutoCAD lineweight (0.01 mm) into millimetre drawing units', () => {
    expect(lineWeightToDrawingUnits(13, 4)).toBeCloseTo(0.13, 8)
  })
})
