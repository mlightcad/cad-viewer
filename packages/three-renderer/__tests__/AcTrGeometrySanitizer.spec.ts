import {
  AcDbEntity,
  AcGeCircArc3d,
  AcGePoint3d,
  AcGeVector3d
} from '@mlightcad/data-model'

import { AcTrGeometrySanitizer } from '../src/util/AcTrGeometrySanitizer'

describe('AcTrGeometrySanitizer', () => {
  beforeEach(() => {
    AcTrGeometrySanitizer.resetDiagnosticsForTests()
  })

  it('repairs circular arcs with a degenerate reference vector', () => {
    const arc = new AcGeCircArc3d(
      new AcGePoint3d(10, 20, 0),
      5,
      0,
      Math.PI / 2,
      new AcGeVector3d(0, 0, 1),
      new AcGeVector3d(0, 0, 0)
    )

    const repaired = AcTrGeometrySanitizer.repairCircArc3d(arc)
    expect(repaired).not.toBeNull()
    expect(
      repaired!
        .getPoints(8)
        .every(point => AcTrGeometrySanitizer.isFinitePoint(point))
    ).toBe(true)
  })

  it('logs entity context when non-finite points are dropped', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const entity = {
      constructor: { typeName: 'ProxyEntity' },
      objectId: 'ABC123',
      layer: '0'
    } as unknown as AcDbEntity

    AcTrGeometrySanitizer.filterFinitePoints(
      [
        { x: 0, y: 0, z: 0 },
        { x: Number.NaN, y: 1, z: 0 }
      ],
      { currentDrawingEntity: entity }
    )

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('ProxyEntity ABC123')
    )
    warn.mockRestore()
  })
})
