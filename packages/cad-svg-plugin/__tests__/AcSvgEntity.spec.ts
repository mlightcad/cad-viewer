import { AcGeMatrix3d } from '@mlightcad/data-model'

import { AcSvgGroup } from '../src/AcSvgGroup'
import { AcSvgLine } from '../src/AcSvgLine'
import { AcSvgRenderer } from '../src/AcSvgRenderer'
import { AcSvgStyleContext } from '../src/AcSvgStyleUtil'

const ctx: AcSvgStyleContext = {
  ltscale: 1,
  celtscale: 1,
  backgroundColor: 0xffffff,
  foregroundColor: 0x000000,
  showLineWeight: false
}

const defaultTraits = () => new AcSvgRenderer().subEntityTraits

describe('AcSvgEntity transforms', () => {
  it('wraps geometry with applyMatrix transform at export time', () => {
    const line = new AcSvgLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 }
      ],
      defaultTraits(),
      ctx
    )
    const matrix = new AcGeMatrix3d().makeTranslation(100, 200, 0)
    line.applyMatrix(matrix)

    expect(line.getLocalSvg()).not.toContain('matrix(')
    const rendered = line.renderSvg()
    expect(rendered).toContain('matrix(')
    expect(rendered).toContain('100')
    expect(rendered).toContain('200')
    expect(line.box.min.x).toBeCloseTo(100)
    expect(line.box.min.y).toBeCloseTo(200)
    expect(line.box.max.x).toBeCloseTo(110)
  })

  it('groups block children and applies insert transform once', () => {
    const child = new AcSvgLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 5, y: 0, z: 0 }
      ],
      defaultTraits(),
      ctx
    )
    const group = new AcSvgGroup([child])
    group.applyMatrix(new AcGeMatrix3d().makeTranslation(50, 75, 0))

    const svg = group.renderSvg()
    expect(svg).toContain('matrix(')
    expect(svg).toContain('50')
    expect(svg).toContain('75')
    expect(group.box.min.x).toBeCloseTo(50)
    expect(group.box.max.x).toBeCloseTo(55)
  })

  it('defers transform until renderer export', () => {
    const renderer = new AcSvgRenderer()
    const line = renderer.lines([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 }
    ])
    line.applyMatrix(new AcGeMatrix3d().makeTranslation(20, 30, 0))

    const exported = renderer.export()
    expect(exported).toContain('matrix(')
    expect(exported).toContain('20')
    expect(exported).toContain('30')
  })

  it('merges grouped children without duplicating flat primitives', () => {
    const renderer = new AcSvgRenderer()
    const a = renderer.lines([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 }
    ])
    const b = renderer.lines([
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 }
    ])
    const group = renderer.group([a, b])
    group.applyMatrix(new AcGeMatrix3d().makeTranslation(10, 0, 0))

    const exported = renderer.export()
    const pathCount = (exported.match(/<path /g) ?? []).length
    expect(pathCount).toBe(2)
    expect(exported).toContain('matrix(')
  })

  it('embeds a background rect from currentBackgroundColor', () => {
    const renderer = new AcSvgRenderer()
    renderer.currentBackgroundColor = 0x000000
    renderer.changeForeground(0xffffff)
    renderer.lines([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 }
    ])

    const exported = renderer.export()
    expect(exported).toMatch(/<rect[^>]*fill="#000000"[^>]*\/>/)
    expect(exported.indexOf('<rect')).toBeLessThan(
      exported.indexOf('<g transform')
    )
  })
})
