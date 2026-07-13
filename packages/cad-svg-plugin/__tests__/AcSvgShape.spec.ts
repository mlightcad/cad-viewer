import { FontManager } from '@mlightcad/mtext-renderer'

import { AcSvgShape } from '../src/AcSvgShape'
import { AcSvgRenderer } from '../src/AcSvgRenderer'
import {
  buildSvgShape,
  computeBaselineLeftAnchor,
  resolveShapeRotation,
  transformPolylines
} from '../src/AcSvgShapeUtil'
import { AcSvgStyleContext } from '../src/AcSvgStyleUtil'

const ctx: AcSvgStyleContext = {
  ltscale: 1,
  celtscale: 1,
  backgroundColor: 0xffffff,
  foregroundColor: 0x000000,
  showLineWeight: false
}

const defaultTraits = () => new AcSvgRenderer().subEntityTraits

const textStyle = {
  name: 'STYLE',
  standardFlag: 0,
  fixedTextHeight: 0,
  widthFactor: 1,
  obliqueAngle: 0,
  textGenerationFlag: 0,
  lastHeight: 2.5,
  font: 'geniso.shx',
  bigFont: ''
}

describe('AcSvgShapeUtil', () => {
  it('applies width factor and oblique skew to polylines', () => {
    const lines = transformPolylines(
      [
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 }
        ]
      ],
      2,
      Math.tan(Math.PI / 4)
    )

    expect(lines[0][1].x).toBeCloseTo(20)
    expect(lines[0][1].y).toBeCloseTo(0)
  })

  it('anchors baseline-left at the geometry minimum', () => {
    const anchor = computeBaselineLeftAnchor([
      [
        { x: 2, y: 3 },
        { x: 8, y: 9 }
      ]
    ])

    expect(anchor).toEqual({ x: -2, y: -3 })
  })

  it('keeps entity rotation for WCS +Z extrusion', () => {
    const angle = resolveShapeRotation(Math.PI / 3, { x: 0, y: 0, z: 1 })
    expect(angle).toBeCloseTo(Math.PI / 3)
  })

  it('renders empty SVG when the SHX glyph is unavailable', () => {
    const shape = new AcSvgShape(
      {
        name: 'MISSING_SHAPE',
        size: 10,
        position: { x: 0, y: 0, z: 0 }
      },
      {
        ...textStyle,
        font: 'missing-font.shx'
      },
      defaultTraits(),
      ctx
    )

    expect(shape.getLocalSvg()).toBe('')
    expect(shape.box.isEmpty()).toBe(true)
  })

  it('builds stroked paths from SHX polylines', () => {
    const fakeShape = {
      shape: {
        polylines: [
          [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 }
          ]
        ]
      },
      width: 10
    }

    const getShapeByName = jest
      .spyOn(FontManager.instance, 'getShapeByName')
      .mockReturnValue(fakeShape as never)
    const getShapeByCode = jest
      .spyOn(FontManager.instance, 'getShapeByCode')
      .mockReturnValue(undefined)

    try {
      const built = buildSvgShape(
        {
          name: 'TEST',
          size: 10,
          position: { x: 5, y: 5, z: 0 }
        },
        textStyle,
        defaultTraits(),
        ctx
      )

      expect(built.localSvg).toContain('<path')
      expect(built.localSvg).toContain('stroke=')
      expect(built.localSvg).toContain('fill="none"')
      expect(built.box.isEmpty()).toBe(false)
    } finally {
      getShapeByName.mockRestore()
      getShapeByCode.mockRestore()
    }
  })
})
