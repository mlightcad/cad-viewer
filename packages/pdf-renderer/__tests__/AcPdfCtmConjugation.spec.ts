import { AcGeMatrix3d } from '@mlightcad/data-model'

import { AcPdfMatrixUtil } from '../src/renderer/AcPdfMatrixUtil'

function map(m: AcGeMatrix3d, x: number, y: number) {
  return AcPdfMatrixUtil.transformPoint(m, { x, y, z: 0 })
}

describe('PDF INSERT CTM conjugation', () => {
  it('page×insert equals conjugate(page,insert)×page', () => {
    const page = new AcGeMatrix3d().set(
      2.834645669291339,
      0,
      0,
      -2684.617821585384,
      0,
      2.834645669291339,
      0,
      1458.2324026025576,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    )
    const insert = new AcGeMatrix3d().set(
      0.189108,
      0,
      0,
      1325.7802918341,
      0,
      0.189108,
      0,
      -489.47606155596,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    )
    const conjugated = page
      .clone()
      .multiply(insert)
      .multiply(page.clone().invert())
    const right = page.clone().multiply(insert)
    const viaConj = conjugated.clone().multiply(page)
    const wrong = insert.clone().multiply(page)

    const r0 = map(right, 0, 0)
    const c0 = map(viaConj, 0, 0)
    const w0 = map(wrong, 0, 0)
    const rLocal = map(right, 10, 5)
    const cLocal = map(viaConj, 10, 5)

    expect(Math.hypot(r0.x - c0.x, r0.y - c0.y)).toBeLessThan(1e-6)
    expect(Math.hypot(rLocal.x - cLocal.x, rLocal.y - cLocal.y)).toBeLessThan(
      1e-6
    )
    expect(Math.hypot(r0.x - w0.x, r0.y - w0.y)).toBeGreaterThan(100)
  })
})
