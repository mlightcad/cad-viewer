import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbLine,
  AcDbPolyline,
  AcDbSolid,
  AcDbText,
  AcDbTrace,
  AcGeBox2d,
  AcGePoint2d,
  AcGePoint3d
} from '@mlightcad/data-model'

import {
  acedBlockReferenceIntersectsSelectionBox,
  acedEntityIntersectsSelectionBox,
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

  it('tests real geometry behind anonymous child boxes (wide polyline fill)', () => {
    // Real drawing: the frame's inner border is a wide polyline whose fill
    // band is indexed with an empty / missing id, which used to keep the
    // whole frame selected for any crossing box inside it.
    const { ref, border } = setup('FRAME_ANON')
    const children = [
      { minX: 0, minY: 0, maxX: 100, maxY: 100 } as unknown as ReturnType<
        typeof childOf
      >,
      childOf('', 0, 0, 100, 100)
    ]
    expect(
      acedBlockReferenceIntersectsSelectionBox(
        ref,
        children,
        new AcGeBox2d({ x: 40, y: 40 }, { x: 60, y: 60 })
      )
    ).toBe(false)
    expect(
      acedBlockReferenceIntersectsSelectionBox(
        ref,
        children,
        new AcGeBox2d({ x: 95, y: 40 }, { x: 105, y: 60 })
      )
    ).toBe(true)
    // Named child next to anonymous ones: still resolved and tested.
    expect(
      acedBlockReferenceIntersectsSelectionBox(
        ref,
        [...children, childOf(border.objectId, 0, 0, 100, 100)],
        new AcGeBox2d({ x: 40, y: 40 }, { x: 60, y: 60 })
      )
    ).toBe(false)
  })

  it('tests a frame drawn in a nested block through both transforms', () => {
    const { db, border } = setup('FRAME_NESTED_INNER')
    const outer = new AcDbBlockTableRecord()
    outer.name = 'FRAME_NESTED_OUTER'
    db.tables.blockTable.add(outer)
    const inner = new AcDbBlockReference('FRAME_NESTED_INNER')
    inner.position = new AcGePoint3d(10, 0, 0)
    outer.appendEntity(inner)
    const ref = new AcDbBlockReference('FRAME_NESTED_OUTER')
    ref.scaleFactors = new AcGePoint3d(2, 2, 1)
    db.tables.blockTable.modelSpace.appendEntity(ref)

    // Frame spans x 20..220, y 0..200 in WCS.
    const children = [childOf(border.objectId, 20, 0, 220, 200)]
    expect(
      acedBlockReferenceIntersectsSelectionBox(
        ref,
        children,
        new AcGeBox2d({ x: 100, y: 90 }, { x: 120, y: 110 })
      )
    ).toBe(false)
    expect(
      acedBlockReferenceIntersectsSelectionBox(
        ref,
        children,
        new AcGeBox2d({ x: 210, y: 90 }, { x: 230, y: 110 })
      )
    ).toBe(true)
  })

  it('hits a duplicate nested occurrence (#n gsMark)', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    const cell = new AcDbBlockTableRecord()
    cell.name = 'CELL_DUP'
    db.tables.blockTable.add(cell)
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 0, 0)
    )
    cell.appendEntity(line)
    const row = new AcDbBlockTableRecord()
    row.name = 'ROW_DUP'
    db.tables.blockTable.add(row)
    for (const x of [0, 100]) {
      const nested = new AcDbBlockReference('CELL_DUP')
      nested.position = new AcGePoint3d(x, 0, 0)
      row.appendEntity(nested)
    }
    const ref = new AcDbBlockReference('ROW_DUP')
    db.tables.blockTable.modelSpace.appendEntity(ref)

    const children = [childOf(`${line.objectId}#1`, 100, 0, 110, 0)]
    expect(
      acedBlockReferenceIntersectsSelectionBox(
        ref,
        children,
        new AcGeBox2d({ x: 104, y: -1 }, { x: 106, y: 1 })
      )
    ).toBe(true)
    expect(
      acedBlockReferenceIntersectsSelectionBox(
        ref,
        children,
        new AcGeBox2d({ x: 104, y: 1 }, { x: 106, y: 2 })
      )
    ).toBe(false)
  })

  it('selects a filled solid when the box sits inside its fill', () => {
    const { ref, frameBlock } = setup('FRAME_FILL')
    // Title strip filled with a 2D solid (AutoCAD vertex order 0,1,3,2).
    const solid = new AcDbSolid()
    solid.setPointAt(0, new AcGePoint3d(60, 0, 0))
    solid.setPointAt(1, new AcGePoint3d(100, 0, 0))
    solid.setPointAt(2, new AcGePoint3d(60, 20, 0))
    solid.setPointAt(3, new AcGePoint3d(100, 20, 0))
    frameBlock.appendEntity(solid)
    const children = [childOf(solid.objectId, 60, 0, 100, 20)]

    expect(
      acedBlockReferenceIntersectsSelectionBox(
        ref,
        children,
        new AcGeBox2d({ x: 70, y: 5 }, { x: 80, y: 15 })
      )
    ).toBe(true)
    // Child AABB overlaps, but the box is outside the fill.
    expect(
      acedBlockReferenceIntersectsSelectionBox(
        ref,
        children,
        new AcGeBox2d({ x: 50, y: 5 }, { x: 59, y: 15 })
      )
    ).toBe(false)
  })
})

describe('acedEntityIntersectsSelectionBox', () => {
  it('treats the inside of a filled area as a hit, the empty side as a miss', () => {
    const trace = new AcDbTrace()
    trace.setPointAt(0, new AcGePoint3d(0, 0, 0))
    trace.setPointAt(1, new AcGePoint3d(100, 0, 0))
    trace.setPointAt(2, new AcGePoint3d(0, 100, 0))
    trace.setPointAt(3, new AcGePoint3d(100, 100, 0))
    expect(
      acedEntityIntersectsSelectionBox(
        trace,
        new AcGeBox2d({ x: 40, y: 40 }, { x: 60, y: 60 })
      )
    ).toBe(true)
    expect(
      acedEntityIntersectsSelectionBox(
        trace,
        new AcGeBox2d({ x: 140, y: 40 }, { x: 160, y: 60 })
      )
    ).toBe(false)
  })

  it('still misses the empty interior of an unfilled closed polyline', () => {
    const border = new AcDbPolyline()
    border.addVertexAt(0, new AcGePoint2d(0, 0))
    border.addVertexAt(1, new AcGePoint2d(100, 0))
    border.addVertexAt(2, new AcGePoint2d(100, 100))
    border.addVertexAt(3, new AcGePoint2d(0, 100))
    border.closed = true
    expect(
      acedEntityIntersectsSelectionBox(
        border,
        new AcGeBox2d({ x: 40, y: 40 }, { x: 60, y: 60 })
      )
    ).toBe(false)
  })
})
