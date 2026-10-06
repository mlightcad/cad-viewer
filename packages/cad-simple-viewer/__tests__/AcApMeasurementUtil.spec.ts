import {
  AcCmColor,
  AcCmColorMethod,
  type AcDbDatabase,
  AcGiLineWeight
} from '@mlightcad/data-model'

import {
  acapCssColor,
  acapCssToMeasurementColor,
  acapGetCurrentMeasurementStyle,
  acapGetMeasurementFontSize,
  acapMeasurementCanvasLineWidth,
  acapGetMeasurementColor,
  acapResetMeasurementDrawStyle,
  acapSetMeasurementDrawColor,
  acapSetMeasurementDrawFontSize,
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

  it('defaults to hairline line weight and factory font size', () => {
    expect(MEASUREMENT_LINE_WEIGHT).toBe(0)
    expect(acapGetMeasurementFontSize()).toBe(MEASUREMENT_FONT_SIZE)
    expect(acapGetCurrentMeasurementStyle(mockDb()).lineWeight).toBe(0)
  })

  it('stores session draw color and font size for later measurements', () => {
    const color = new AcCmColor()
    color.setRGB(10, 20, 30)
    acapSetMeasurementDrawColor(color)
    acapSetMeasurementDrawFontSize(18)

    const drawn = acapGetMeasurementColor(mockDb())
    expect(drawn.red).toBe(10)
    expect(drawn.green).toBe(20)
    expect(drawn.blue).toBe(30)
    expect(acapGetMeasurementFontSize()).toBe(18)

    const style = acapGetCurrentMeasurementStyle(mockDb())
    expect(style.fontSize).toBe(18)
    expect(style.lineWeight).toBe(MEASUREMENT_LINE_WEIGHT)
    expect(style.color.red).toBe(10)
  })

  it('ignores non-positive font sizes', () => {
    acapSetMeasurementDrawFontSize(16)
    acapSetMeasurementDrawFontSize(0)
    acapSetMeasurementDrawFontSize(-4)
    expect(acapGetMeasurementFontSize()).toBe(16)
  })

  it('maps CAD line weight 070 to a 2.5px canvas stroke', () => {
    expect(
      acapMeasurementCanvasLineWidth(AcGiLineWeight.LineWeight070)
    ).toBeCloseTo(2.5)
  })

  it('maps hairline to a 0 canvas width sentinel', () => {
    expect(acapMeasurementCanvasLineWidth(0 as AcGiLineWeight)).toBe(0)
  })
})

describe('acapCssToMeasurementColor', () => {
  it('restores ACI yellow after a CSS round-trip', () => {
    const yellow = new AcCmColor(AcCmColorMethod.ByACI, 2)
    const restored = acapCssToMeasurementColor(acapCssColor(yellow))
    expect(restored.isByACI).toBe(true)
    expect(restored.colorIndex).toBe(2)
  })

  it('maps CSS rgb/hex values that match the ACI palette back to ByACI', () => {
    const rgb = acapCssToMeasurementColor('rgb(255,0,0)')
    expect(rgb.isByACI).toBe(true)
    expect(rgb.colorIndex).toBe(1)

    const hex = acapCssToMeasurementColor('#00FF00')
    expect(hex.isByACI).toBe(true)
    expect(hex.colorIndex).toBe(3)
  })

  it('keeps true-color RGB that is not in the ACI palette', () => {
    const custom = acapCssToMeasurementColor('rgb(12,34,56)')
    expect(custom.isByColor).toBe(true)
    expect(custom.red).toBe(12)
    expect(custom.green).toBe(34)
    expect(custom.blue).toBe(56)
  })

  it('parses rgb() without spaces (sidecar export form)', () => {
    const color = acapCssToMeasurementColor('rgb(96,165,250)')
    expect(color.red).toBe(96)
    expect(color.green).toBe(165)
    expect(color.blue).toBe(250)
  })

  it('parses CSS hex without logging Unknown color name', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation()
    const color = acapCssToMeasurementColor('#d51572')
    expect(color.red).toBe(0xd5)
    expect(color.green).toBe(0x15)
    expect(color.blue).toBe(0x72)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
