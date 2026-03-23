import { AcGeVector3d } from '../src'
import { AcGeCircArc3d, ORIGIN_POINT_3D } from '../src'

describe('Test AcGeCircArc3d', () => {
  it('computes length correctly', () => {
    const arc = new AcGeCircArc3d(
      ORIGIN_POINT_3D,
      1,
      0,
      Math.PI,
      AcGeVector3d.Z_AXIS,
      AcGeVector3d.X_AXIS
    )
    expect(arc.length).toBe(Math.PI)
  })
})
