import {
  AcDbArc,
  AcDbBlockReference,
  AcDbBlockTableRecord,
  AcDbCircle,
  AcDbDatabase,
  AcDbPolyline,
  AcGeCircArc2d,
  AcGeMatrix3d,
  AcGePoint2d,
  AcGePoint3d,
  AcGeVector3d
} from '@mlightcad/data-model'

import {
  isPlanSimilarity,
  lockCurvesFromEntity,
  lockCurvesInSpace,
  mapLockCurve,
  pickLockOnEntities,
  pointLiesOnCircle
} from '../src/command/measure/AcApMeasureArcLock'
import { resolveBlockSubEntity } from '../src/editor/input/AcEdOsnapCenterMarks'

describe('lockCurvesFromEntity', () => {
  it('returns a full circle for AcDbCircle', () => {
    const curves = lockCurvesFromEntity(
      new AcDbCircle(new AcGePoint3d(0, 0, 0), 10)
    )
    expect(curves).toHaveLength(1)
    expect(curves[0]!.center.x).toBeCloseTo(0)
    expect(curves[0]!.center.y).toBeCloseTo(0)
    expect(curves[0]!.radius).toBeCloseTo(10)
  })

  it('returns the drawn sweep for AcDbArc, not the complementary gap', () => {
    const curves = lockCurvesFromEntity(
      new AcDbArc(new AcGePoint3d(0, 0, 0), 10, 0, Math.PI / 2)
    )
    expect(curves).toHaveLength(1)
    expect(curves[0]!.radius).toBeCloseTo(10)
  })

  it('ignores straight polyline chords', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0), 0)
    polyline.addVertexAt(1, new AcGePoint2d(40, 0), 0)
    expect(lockCurvesFromEntity(polyline)).toHaveLength(0)
  })

  it('returns a bulge segment from a polyline', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(10, 0), Math.tan(Math.PI / 8))
    polyline.addVertexAt(1, new AcGePoint2d(0, 10), 0)
    const curves = lockCurvesFromEntity(polyline)
    expect(curves).toHaveLength(1)
    expect(curves[0]!.center.x).toBeCloseTo(0, 5)
    expect(curves[0]!.center.y).toBeCloseTo(0, 5)
    expect(curves[0]!.radius).toBeCloseTo(10, 5)
  })
})

describe('pickLockOnEntities', () => {
  const quarterArc = new AcDbArc(new AcGePoint3d(0, 0, 0), 10, 0, Math.PI / 2)

  it('locks onto a circle circumference', () => {
    const hit = pickLockOnEntities(
      [new AcDbCircle(new AcGePoint3d(0, 0, 0), 10)],
      { x: 10.2, y: 0, z: 0 },
      1
    )
    expect(hit?.geom).toEqual({ cx: 0, cy: 0, r: 10 })
  })

  it('locks onto the drawn arc, not the complementary sweep', () => {
    const hit = pickLockOnEntities(
      [quarterArc],
      { x: 7.071, y: 7.071, z: 0 },
      1
    )
    expect(hit?.geom.cx).toBeCloseTo(0)
    expect(hit?.geom.cy).toBeCloseTo(0)
    expect(hit?.geom.r).toBeCloseTo(10)
    expect(
      pickLockOnEntities([quarterArc], { x: -10, y: 0, z: 0 }, 1)
    ).toBeUndefined()
  })

  it('keeps nearest on the drawn stroke when a pick would project onto the complementary arc', () => {
    const hit = pickLockOnEntities([quarterArc], { x: 9, y: -1, z: 0 }, 2)
    expect(hit).toBeDefined()
    expect(hit!.nearest.y).toBeGreaterThanOrEqual(0)
    expect(hit!.nearest.x).toBeCloseTo(10, 1)
  })

  it('maps -Z extrusion OCS angles into WCS (X mirrored)', () => {
    const arc = new AcDbArc({ x: 0, y: 0, z: 0 }, 10, 0, Math.PI / 2, {
      x: 0,
      y: 0,
      z: -1
    })
    // Drawn stroke is Q2: (-10, 0) → (0, 10) through (−√2/2, √2/2).
    const hit = pickLockOnEntities([arc], { x: -7.071, y: 7.071, z: 0 }, 1)
    expect(hit?.geom.cx).toBeCloseTo(0)
    expect(hit?.geom.cy).toBeCloseTo(0)
    expect(hit?.geom.r).toBeCloseTo(10)
    // Naive startAngle/endAngle in world XY would lock the +Z quarter in Q1.
    expect(
      pickLockOnEntities([arc], { x: 7.071, y: 7.071, z: 0 }, 1)
    ).toBeUndefined()
  })

  it('locks onto a polyline bulge and ignores a far straight chord', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(10, 0), Math.tan(Math.PI / 8))
    polyline.addVertexAt(1, new AcGePoint2d(0, 10), 0)
    polyline.addVertexAt(2, new AcGePoint2d(80, 10), 0)

    expect(
      pickLockOnEntities([polyline], { x: 7.071, y: 7.071, z: 0 }, 1)?.geom
    ).toMatchObject({
      cx: expect.closeTo(0, 5),
      cy: expect.closeTo(0, 5),
      r: expect.closeTo(10, 5)
    })
    expect(
      pickLockOnEntities([polyline], { x: 50, y: 10, z: 0 }, 1)
    ).toBeUndefined()
  })

  it('at a shared bulge vertex, locks the arc the cursor is closer to', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0), -Math.tan(Math.PI / 16))
    polyline.addVertexAt(1, new AcGePoint2d(40, 0), 1)
    polyline.addVertexAt(2, new AcGePoint2d(50, 0))

    const first = new AcGeCircArc2d(
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      -Math.tan(Math.PI / 16)
    )
    const second = new AcGeCircArc2d({ x: 40, y: 0 }, { x: 50, y: 0 }, 1)
    const toward = (
      curve: AcGeCircArc2d,
      fromStart: boolean,
      dist: number
    ) => {
      const pts = curve.getPoints(16)
      const origin = fromStart ? pts[0]! : pts[pts.length - 1]!
      const inward = fromStart ? pts[1]! : pts[pts.length - 2]!
      const ix = inward.x - origin.x
      const iy = inward.y - origin.y
      const len = Math.hypot(ix, iy)
      return {
        x: origin.x + (ix / len) * dist,
        y: origin.y + (iy / len) * dist,
        z: 0
      }
    }

    expect(
      pickLockOnEntities([polyline], toward(first, false, 0.05), 2)?.geom.r
    ).toBeCloseTo(first.radius, 5)
    expect(
      pickLockOnEntities([polyline], toward(second, true, 0.05), 2)?.geom.r
    ).toBeCloseTo(second.radius, 5)
    // Exact vertex: distances tie; do not let the later segment win.
    expect(
      pickLockOnEntities([polyline], { x: 40, y: 0, z: 0 }, 2)?.geom.r
    ).toBeCloseTo(first.radius, 5)
    expect(
      pointLiesOnCircle(
        { x: 40, y: 0 },
        { cx: first.center.x, cy: first.center.y, r: first.radius }
      )
    ).toBe(true)
    expect(
      pointLiesOnCircle(
        { x: 40, y: 0 },
        { cx: second.center.x, cy: second.center.y, r: second.radius }
      )
    ).toBe(true)
  })
})

describe('mapLockCurve', () => {
  // Viewport-like similarity: scale 0.5, then shift by (100, 50).
  const toPaper = (p: { x: number; y: number }) => ({
    x: p.x * 0.5 + 100,
    y: p.y * 0.5 + 50
  })

  it('maps a full circle to a scaled full circle', () => {
    const [circle] = lockCurvesFromEntity(
      new AcDbCircle(new AcGePoint3d(10, 20, 0), 8)
    )
    const mapped = mapLockCurve(circle!, toPaper)!
    expect(mapped.center.x).toBeCloseTo(105)
    expect(mapped.center.y).toBeCloseTo(60)
    expect(mapped.radius).toBeCloseTo(4)
    expect(mapped.closed).toBe(true)
  })

  it('keeps the drawn side of an arc', () => {
    const [arc] = lockCurvesFromEntity(
      new AcDbArc(new AcGePoint3d(0, 0, 0), 10, 0, Math.PI / 2)
    )
    const mapped = mapLockCurve(arc!, toPaper)!
    expect(mapped.radius).toBeCloseTo(5)
    expect(mapped.midPoint.x).toBeCloseTo(toPaper(arc!.midPoint).x)
    expect(mapped.midPoint.y).toBeCloseTo(toPaper(arc!.midPoint).y)
  })
})

describe('lockCurvesInSpace', () => {
  /** Model space INSERT of a block holding `entity`, resolved like OSNAP. */
  function insertOf(
    entity: AcDbArc | AcDbCircle,
    setup: (ref: AcDbBlockReference) => void,
    name: string
  ) {
    const db = new AcDbDatabase()
    db.createDefaultData()
    const block = new AcDbBlockTableRecord()
    block.name = name
    db.tables.blockTable.add(block)
    block.appendEntity(entity)
    const ref = new AcDbBlockReference(name)
    setup(ref)
    db.tables.blockTable.modelSpace.appendEntity(ref)
    return resolveBlockSubEntity(ref, entity.objectId)!
  }

  it('returns local curves when there is no transform', () => {
    const circle = new AcDbCircle(new AcGePoint3d(1, 2, 0), 3)
    expect(lockCurvesInSpace(circle)[0]!.radius).toBeCloseTo(3)
  })

  it('maps a circle in a uniformly scaled, rotated INSERT', () => {
    const found = insertOf(
      new AcDbCircle(new AcGePoint3d(10, 0, 0), 5),
      ref => {
        ref.position = new AcGePoint3d(100, 50, 0)
        ref.scaleFactors = new AcGePoint3d(2, 2, 2)
        ref.rotation = Math.PI / 2
      },
      'ARC_LOCK_UNIFORM'
    )
    const [curve] = lockCurvesInSpace(found.entity, found.transform)
    expect(curve!.center.x).toBeCloseTo(100)
    expect(curve!.center.y).toBeCloseTo(70)
    expect(curve!.radius).toBeCloseTo(10)
  })

  it('keeps the drawn side of an arc in a mirrored INSERT', () => {
    const found = insertOf(
      new AcDbArc(new AcGePoint3d(0, 0, 0), 10, 0, Math.PI / 2),
      ref => {
        ref.scaleFactors = new AcGePoint3d(-1, 1, 1)
      },
      'ARC_LOCK_MIRROR'
    )
    const [curve] = lockCurvesInSpace(found.entity, found.transform)
    expect(curve!.radius).toBeCloseTo(10)
    expect(curve!.midPoint.x).toBeCloseTo(-10 * Math.SQRT1_2)
    expect(curve!.midPoint.y).toBeCloseTo(10 * Math.SQRT1_2)
  })

  it('maps through nested INSERTs', () => {
    const db = new AcDbDatabase()
    db.createDefaultData()
    const inner = new AcDbBlockTableRecord()
    inner.name = 'ARC_LOCK_INNER'
    db.tables.blockTable.add(inner)
    const circle = new AcDbCircle(new AcGePoint3d(0, 0, 0), 1)
    inner.appendEntity(circle)
    const outer = new AcDbBlockTableRecord()
    outer.name = 'ARC_LOCK_OUTER'
    db.tables.blockTable.add(outer)
    const nested = new AcDbBlockReference('ARC_LOCK_INNER')
    nested.position = new AcGePoint3d(5, 0, 0)
    nested.scaleFactors = new AcGePoint3d(3, 3, 3)
    outer.appendEntity(nested)
    const ref = new AcDbBlockReference('ARC_LOCK_OUTER')
    ref.position = new AcGePoint3d(0, 20, 0)
    ref.scaleFactors = new AcGePoint3d(2, 2, 2)
    db.tables.blockTable.modelSpace.appendEntity(ref)

    const found = resolveBlockSubEntity(ref, circle.objectId)!
    const [curve] = lockCurvesInSpace(found.entity, found.transform)
    expect(curve!.center.x).toBeCloseTo(10)
    expect(curve!.center.y).toBeCloseTo(20)
    expect(curve!.radius).toBeCloseTo(6)
  })

  it('does not lock when a non-uniform scale turns the circle into an ellipse', () => {
    const found = insertOf(
      new AcDbCircle(new AcGePoint3d(0, 0, 0), 5),
      ref => {
        ref.scaleFactors = new AcGePoint3d(2, 1, 1)
      },
      'ARC_LOCK_NON_UNIFORM'
    )
    expect(lockCurvesInSpace(found.entity, found.transform)).toHaveLength(0)
  })

  it('does not lock a circle in a tilted INSERT', () => {
    const found = insertOf(
      new AcDbCircle(new AcGePoint3d(0, 0, 0), 5),
      ref => {
        ref.normal = new AcGeVector3d(1, 0, 1).normalize()
      },
      'ARC_LOCK_TILTED'
    )
    expect(isPlanSimilarity(found.transform)).toBe(false)
    expect(lockCurvesInSpace(found.entity, found.transform)).toHaveLength(0)
  })

  it('accepts a -Z extrusion, which only mirrors the plan', () => {
    const m = new AcGeMatrix3d().setFromExtrusionDirection(
      new AcGeVector3d(0, 0, -1)
    )
    expect(isPlanSimilarity(m)).toBe(true)
  })
})
