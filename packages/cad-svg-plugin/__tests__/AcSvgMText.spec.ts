import {
  AcCmColor,
  AcCmTransparency,
  AcGiLineWeight,
  AcGiMTextAttachmentPoint,
  AcGiMTextFlowDirection,
  AcGiSubEntityTraits
} from '@mlightcad/data-model'

import {
  buildSvgMText,
  resolveSvgFontFamily,
  setSvgFontMapping
} from '../src/AcSvgMTextUtil'
import { AcSvgStyleContext } from '../src/AcSvgStyleUtil'

const ctx: AcSvgStyleContext = {
  ltscale: 1,
  celtscale: 1,
  backgroundColor: 0xffffff,
  foregroundColor: 0x000000,
  showLineWeight: false
}

function createTraits(): AcGiSubEntityTraits {
  return {
    color: new AcCmColor(),
    rgbColor: 0xff0000,
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
    drawOrder: 0
  }
}

describe('buildSvgMText', () => {
  it('splits paragraphs into tspans', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'Line1\\PLine2\\PLine3',
        height: 2.5,
        position: { x: 10, y: 20, z: 0 },
        rotation: 0
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('<tspan')
    expect(localSvg).toContain('Line1')
    expect(localSvg).toContain('Line2')
    expect(localSvg).toContain('Line3')
    expect(localSvg).toContain('translate(10,20)')
  })

  it('renders special characters from the parser', () => {
    const { localSvg } = buildSvgMText(
      {
        text: '%%c45%%d',
        height: 1,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'sans-serif' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('Ø')
    expect(localSvg).toContain('°')
  })

  it('uses entity text height for default font size', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'Hello',
        height: 2.5,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('font-size="2.5"')
    expect(localSvg).not.toMatch(/font-size="1"/)
  })

  it('applies inline height formatting', () => {
    const { localSvg } = buildSvgMText(
      {
        text: '\\H5;Large',
        height: 2.5,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('font-size="5"')
  })

  it('wraps long lines to the mtext width', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'AAAA AAAA AAAA',
        height: 10,
        width: 30,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    const dyValues = [...localSvg.matchAll(/\sdy="([^"]+)"/g)].map(match =>
      Number(match[1])
    )
    expect(dyValues.filter(value => value > 0).length).toBeGreaterThan(0)
    expect(localSvg).toMatch(/<tspan[^>]*x="0"[^>]*dy="0"/)
    expect(localSvg).toMatch(/<tspan[^>]*x="0"[^>]*dy="14\.1/)
  })

  it('wraps continuous latin text without spaces', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'AAAAAAAAAAAAAAAA',
        height: 10,
        width: 30,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    const dyValues = [...localSvg.matchAll(/\sdy="([^"]+)"/g)].map(match =>
      Number(match[1])
    )
    expect(dyValues.filter(value => value > 0).length).toBeGreaterThan(0)
  })

  it('wraps cjk text inside the mtext width', () => {
    const { localSvg } = buildSvgMText(
      {
        text: '这是一段测试文字',
        height: 10,
        width: 30,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'SimSun' } as never,
      createTraits(),
      ctx
    )

    const dyValues = [...localSvg.matchAll(/\sdy="([^"]+)"/g)].map(match =>
      Number(match[1])
    )
    expect(dyValues.filter(value => value > 0).length).toBeGreaterThan(0)
  })

  it('anchors top-left attachment at the insertion point', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'Hello',
        height: 10,
        width: 100,
        position: { x: 50, y: 50, z: 0 },
        attachmentPoint: AcGiMTextAttachmentPoint.TopLeft
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('translate(50,50)')
    expect(localSvg).toContain('translate(0,-10)')
  })

  it('keeps baseline-left attachment on the first baseline', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'Hello',
        height: 10,
        width: 100,
        position: { x: 0, y: 0, z: 0 },
        attachmentPoint: AcGiMTextAttachmentPoint.BaselineLeft
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).not.toMatch(/translate\(0,-10\)/)
    expect(localSvg).toContain('translate(0,0)')
  })

  it('applies attachment point offset for middle-center anchoring', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'Hello',
        height: 10,
        width: 100,
        position: { x: 50, y: 50, z: 0 },
        attachmentPoint: AcGiMTextAttachmentPoint.MiddleCenter
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('translate(50,50)')
    expect(localSvg).toMatch(/translate\(-?\d+(\.\d+)?,-?\d+(\.\d+)?\)/)
  })

  it('uses directionVector for rotation when provided', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'Rotated',
        height: 10,
        width: 100,
        position: { x: 0, y: 0, z: 0 },
        directionVector: { x: 0, y: 1, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('rotate(-90')
  })

  it('lays out bottom-to-top vertical text for TEXT-style flow', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'ABC',
        height: 10,
        width: 100,
        position: { x: 0, y: 0, z: 0 },
        drawingDirection: AcGiMTextFlowDirection.BOTTOM_TO_TOP
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    const yValues = [...localSvg.matchAll(/\sy="([^"]+)"/g)].map(match =>
      Number(match[1])
    )
    expect(yValues.length).toBeGreaterThan(1)
    expect(yValues[0]).toBeGreaterThan(yValues[yValues.length - 1])
  })

  it('applies inline color formatting', () => {
    const { localSvg } = buildSvgMText(
      {
        text: '\\c255;Red',
        height: 1,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'sans-serif' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('fill="#')
    expect(localSvg).toContain('Red')
  })

  it('wraps output in a transformed group', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'Hello',
        height: 2.5,
        position: { x: 1, y: 2, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toMatch(
      /<g transform="[^"]*translate\(1,2\)[^"]*scale\(1,-1\)"/
    )
    expect(localSvg).toContain('<text')
  })

  it('maps SHX font names to CSS font families', () => {
    expect(resolveSvgFontFamily('romans.shx')).toContain('Times New Roman')
    expect(resolveSvgFontFamily('txt.shx')).toContain('monospace')
  })

  it('honours custom font mapping overrides', () => {
    setSvgFontMapping({ customcad: 'Custom Font, sans-serif' })
    expect(resolveSvgFontFamily('customcad.shx')).toBe(
      'Custom Font, sans-serif'
    )
    setSvgFontMapping({})
  })

  it('applies underline, overline, and strikethrough formatting', () => {
    const { localSvg } = buildSvgMText(
      {
        text: '\\LUnder\\OOver\\KStrike',
        height: 10,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('text-decoration="underline"')
    expect(localSvg).toContain('overline')
    expect(localSvg).toContain('line-through')
  })

  it('renders fraction stacks with a divider line', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'A\\S1#2;B',
        height: 10,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('<line')
    expect(localSvg).toContain('1')
    expect(localSvg).toContain('2')
  })

  it('renders superscript stacks with smaller text', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'E=mc\\S2^;',
        height: 10,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('font-size="7"')
  })
})
