import { describe, it, expect } from 'vitest'
import {
  AcDbLine, AcDbArc, AcDbCircle, AcDbEllipse, AcDbPolyline,
  AcGePoint3d, AcGeVector3d, AcGePoint2d,
} from '@mlightcad/data-model'
import {
  offsetLine, offsetArc, offsetCircle, offsetEllipse, offsetPolyline, pickSide,
} from '../src/command/modify/AcApOffsetGeometry'

describe('offsetLine', () => {
  it('offsets a horizontal line upward by distance 2', () => {
    const line = new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0))
    const result = offsetLine(line, 2, 1)
    expect(result.startPoint.y).toBeCloseTo(2)
    expect(result.endPoint.y).toBeCloseTo(2)
    expect(result.startPoint.x).toBeCloseTo(0)
    expect(result.endPoint.x).toBeCloseTo(10)
  })
  it('offsets a horizontal line downward when side is -1', () => {
    const line = new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(10, 0, 0))
    const result = offsetLine(line, 2, -1)
    expect(result.startPoint.y).toBeCloseTo(-2)
    expect(result.endPoint.y).toBeCloseTo(-2)
  })
})
