import { AcDbText, AcGePoint3d } from '@mlightcad/data-model'

import {
  acapBuildMergedMText,
  acapExactSpacingForBaselines
} from '../src/command/modify/acapMergeTextEntities'

function text(
  content: string,
  x: number,
  y: number,
  height: number,
  widthFactor: number
) {
  const entity = new AcDbText()
  entity.textString = content
  entity.position = new AcGePoint3d(x, y, 0)
  entity.height = height
  entity.widthFactor = widthFactor
  entity.styleName = 'PDF_SHX'
  return entity
}

describe('acapMergeTextEntities dxf cases', () => {
  const title = () =>
    text('技术要求', 587.192296, 225.563006, 14.4095, 0.675199)
  const line1 = () =>
    text('1.调质：HB 250~280;', 569.789311, 209.395098, 6.753006, 0.549787)
  const line2 = () =>
    text('2.未注倒角0.5×45°;', 570.1471, 195.830004, 6.752998, 0.64413)

  it('keeps each TEXT widthFactor via \\W including the first fragment', () => {
    const result = acapBuildMergedMText([line1(), line2()])
    expect(result).toBeDefined()
    // First fragment must keep widthFactor 0.55 — MTEXT style xScale is ~1
    expect(result!.contents).toMatch(/\\W0\.549787/)
    expect(result!.contents).toMatch(/\\W0\.64413/)
  })

  it('preserves baseline gap between title and first body line', () => {
    const result = acapBuildMergedMText([title(), line1()])
    expect(result).toBeDefined()
    expect(result!.contents.includes('\\P')).toBe(true)
    expect(result!.contents).toMatch(/\\W0\.675199/)
    // Title is to the right of the body: stretched leading space, no \\pl
    expect(result!.contents).toMatch(/^\{\\W[\d.]+; \}/)
    expect(result!.contents.includes('\\pl')).toBe(false)
    expect(result!.contents.includes('\\pxi')).toBe(false)
    expect(result!.lineSpacingStyle).toBe(2)

    const h1 = 14.4095
    const h2 = 6.753006
    const gap = 225.563006 - 209.395098
    // Renderer baseline gap = spacing - h1 + h2 → spacing = gap + h1 - h2
    const spacing = acapExactSpacingForBaselines(
      [
        { baseline: 225.563006, height: h1 },
        { baseline: 209.395098, height: h2 }
      ],
      h1
    )
    expect(spacing).toBeCloseTo(gap + h1 - h2, 5)
    expect(result!.lineSpacingFactor).toBeCloseTo(
      spacing / (result!.height * (5 / 3)),
      5
    )
    expect(result!.location.y).toBeCloseTo(209.395098, 4)
    // Rendered baseline of the first line above BottomLeft:
    // lastBaseline + (spacing - h1 + h2) = lastBaseline + gap
    const renderedGap =
      result!.lineSpacingFactor * result!.height * (5 / 3) - h1 + h2
    expect(result!.location.y + renderedGap).toBeCloseTo(225.563006, 3)
  })
})

