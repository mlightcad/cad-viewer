import { AcGeBox2d, AcGeMatrix3d } from '@mlightcad/data-model'

import { computeSvgViewBox, isUsableSvgBox } from '../src/AcSvgExtents'
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

function parseViewBox(svg: string) {
  const match = svg.match(/viewBox="([^"]+)"/)
  expect(match).toBeTruthy()
  const [x, y, width, height] = match![1].split(/\s+/).map(Number)
  return { x, y, width, height }
}

describe('computeSvgViewBox', () => {
  it('rejects empty and non-finite boxes', () => {
    expect(isUsableSvgBox(new AcGeBox2d())).toBe(false)
    const infinite = new AcGeBox2d()
    infinite.min.set(-Infinity, 0)
    infinite.max.set(1, 1)
    expect(isUsableSvgBox(infinite)).toBe(false)
  })

  it('drops outlier-scale AABBs so they cannot dominate the fit', () => {
    const site = new AcGeBox2d({ x: 0, y: 0 }, { x: 100, y: 50 })
    const poison = new AcGeBox2d(
      { x: -6.35e149, y: -2.94e149 },
      { x: 1.25e148, y: 1.25e148 }
    )
    const box = computeSvgViewBox([site, poison])
    expect(box.isEmpty()).toBe(false)
    expect(Math.abs(box.min.x)).toBeLessThan(1e10)
    expect(Math.abs(box.max.x)).toBeLessThan(1e10)
    expect(box.min.x).toBeCloseTo(0)
    expect(box.max.x).toBeCloseTo(100)
  })

  it('export viewBox ignores a poisoned entity.box while keeping finite geometry', () => {
    const renderer = new AcSvgRenderer()
    renderer.lines([
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 50, z: 0 }
    ])
    const poison = renderer.lines([
      { x: 10, y: 10, z: 0 },
      { x: 20, y: 20, z: 0 }
    ])
    poison.box.min.set(-6.356902157954437e149, -2.9415793123938943e149)
    poison.box.max.set(1.25311452211488e148, 1.24953229654678e148)

    const exported = renderer.export()
    const viewBox = parseViewBox(exported)
    expect(Math.abs(viewBox.x)).toBeLessThan(1e10)
    expect(Math.abs(viewBox.y)).toBeLessThan(1e10)
    expect(Math.abs(viewBox.width)).toBeLessThan(1e10)
    expect(Math.abs(viewBox.height)).toBeLessThan(1e10)
    expect(viewBox.width).toBeGreaterThan(100)
    expect(viewBox.width).toBeLessThan(200)
    // Root size must be percentage-based so Chrome scales to the viewport.
    expect(exported).toMatch(/width="100%"/)
    expect(exported).toMatch(/height="100%"/)
  })

  it('group construction skips non-finite child boxes', () => {
    const good = new AcSvgLine(
      [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 }
      ],
      defaultTraits(),
      ctx
    )
    const bad = new AcSvgLine(
      [
        { x: 1, y: 1, z: 0 },
        { x: 2, y: 2, z: 0 }
      ],
      defaultTraits(),
      ctx
    )
    bad.box.min.set(Number.POSITIVE_INFINITY, 0)
    bad.box.max.set(Number.POSITIVE_INFINITY, 1)

    const group = new AcSvgGroup([good, bad])
    expect(isUsableSvgBox(group.box)).toBe(true)
    expect(group.box.min.x).toBeCloseTo(0)
    expect(group.box.max.x).toBeCloseTo(10)

    group.applyMatrix(new AcGeMatrix3d().makeTranslation(5, 0, 0))
    expect(group.box.min.x).toBeCloseTo(5)
    expect(group.box.max.x).toBeCloseTo(15)
  })
})
