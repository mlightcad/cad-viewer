import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { AcTrPoint } from '../src/object/AcTrPoint'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()
const dotStyle = { displayMode: 0, displaySize: 0 }
const crossStyle = { displayMode: 2, displaySize: 0 }

describe('AcTrPoint wcsBbox', () => {
  it('stores the point location in wcsBbox for dot display mode', () => {
    const point = new AcTrPoint(
      { x: 12, y: 34, z: 0 },
      defaultTraits,
      dotStyle,
      new AcTrRenderContext()
    )

    expectWcsBboxCloseTo(point.wcsBbox, [12, 34, 0], [12, 34, 0])
  })

  it('includes symbol geometry in wcsBbox for marker display mode', () => {
    const point = new AcTrPoint(
      { x: 100, y: 200, z: 0 },
      defaultTraits,
      crossStyle,
      new AcTrRenderContext()
    )

    expect(point.wcsBbox.isEmpty()).toBe(false)
    expect(point.wcsBbox.min.x).toBeLessThanOrEqual(100)
    expect(point.wcsBbox.max.x).toBeGreaterThanOrEqual(100)
    expect(point.wcsBbox.min.y).toBeLessThanOrEqual(200)
    expect(point.wcsBbox.max.y).toBeGreaterThanOrEqual(200)
  })
})
