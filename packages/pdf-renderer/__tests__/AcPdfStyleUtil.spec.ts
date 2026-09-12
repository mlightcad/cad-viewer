import {
  AcCmColor,
  AcCmTransparency,
  AcCmTransparencyMethod,
  AcGiLineWeight,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'

import { AcPdfStyleContext, AcPdfStyleUtil } from '../src/renderer/AcPdfStyleUtil'

function createTraits(
  overrides: Partial<AcGiSubEntityTraits> = {}
): AcGiSubEntityTraits {
  return {
    color: (() => {
      const c = new AcCmColor()
      c.setRGB(255, 0, 0)
      return c
    })(),
    lineType: {
      type: 'ByLayer',
      name: 'Continuous',
      standardFlag: 0,
      description: 'Solid line',
      totalPatternLength: 0
    },
    lineTypeScale: 1,
    lineWeight: AcGiLineWeight.LineWeight013,
    fillType: {
      solidFill: true,
      patternAngle: 0,
      definitionLines: []
    },
    transparency: new AcCmTransparency(),
    thickness: 0,
    layer: '0',
    drawOrder: 0,
    ...overrides
  }
}

const ctx: AcPdfStyleContext = {
  ltscale: 1,
  celtscale: 2,
  backgroundColor: 0xffffff,
  foregroundColor: 0x000000,
  showLineWeight: false,
  insunits: 4
}

describe('AcPdfStyleUtil', () => {
  it('applies entity stroke colour from traits', () => {
    const style = AcPdfStyleUtil.strokeStyle(createTraits(), ctx)
    expect(style.rgb).toEqual({ r: 1, g: 0, b: 0 })
    expect(style.lineWidth).toBe(0)
  })

  it('darkens true-colour white strokes on white paper', () => {
    const color = new AcCmColor()
    color.setRGB(255, 255, 255)
    const style = AcPdfStyleUtil.strokeStyle(createTraits({ color }), ctx)
    expect(style.rgb).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('uses foreground colour for ACI 7 linework', () => {
    const style = AcPdfStyleUtil.strokeStyle(
      createTraits({
        color: new AcCmColor().setForeground()
      }),
      ctx
    )
    expect(style.rgb).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('keeps ACI 7 solid hatch fills visible on white paper', () => {
    const style = AcPdfStyleUtil.fillStyle(
      createTraits({
        color: new AcCmColor().setForeground(),
        drawOrder: -1,
        fillType: {
          solidFill: true,
          patternAngle: 0,
          definitionLines: []
        }
      }),
      ctx
    )
    expect(style.rgb).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('converts lineweight 0.13 mm to drawing units when LWDISPLAY is on', () => {
    const style = AcPdfStyleUtil.strokeStyle(createTraits(), {
      ...ctx,
      showLineWeight: true,
      insunits: 4
    })
    expect(style.lineWidth).toBeCloseTo(0.13, 5)
  })

  it('ignores ByLayer transparency alpha (0-255 scale is not PDF opacity)', () => {
    const transparency = new AcCmTransparency()
    // Default method is ByLayer; some DWG entities store alpha 0 here.
    ;(transparency as unknown as { _alpha: number })._alpha = 0
    const style = AcPdfStyleUtil.strokeStyle(
      createTraits({ transparency }),
      ctx
    )
    expect(transparency.isByAlpha).toBe(false)
    expect(style.opacity).toBe(1)
  })

  it('ignores ByAlpha clear (alpha 0) so dimension linework stays visible', () => {
    const transparency = new AcCmTransparency()
    transparency.method = AcCmTransparencyMethod.ByAlpha
    transparency.alpha = 0
    const style = AcPdfStyleUtil.strokeStyle(
      createTraits({ transparency }),
      ctx
    )
    expect(transparency.isByAlpha).toBe(true)
    expect(style.opacity).toBe(1)
  })

  it('maps ByAlpha transparency alpha 0-255 to PDF opacity 0-1', () => {
    const transparency = new AcCmTransparency()
    transparency.method = AcCmTransparencyMethod.ByAlpha
    transparency.alpha = 128
    const style = AcPdfStyleUtil.fillStyle(
      createTraits({ transparency }),
      ctx
    )
    expect(transparency.isByAlpha).toBe(true)
    expect(style.opacity).toBeCloseTo(128 / 255, 5)
  })
})
