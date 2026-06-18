import {
  AcCmColor,
  AcCmTransparency,
  AcGiLineWeight,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'
import { AcSvgStyleContext, AcSvgStyleUtil } from '../src/AcSvgStyleUtil'

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

const ctx: AcSvgStyleContext = {
  ltscale: 1,
  celtscale: 2,
  backgroundColor: 0xffffff,
  foregroundColor: 0x000000,
  showLineWeight: false
}

describe('AcSvgStyleUtil', () => {
  it('converts rgb to hex', () => {
    expect(AcSvgStyleUtil.rgbToHex(0xff8040)).toBe('#ff8040')
  })

  it('applies entity stroke colour from traits', () => {
    const attrs = AcSvgStyleUtil.strokeAttributes(createTraits(), ctx)
    expect(attrs.stroke).toBe('#ff0000')
    expect(attrs.fill).toBe('none')
  })

  it('uses foreground colour for ACI 7 linework', () => {
    const attrs = AcSvgStyleUtil.strokeAttributes(
      createTraits({
        color: new AcCmColor().setForeground()
      }),
      ctx
    )
    expect(attrs.stroke).toBe('#000000')
  })

  it('uses background colour for ACI 7 solid hatch fills', () => {
    const attrs = AcSvgStyleUtil.fillAttributes(
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
    expect(attrs.fill).toBe('#ffffff')
  })

  it('uses non-scaling hairline when showLineWeight is false', () => {
    const attrs = AcSvgStyleUtil.strokeAttributes(createTraits(), ctx)
    expect(attrs['stroke-width']).toBe('1')
    expect(attrs['vector-effect']).toBe('non-scaling-stroke')
  })

  it('applies stroke-width when showLineWeight is true', () => {
    const attrs = AcSvgStyleUtil.strokeAttributes(createTraits(), {
      ...ctx,
      showLineWeight: true
    })
    expect(attrs['stroke-width']).toBe('0.13')
    expect(attrs['vector-effect']).toBeUndefined()
  })

  it('builds stroke-dasharray from linetype pattern', () => {
    const attrs = AcSvgStyleUtil.strokeAttributes(
      createTraits({
        lineType: {
          type: 'ByLayer',
          name: 'Dashed',
          standardFlag: 0,
          description: 'Dash',
          totalPatternLength: 10,
          pattern: [
            { elementLength: 5, elementTypeFlag: 0 },
            { elementLength: -3, elementTypeFlag: 0 }
          ]
        }
      }),
      ctx
    )
    expect(attrs['stroke-dasharray']).toBe('10 6')
  })

  it('renders path tags with attributes', () => {
    const tag = AcSvgStyleUtil.tag('path', { d: 'M0,0 L1,1', stroke: '#000' })
    expect(tag).toContain('d="M0,0 L1,1"')
    expect(tag).toContain('stroke="#000"')
  })
})
