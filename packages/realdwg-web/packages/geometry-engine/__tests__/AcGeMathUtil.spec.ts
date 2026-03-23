import { AcGeMathUtil } from '../src'

describe('Test AcGeMathUtil', () => {
  it('.isBetweenAngle checks angle between start and end angle correctly', () => {
    expect(
      AcGeMathUtil.isBetweenAngle(Math.PI / 4, 0, Math.PI / 2, false)
    ).toBeTruthy()
    expect(
      AcGeMathUtil.isBetweenAngle((Math.PI * 3) / 4, 0, Math.PI / 2, false)
    ).toBeFalsy()
    expect(
      AcGeMathUtil.isBetweenAngle(Math.PI / 2, 0, Math.PI, false)
    ).toBeTruthy()
    expect(
      AcGeMathUtil.isBetweenAngle((Math.PI * 3) / 2, 0, Math.PI, false)
    ).toBeFalsy()
    expect(
      AcGeMathUtil.isBetweenAngle(0, Math.PI, Math.PI / 2, false)
    ).toBeTruthy()
    expect(
      AcGeMathUtil.isBetweenAngle(
        (Math.PI * 3) / 4,
        Math.PI,
        Math.PI / 2,
        false
      )
    ).toBeFalsy()

    expect(
      AcGeMathUtil.isBetweenAngle(Math.PI / 4, 0, Math.PI / 2, true)
    ).toBeFalsy()
    expect(
      AcGeMathUtil.isBetweenAngle((Math.PI * 3) / 4, 0, Math.PI / 2, true)
    ).toBeTruthy()
    expect(
      AcGeMathUtil.isBetweenAngle(Math.PI / 2, 0, Math.PI, true)
    ).toBeFalsy()
    expect(
      AcGeMathUtil.isBetweenAngle((Math.PI * 3) / 2, 0, Math.PI, true)
    ).toBeTruthy()
    expect(
      AcGeMathUtil.isBetweenAngle(0, Math.PI, Math.PI / 2, true)
    ).toBeFalsy()
    expect(
      AcGeMathUtil.isBetweenAngle((Math.PI * 3) / 4, Math.PI, Math.PI / 2, true)
    ).toBeTruthy()
  })
})
