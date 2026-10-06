import { AcGeBox2d } from '@mlightcad/data-model'

import {
  acedLineSegmentIntersectsBox2d,
  acedNeedsCrossingGeometryRefine
} from '../src/editor/view/AcEdSelectionBoxIntersect'

describe('acedLineSegmentIntersectsBox2d', () => {
  const box = new AcGeBox2d({ x: 0, y: 0 }, { x: 10, y: 10 })

  it('hits when an endpoint lies inside the box', () => {
    expect(
      acedLineSegmentIntersectsBox2d({ x: 5, y: 5, z: 0 }, { x: 20, y: 20, z: 0 }, box)
    ).toBe(true)
  })

  it('hits when the segment crosses a box edge', () => {
    expect(
      acedLineSegmentIntersectsBox2d(
        { x: -5, y: 5, z: 0 },
        { x: 15, y: 5, z: 0 },
        box
      )
    ).toBe(true)
  })

  it('misses a large closed frame when the pick box sits in empty interior', () => {
    // Outer rectangle edges around a 100x100 frame; pick box at center.
    const pick = new AcGeBox2d({ x: 40, y: 40 }, { x: 60, y: 60 })
    const edges = [
      [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0 }
      ],
      [
        { x: 100, y: 0, z: 0 },
        { x: 100, y: 100, z: 0 }
      ],
      [
        { x: 100, y: 100, z: 0 },
        { x: 0, y: 100, z: 0 }
      ],
      [
        { x: 0, y: 100, z: 0 },
        { x: 0, y: 0, z: 0 }
      ]
    ] as const
    for (const [a, b] of edges) {
      expect(acedLineSegmentIntersectsBox2d(a, b, pick)).toBe(false)
    }
  })
})

describe('acedNeedsCrossingGeometryRefine', () => {
  it('skips INSERT hits that already have child boxes', () => {
    expect(acedNeedsCrossingGeometryRefine({ children: [{ id: 'a' }] })).toBe(
      false
    )
  })

  it('refines plain root hits without children', () => {
    expect(acedNeedsCrossingGeometryRefine({})).toBe(true)
  })
})
