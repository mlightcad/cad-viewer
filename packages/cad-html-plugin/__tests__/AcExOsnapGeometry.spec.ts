import { AcDbArc, AcDbEllipse, AcDbOsnapMode } from '@mlightcad/data-model'

import { collectPrimitiveSnapCandidates } from '../src/AcExOsnapGeometry'

describe('collectPrimitiveSnapCandidates', () => {
  const modes = new Set([
    'endpoint',
    'midpoint',
    'center',
    'quadrant',
    'nearest'
  ] as const)

  it('snaps to circle center and quadrants', () => {
    const candidates = collectPrimitiveSnapCandidates(
      {
        kind: 'circle',
        layer: '0',
        cx: 5,
        cy: 5,
        r: 2,
        normalSign: 1
      },
      5.1,
      5.1,
      modes
    )
    expect(
      candidates.some(c => c.mode === 'center' && c.x === 5 && c.y === 5)
    ).toBe(true)
    expect(
      candidates.some(c => c.mode === 'quadrant' && c.x === 7 && c.y === 5)
    ).toBe(true)
  })

  it('snaps to arc endpoints and center', () => {
    const candidates = collectPrimitiveSnapCandidates(
      {
        kind: 'arc',
        layer: '0',
        cx: 0,
        cy: 0,
        r: 10,
        startAngle: 0,
        endAngle: Math.PI / 2,
        normalSign: 1
      },
      0.2,
      0.2,
      modes
    )
    expect(
      candidates.some(c => c.mode === 'endpoint' && c.x === 10 && c.y === 0)
    ).toBe(true)
    expect(candidates.some(c => c.mode === 'center')).toBe(true)
  })

  it('matches AcDbArc midpoint for +Z and -Z extrusion', () => {
    const dbMid = (normalZ: number) => {
      const arc = new AcDbArc({ x: 0, y: 0, z: 0 }, 10, 0, Math.PI / 2, {
        x: 0,
        y: 0,
        z: normalZ
      })
      const pts: { x: number; y: number; z: number }[] = []
      arc.subGetOsnapPoints(
        AcDbOsnapMode.MidPoint,
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        pts
      )
      return pts[0]!
    }

    for (const normalSign of [1, -1] as const) {
      const expected = dbMid(normalSign)
      const candidates = collectPrimitiveSnapCandidates(
        {
          kind: 'arc',
          layer: '0',
          cx: 0,
          cy: 0,
          r: 10,
          startAngle: 0,
          endAngle: Math.PI / 2,
          normalSign
        },
        expected.x,
        expected.y,
        new Set(['midpoint'])
      )
      const mid = candidates.find(c => c.mode === 'midpoint')
      expect(mid?.x).toBeCloseTo(expected.x, 10)
      expect(mid?.y).toBeCloseTo(expected.y, 10)
    }
  })

  it('matches AcDbEllipse midpoint for +Z and -Z extrusion', () => {
    const dbMid = (normalZ: number, majorX: number) => {
      const ell = new AcDbEllipse(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: normalZ },
        { x: majorX, y: 0, z: 0 },
        20,
        10,
        0,
        Math.PI / 2
      )
      const pts: { x: number; y: number; z: number }[] = []
      ell.subGetOsnapPoints(
        AcDbOsnapMode.MidPoint,
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        pts
      )
      return pts[0]!
    }

    for (const [normalSign, majorX] of [
      [1, 1],
      [-1, 1],
      [-1, -1]
    ] as const) {
      const expected = dbMid(normalSign, majorX)
      const candidates = collectPrimitiveSnapCandidates(
        {
          kind: 'ellipse',
          layer: '0',
          cx: 0,
          cy: 0,
          majorX,
          majorY: 0,
          majorR: 20,
          minorR: 10,
          startAngle: 0,
          endAngle: Math.PI / 2,
          closed: false,
          normalSign
        },
        expected.x,
        expected.y,
        new Set(['midpoint'])
      )
      const mid = candidates.find(c => c.mode === 'midpoint')
      expect(mid?.x).toBeCloseTo(expected.x, 10)
      expect(mid?.y).toBeCloseTo(expected.y, 10)
    }
  })

  it('finds nearest point on a line segment', () => {
    const candidates = collectPrimitiveSnapCandidates(
      {
        kind: 'line',
        layer: '0',
        x0: 0,
        y0: 0,
        x1: 10,
        y1: 0
      },
      4,
      1,
      new Set(['nearest'])
    )
    const near = candidates.find(c => c.mode === 'nearest')
    expect(near).toEqual({ x: 4, y: 0, mode: 'nearest' })
  })
})
