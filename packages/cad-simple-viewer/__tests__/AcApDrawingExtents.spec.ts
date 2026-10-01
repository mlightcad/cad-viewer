import { AcGeBox2d, AcGeBox3d, AcGePoint2d, AcGePoint3d } from '@mlightcad/data-model'

import {
  box3dToBox2d,
  resolveDrawingExtents
} from '../src/util/AcApDrawingExtents'

describe('resolveDrawingExtents', () => {
  it('prefers drawable scene extents over stale header EXTMIN/EXTMAX', () => {
    const scene = new AcGeBox2d(
      new AcGePoint2d(-765, -680),
      new AcGePoint2d(667, 506)
    )
    const header = new AcGeBox3d(
      new AcGePoint3d(-2669, -7979, 0),
      new AcGePoint3d(24573, 3859, 0)
    )

    const resolved = resolveDrawingExtents(
      { getDrawingExtents: () => scene },
      { extents: header }
    )

    expect(resolved).toBe(scene)
  })

  it('falls back to header extents when the scene has no geometry', () => {
    const header = new AcGeBox3d(
      new AcGePoint3d(10, 20, 0),
      new AcGePoint3d(30, 40, 0)
    )

    const resolved = resolveDrawingExtents(
      { getDrawingExtents: () => undefined },
      { extents: header }
    )

    expect(resolved).toEqual(box3dToBox2d(header))
  })

  it('returns undefined when both scene and header are empty', () => {
    const resolved = resolveDrawingExtents(
      { getDrawingExtents: () => new AcGeBox2d() },
      { extents: new AcGeBox3d() }
    )

    expect(resolved).toBeUndefined()
  })
})
