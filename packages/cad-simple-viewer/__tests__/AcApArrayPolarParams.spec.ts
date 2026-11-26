import { AcGePoint3d } from '@mlightcad/data-model'

import { acapBuildPolarArrayParameters } from '../src/command/modify/array/AcApArrayPolarParams'

describe('acapBuildPolarArrayParameters', () => {
  const center = new AcGePoint3d(0, 0, 0)
  const basePoint = new AcGePoint3d(10, 0, 0)

  it('converts fill angle from degrees to radians (90° → π/2)', () => {
    const params = acapBuildPolarArrayParameters({
      itemCount: 6,
      fillAngleDegrees: 90,
      rotateItems: false,
      center,
      basePoint
    })

    expect(params.fillAngle).toBeCloseTo(Math.PI / 2, 10)
    // Non-full-circle: angleBetween = fill / (n - 1)
    expect(params.angleBetweenItems).toBeCloseTo(Math.PI / 10, 10)

    const last = params.getItemTransform(
      params.getItemLocators().find(l => l.itemIndex === 5)!
    )
    // Item 5 sits at the 90° end of the fill arc: rotate (10, 0) about the
    // center by 5 × 18° → (0, 10).
    expect(last.elements[12]).toBeCloseTo(0, 5)
    expect(last.elements[13]).toBeCloseTo(10, 5)
  })

  it('uses equal spacing including wrap for a full 360° fill', () => {
    const params = acapBuildPolarArrayParameters({
      itemCount: 6,
      fillAngleDegrees: 360,
      rotateItems: false,
      center,
      basePoint
    })

    expect(params.fillAngle).toBeCloseTo(Math.PI * 2, 10)
    expect(params.angleBetweenItems).toBeCloseTo(Math.PI / 3, 10)
  })
})
