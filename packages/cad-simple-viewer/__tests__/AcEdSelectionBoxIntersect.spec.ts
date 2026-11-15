import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbPolyline,
  AcDbText,
  AcGeBox2d,
  AcGePoint2d,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  acedBlockReferenceIntersectsSelectionBox,
  acedLineSegmentIntersectsBox2d,
  acedNeedsCrossingGeometryRefine
} from '../src/editor/view/AcEdSelectionBoxIntersect'

describe('acedLineSegmentIntersectsBox2d', () => {
  const box = new AcGeBox2d({ x: 0, y: 0 }, { x: 10, y: 10 })

  it('hits when an endpoint lies inside the box', () => {
    expect(
      acedLineSegmentIntersectsBox2d(
        { x: 5, y: 5, z: 0 },
        { x: 20, y: 20, z: 0 },
        box
      )
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

describe('acedBlockReferenceIntersectsSelectionBox', () => {
  function setup(blockName: string) {
    const db = new AcDbDatabase()
    db.createDefaultData()

    const frameBlock = new AcDbBlockTableRecord()
    frameBlock.name = blockName
    db.tables.blockTable.add(frameBlock)

    // Title-sheet border: closed 100x100 polyline with an empty interior.
    const border = new AcDbPolyline()
    border.addVertexAt(0, new AcGePoint2d(0, 0))
    border.addVertexAt(1, new AcGePoint2d(100, 0))
    border.addVertexAt(2, new AcGePoint2d(100, 100))
    border.addVertexAt(3, new AcGePoint2d(0, 100))
    border.closed = true
    frameBlock.appendEntity(border)

    const ref = new AcDbBlockReference(blockName)
    db.tables.blockTable.modelSpace.appendEntity(ref)
    return { db, ref, border, frameBlock }
  }

  function childOf(
    id: string,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ) {
    return { id, minX, minY, maxX, maxY }
  }

  it('rejects a crossing box inside the empty interior of a frame block', () => {
    const { ref, border } = setup('FRAME_INTERIOR')
    const children = [childOf(border.objectId, 0, 0, 100, 100)]
    const pick = new AcGeBox2d({ x: 40, y: 40 }, { x: 60, y: 60 })
    expect(acedBlockReferenceIntersectsSelectionBox(ref, children, pick)).toBe(
      false
    )
  })

  it('accepts a crossing box that touches the frame border', () => {
    const { ref, border } = setup('FRAME_EDGE')
    const children = [childOf(border.objectId, 0, 0, 100, 100)]
    const pick = new AcGeBox2d({ x: 90, y: 40 }, { x: 110, y: 60 })
    expect(acedBlockReferenceIntersectsSelectionBox(ref, children, pick)).toBe(
      true
    )
  })

  it('maps sub-entity geometry through the INSERT transform', () => {
    const { ref, border } = setup('FRAME_SCALED')
    ref.position = new AcGePoint3d(1000, 0, 0)
    ref.scaleFactors = new AcGePoint3d(2, 2, 1)
    const children = [childOf(border.objectId, 1000, 0, 1200, 200)]
    // Interior of the transformed frame (1000..1200).
    expect(
      acedBlockReferenceIntersectsSelectionBox(
        ref,
        children,
        new AcGeBox2d({ x: 1050, y: 50 }, { x: 1150, y: 150 })
      )
    ).toBe(false)
    // Crosses the right edge at x=1200; the untransformed edge (x=100) would miss.
    expect(
      acedBlockReferenceIntersectsSelectionBox(
        ref,
        children,
        new AcGeBox2d({ x: 1190, y: 50 }, { x: 1210, y: 150 })
      )
    ).toBe(true)
  })

  it('accepts a crossed text child (no curve primitives)', () => {
    const { ref, border, frameBlock } = setup('FRAME_TEXT')
    const text = new AcDbText()
    text.textString = 'TITLE'
    text.position = new AcGePoint3d(80, 5, 0)
    text.height = 2
    frameBlock.appendEntity(text)
    const children = [
      childOf(border.objectId, 0, 0, 100, 100),
      childOf(text.objectId, 80, 5, 90, 7)
    ]
    const pick = new AcGeBox2d({ x: 82, y: 4 }, { x: 84, y: 8 })
    expect(acedBlockReferenceIntersectsSelectionBox(ref, children, pick)).toBe(
      true
    )
  })

  it('keeps the hit when a child cannot be resolved', () => {
    const { ref } = setup('FRAME_UNKNOWN')
    const children = [childOf('missing-id', 0, 0, 100, 100)]
    const pick = new AcGeBox2d({ x: 40, y: 40 }, { x: 60, y: 60 })
    expect(acedBlockReferenceIntersectsSelectionBox(ref, children, pick)).toBe(
      true
    )
  })
})
