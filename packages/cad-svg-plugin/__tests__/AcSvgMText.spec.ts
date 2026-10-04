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
  const color = new AcCmColor()
  color.setRGB(255, 0, 0)
  return {
    color,
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

/** Inner run-group baseline Y values (excludes the outer attachment group). */
function runBaselines(svg: string): number[] {
  return [
    ...svg.matchAll(
      /<g transform="translate\(([^,]+),([^)]+)\)(?: scale\([^)]+\)| skewX\([^)]+\))*"><text/g
    )
  ]
    .map(match => Number(match[2]))
    .filter(y => Number.isFinite(y))
}

/** Inner run-group pen X values on the first baseline (y ≈ 0). */
function runXsOnBaseline(svg: string): number[] {
  return [
    ...svg.matchAll(
      /<g transform="translate\(([^,]+),([^)]+)\)(?: scale\([^)]+\)| skewX\([^)]+\))*"><text/g
    )
  ]
    .filter(match => Math.abs(Number(match[2])) < 1e-9)
    .map(match => Number(match[1]))
    .filter(x => Number.isFinite(x))
}

describe('buildSvgMText', () => {
  it('splits paragraphs into separate text runs', () => {
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

    expect(localSvg).toContain('<text')
    expect(localSvg).toContain('Line1')
    expect(localSvg).toContain('Line2')
    expect(localSvg).toContain('Line3')
    expect(localSvg).toContain('translate(10,20)')
    const baselines = runBaselines(localSvg)
    expect(baselines.filter(y => y > 0).length).toBeGreaterThan(0)
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

    // Default line advance is height * (5/3) with lineSpaceFactor 1.0.
    expect(localSvg).toMatch(/translate\(0,16\.6/)
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

    expect(localSvg).toMatch(/translate\(0,16\.6/)
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

    expect(localSvg).toMatch(/translate\(0,16\.6/)
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

    const baselines = runBaselines(localSvg)
    expect(baselines.length).toBeGreaterThan(1)
    expect(baselines[0]).toBeGreaterThan(baselines[baselines.length - 1])
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

  it('draws underline, overline, and strikethrough as geometry', () => {
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

    expect(localSvg).not.toContain('text-decoration')
    expect((localSvg.match(/<line/g) ?? []).length).toBeGreaterThanOrEqual(3)
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

  it('renders slash stacks as stacked fractions with a divider', () => {
    const { localSvg } = buildSvgMText(
      {
        text: '\\S1/2;',
        height: 10,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('<line')
    expect(localSvg).not.toContain('>1/2<')
    expect(localSvg).toContain('font-size="7"')
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

  it('does not apply the legacy 0.85 width-factor fudge', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'Hello',
        height: 10,
        position: { x: 0, y: 0, z: 0 },
        widthFactor: 1
      } as never,
      { font: 'Arial', widthFactor: 1 } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).not.toContain('scale(0.85')
  })

  it('applies absolute and relative width factors', () => {
    const absolute = buildSvgMText(
      {
        text: '\\W2;Wide',
        height: 10,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )
    expect(absolute.localSvg).toContain('scale(2,1)')

    const relative = buildSvgMText(
      {
        text: '\\W0.5x;Narrow',
        height: 10,
        width: 100,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial', widthFactor: 1 } as never,
      createTraits(),
      ctx
    )
    expect(relative.localSvg).toContain('scale(0.5,1)')
    expect(relative.localSvg).not.toContain('scale(50')
  })

  it('applies oblique formatting with skewX', () => {
    const { localSvg } = buildSvgMText(
      {
        text: '\\Q15;Slant',
        height: 10,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('skewX(-15)')
  })

  it('applies tracking as pen advance without letter-spacing', () => {
    const tracked = buildSvgMText(
      {
        text: '\\T1.5;AB',
        height: 10,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(tracked.localSvg).not.toContain('letter-spacing')
    const trackedXs = runXsOnBaseline(tracked.localSvg)
    expect(trackedXs.length).toBe(2)
    // glyph 6 + (1.5-1)*10*hScale = 11
    expect(trackedXs[1] - trackedXs[0]).toBeCloseTo(11)
  })

  it('applies bold and italic from font face commands', () => {
    const { localSvg } = buildSvgMText(
      {
        text: '\\fArial|b1|i1;Styled',
        height: 10,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('font-weight="700"')
    expect(localSvg).toContain('font-style="italic"')
  })

  it('turns bold and italic off when the font face drops b1/i1', () => {
    const { localSvg } = buildSvgMText(
      {
        text: '{\\fArial|b1|i1;On}{\\fArial|b0|i0;Off}',
        height: 10,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    expect(localSvg).toContain('>On<')
    expect(localSvg).toContain('>Off<')
    expect(localSvg).toMatch(
      /font-weight="700"[^>]*>On<[\s\S]*<text(?![^>]*font-weight)[^>]*>Off</
    )
    expect(localSvg).toMatch(
      /font-style="italic"[^>]*>On<[\s\S]*<text(?![^>]*font-style)[^>]*>Off</
    )
  })

  it('applies top line alignment for mixed heights', () => {
    const { localSvg } = buildSvgMText(
      {
        text: 'A{\\H5;\\A2;B}',
        height: 10,
        position: { x: 0, y: 0, z: 0 }
      } as never,
      { font: 'Arial' } as never,
      createTraits(),
      ctx
    )

    // \A2 (TOP): A stays at size 10, B (size 5) shifts by 5-10 = -5.
    expect(localSvg).toMatch(/translate\([^,]+,-5\)/)
    expect(localSvg).toContain('font-size="5"')
  })
})
