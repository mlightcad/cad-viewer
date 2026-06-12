import { AcGeArea2d, AcGePoint2d } from '@mlightcad/data-model'

import { expectWcsBboxCloseTo } from './helpers/expectWcsBbox'
import { AcTrPolygon } from '../src/object/AcTrPolygon'
import { AcTrRenderContext } from '../src/renderer/AcTrRenderContext'
import { AcTrSubEntityTraitsUtil } from '../src/util'

const defaultTraits = AcTrSubEntityTraitsUtil.createDefaultTraits()

function createRectangularArea(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): AcGeArea2d {
  const loop = [
    new AcGePoint2d(minX, minY),
    new AcGePoint2d(maxX, minY),
    new AcGePoint2d(maxX, maxY),
    new AcGePoint2d(minX, maxY)
  ]

  return {
    getPoints: () => [loop],
    buildHierarchy: () => ({
      children: [{ index: 0, children: [] }]
    })
  } as unknown as AcGeArea2d
}

describe('AcTrPolygon wcsBbox', () => {
  it('stores the filled hatch bounds in wcsBbox', () => {
    const polygon = new AcTrPolygon(
      createRectangularArea(5, 10, 25, 30),
      defaultTraits,
      new AcTrRenderContext()
    )

    expectWcsBboxCloseTo(polygon.wcsBbox, [5, 10, 0], [25, 30, 0])
  })
})
