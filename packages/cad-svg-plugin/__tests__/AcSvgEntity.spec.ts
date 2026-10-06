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
    expect(group.childCount).toBe(1)
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

  it('fastDeepClone keeps INSERT templates independent across applyMatrix', () => {
    const child = new AcSvgLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 5, y: 0, z: 0 }
      ],
      defaultTraits(),
      ctx
    )
    const template = new AcSvgGroup([child])
    const a = template.fastDeepClone()
    const b = template.fastDeepClone()

    a.applyMatrix(new AcGeMatrix3d().makeTranslation(100, 0, 0))
    b.applyMatrix(new AcGeMatrix3d().makeTranslation(0, 200, 0))

    expect(a).not.toBe(template)
    expect(b).not.toBe(template)
    expect(a).not.toBe(b)
    expect(template.renderSvg()).not.toContain('matrix(')
    expect(a.renderSvg()).toContain('100')
    expect(a.renderSvg()).not.toContain('200')
    expect(b.renderSvg()).toContain('200')
    expect(b.renderSvg()).not.toContain('100')
    expect(template.box.min.x).toBeCloseTo(0)
    expect(a.box.min.x).toBeCloseTo(100)
    expect(b.box.min.y).toBeCloseTo(200)
  })

  it('addChild keeps ATTRIBs under the INSERT group after inverse', () => {
    const blockGeom = new AcSvgLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 }
      ],
      defaultTraits(),
      ctx
    )
    const group = new AcSvgGroup([blockGeom])
    const attrib = new AcSvgLine(
      [
        { x: 50, y: 0, z: 0 },
        { x: 60, y: 0, z: 0 }
      ],
      defaultTraits(),
      ctx
    )
    // Cache path: ATTRIB is drawn in WCS, then inverse of INSERT is applied
    // before addChild so it lives in block-local space.
    attrib.applyMatrix(new AcGeMatrix3d().makeTranslation(-40, 0, 0))
    group.addChild(attrib)
    group.applyMatrix(new AcGeMatrix3d().makeTranslation(100, 0, 0))

    expect(group.childCount).toBe(2)
    const svg = group.renderSvg()
    expect(svg).toContain('matrix(')
    expect(svg).toContain('100')
    // Nested child transform should still be present inside the group.
    expect(svg).toContain('-40')
    expect(group.box.min.x).toBeCloseTo(100)
    expect(group.box.max.x).toBeCloseTo(120)
  })

  it('export prefers explicit roots over polluted internal entity list', () => {
    const renderer = new AcSvgRenderer()
    const template = renderer.lines([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 }
    ])
    const placed = template.fastDeepClone()
    placed.applyMatrix(new AcGeMatrix3d().makeTranslation(25, 0, 0))

    const fromEntities = renderer.export()
    expect(fromEntities).not.toContain('25')

    const fromRoots = renderer.export([placed])
    expect(fromRoots).toContain('25')
    expect(fromRoots).toContain('matrix(')
  })
})
