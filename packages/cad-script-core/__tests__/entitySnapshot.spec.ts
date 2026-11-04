import {
  AcCmColor,
  AcCmColorMethod,
  AcDbAlignedDimension,
  AcDbArc,
  AcDbArcDimension,
  AcDbAttribute,
  AcDbBlockReference,
  AcDbCircle,
  AcDbDatabase,
  AcDbEllipse,
  AcDbEntity,
  AcDbHatch,
  AcDbLayerTableRecord,
  AcDbLine,
  AcDbMText,
  AcDbOrdinateDimension,
  AcDbPolyline,
  AcDbSpline,
  AcDbTable,
  AcDbText,
  AcGePoint2d,
  AcGePoint3d,
  AcGePolyline2d,
  AcGeVector3d
} from '@mlightcad/data-model'

import { createCadMeasure } from '../src/script/createCadMeasure'
import {
  openEntityFilterView,
  toEntitySnapshot
} from '../src/script/entitySnapshot'

type SnapshotLikePoint = { x: number; y: number; z: number }

const round = (value: number) => Math.round(value * 1e6) / 1e6

const project = (point: SnapshotLikePoint | undefined) =>
  point ? [round(point.x), round(point.y)] : undefined

describe('entity snapshots', () => {
  let db: AcDbDatabase

  /** Appends an entity to model space so live getters can resolve. */
  const add = <T extends AcDbEntity>(entity: T): T => {
    db.tables.blockTable.modelSpace.appendEntity(entity)
    return entity
  }

  /** Reads the geometry of an entity that is already in the database. */
  const geometryOf = (entity: AcDbEntity): Record<string, unknown> => {
    const snapshot = toEntitySnapshot(entity)
    expect(snapshot.geometry).toBeDefined()
    return snapshot.geometry as Record<string, unknown>
  }

  beforeEach(() => {
    db = new AcDbDatabase()
  })

  test('copies ByLayer display properties without RGB', () => {
    const layer = new AcDbLayerTableRecord({ name: 'Walls' })
    layer.color = new AcCmColor(1)
    db.tables.layerTable.add(layer)
    const line = new AcDbLine(
      new AcGePoint3d(0, 0, 0),
      new AcGePoint3d(10, 0, 0)
    )
    line.layer = 'Walls'
    add(line)

    const snapshot = toEntitySnapshot(line)

    expect(snapshot.color?.isByLayer).toBe(true)
    expect(snapshot.color?.red).toBeUndefined()
    expect(snapshot.lineType).toBe('ByLayer')
    expect(typeof snapshot.lineWeight).toBe('number')
    expect(snapshot.linetypeScale).toBe(1)
    expect(snapshot.visibility).toBe(true)
    expect(snapshot.transparency?.isByLayer).toBe(true)
    expect(snapshot.resolvedColor?.red).toBeDefined()
    expect(snapshot.resolvedColor?.green).toBeDefined()
    expect(snapshot.resolvedColor?.blue).toBeDefined()
  })

  test('keeps explicit RGB colors', () => {
    const circle = add(new AcDbCircle(new AcGePoint3d(0, 0, 0), 5))
    circle.color = new AcCmColor().setRGB(10, 20, 30)

    const snapshot = toEntitySnapshot(circle)

    expect(snapshot.color).toMatchObject({
      red: 10,
      green: 20,
      blue: 30,
      isByColor: true
    })
    expect(snapshot.color?.hex).toBe('0x0A141E')
  })

  test('drops the inherited-color RGB that AcCmColor leaks', () => {
    // `AcCmColor.RGB` returns the raw stored value for ByLayer / ByBlock, so a
    // ByLayer color exposes RGB `0x000100` and a bogus `0x000100` hex.
    const line = add(
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 0, 0))
    )
    line.color = new AcCmColor().setByLayer()

    const snapshot = toEntitySnapshot(line)

    expect(snapshot.color?.isByLayer).toBe(true)
    expect(snapshot.color?.red).toBeUndefined()
    expect(snapshot.color?.hex).toBeUndefined()
    expect(snapshot.color?.colorIndex).toBeUndefined()
  })

  test('keeps the ACI index of a palette color', () => {
    const line = add(
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 0, 0))
    )
    line.color = new AcCmColor(AcCmColorMethod.ByACI, 1)

    const snapshot = toEntitySnapshot(line)

    expect(snapshot.color?.isByACI).toBe(true)
    expect(snapshot.color?.colorIndex).toBe(1)
    expect(snapshot.color?.hex).toBe('0xFF0000')
  })

  test('reads display properties lazily inside a filter view', () => {
    const line = add(
      new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(1, 0, 0))
    )

    const view = openEntityFilterView(line)
    expect(view.value.type).toBe('Line')
    expect(view.value.color?.isByLayer).toBe(true)
    const geometry = view.value.geometry
    const lineType = view.value.lineType
    view.release()

    // Cached plain values survive release; the live entity is not retained.
    expect(lineType).toBe('ByLayer')
    expect(geometry).toBeDefined()
    expect(() => view.value.resolvedColor).toThrow()
  })

  test('enriches line geometry', () => {
    const geometry = geometryOf(
      add(new AcDbLine(new AcGePoint3d(0, 0, 0), new AcGePoint3d(3, 4, 0)))
    )

    expect(geometry.length).toBe(5)
    expect(project(geometry.midPoint as SnapshotLikePoint)).toEqual([1.5, 2])
    expect(geometry.direction).toMatchObject({ x: 0.6, y: 0.8, z: 0 })
  })

  test('enriches circle and arc geometry', () => {
    const circle = geometryOf(add(new AcDbCircle(new AcGePoint3d(0, 0, 0), 5)))
    expect(circle.area).toBeCloseTo(Math.PI * 25)
    expect(circle.circumference).toBeCloseTo(2 * Math.PI * 5)

    const arc = geometryOf(
      add(new AcDbArc(new AcGePoint3d(0, 0, 0), 2, 0, Math.PI / 2))
    )
    expect(arc.length).toBeCloseTo(Math.PI)
    expect(arc.startAngleDeg).toBe(0)
    expect(arc.endAngleDeg).toBeCloseTo(90)
    expect(project(arc.startPoint as SnapshotLikePoint)).toEqual([2, 0])
    expect(project(arc.midPoint as SnapshotLikePoint)).toEqual([
      1.414214, 1.414214
    ])
  })

  test('enriches ellipse geometry', () => {
    const geometry = geometryOf(
      add(
        new AcDbEllipse(
          new AcGePoint3d(0, 0, 0),
          new AcGeVector3d(0, 0, 1),
          new AcGeVector3d(1, 0, 0),
          4,
          2,
          0,
          Math.PI * 2
        )
      )
    )

    expect(geometry.majorRadius).toBe(4)
    expect(geometry.minorRadius).toBe(2)
    expect(geometry.isCircular).toBe(false)
  })

  test('reports polyline length and area', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0), 0, 0, 0)
    polyline.addVertexAt(1, new AcGePoint2d(10, 0), 0, 0, 0)
    polyline.addVertexAt(2, new AcGePoint2d(10, 10), 0, 0, 0)
    polyline.addVertexAt(3, new AcGePoint2d(0, 10), 0, 0, 0)
    polyline.closed = true

    const geometry = geometryOf(add(polyline))

    expect(geometry.hasBulges).toBe(false)
    expect(geometry.hasWidths).toBe(false)
    expect(geometry.closed).toBe(true)
    expect(geometry.vertices).toHaveLength(4)
    expect(
      (geometry.vertices as Array<{ x: number; y: number }>)[1]
    ).toMatchObject({ x: 10, y: 0 })
    expect(geometry.length).toBeCloseTo(40)
    expect(geometry.area).toBeCloseTo(100)
  })

  test('reports polyline bulge data', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0), 0.5)
    polyline.addVertexAt(1, new AcGePoint2d(10, 0), 0)

    const geometry = geometryOf(add(polyline))

    expect(geometry.hasBulges).toBe(true)
    expect((geometry.vertices as Array<{ bulge?: number }>)[0].bulge).toBe(0.5)
    expect((geometry.bulges as number[])[0]).toBe(0.5)
  })

  test('reads spline control data', () => {
    const geometry = geometryOf(
      add(
        new AcDbSpline(
          [
            new AcGePoint3d(0, 0, 0),
            new AcGePoint3d(1, 2, 0),
            new AcGePoint3d(2, -2, 0),
            new AcGePoint3d(3, 0, 0)
          ],
          [0, 0, 0, 0, 1, 1, 1, 1],
          undefined,
          3
        )
      )
    )

    expect(geometry.degree).toBe(3)
    expect((geometry.controlPoints as unknown[]).length).toBeGreaterThanOrEqual(
      4
    )
    expect(typeof geometry.length).toBe('number')
    expect(geometry.isControlPointSpline).toBe(true)
  })

  test('strips MTEXT control codes and keeps layout fields', () => {
    const mtext = new AcDbMText()
    mtext.contents = '\\fSimSun|b0|i0;Hello\\PPipe 42'
    mtext.location = new AcGePoint3d(1, 2, 0)
    mtext.height = 2.5
    mtext.width = 30

    const geometry = geometryOf(add(mtext))

    expect(geometry.plainText).toBe('Hello\nPipe 42')
    expect(geometry.text).toContain('\\P')
    expect(geometry.height).toBe(2.5)
    expect(project(geometry.position as SnapshotLikePoint)).toEqual([1, 2])
  })

  test('reads text alignment fields', () => {
    const text = new AcDbText()
    text.position = new AcGePoint3d(0, 0, 0)
    text.alignmentPoint = new AcGePoint3d(5, 5, 0)
    text.textString = 'PLAN'
    text.height = 1
    text.widthFactor = 0.8

    const geometry = geometryOf(add(text))

    expect(geometry.text).toBe('PLAN')
    expect(geometry.hasAlignmentPoint).toBe(true)
    expect(project(geometry.alignmentPoint as SnapshotLikePoint)).toEqual([
      5, 5
    ])
    expect(geometry.widthFactor).toBe(0.8)
  })

  test('reads block reference attributes and transform', () => {
    const insert = new AcDbBlockReference('B1')
    insert.position = new AcGePoint3d(2, 3, 0)
    const attribute = new AcDbAttribute()
    attribute.tag = 'TAG1'
    attribute.textString = 'VALUE'
    attribute.position = new AcGePoint3d(4, 5, 0)
    insert.appendAttributes(attribute)

    const geometry = geometryOf(add(insert))

    expect(geometry.name).toBe('B1')
    expect(geometry.isDynamicBlock).toBe(false)
    expect((geometry.attributes as Array<{ tag: string }>)[0].tag).toBe('TAG1')
    expect((geometry.blockTransform as number[]).length).toBe(16)
    expect(geometry.rowCount).toBe(1)
  })

  test('reads table cells, row heights and column widths', () => {
    const table = new AcDbTable('T1', 2, 2)
    table.setTextString(0, 0, 'A')
    table.setTextString(0, 1, 'B')
    table.setTextString(1, 0, 'C')
    table.setTextString(1, 1, 'D')

    const geometry = geometryOf(add(table))

    expect(geometry.cells).toEqual([
      ['A', 'B'],
      ['C', 'D']
    ])
    expect((geometry.rowHeights as number[]).length).toBe(2)
    expect((geometry.columnWidths as number[]).length).toBe(2)
  })

  test('rebuilds hatch boundary loops', () => {
    const hatch = add(new AcDbHatch())
    hatch.add(
      new AcGePolyline2d(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 }
        ],
        true
      )
    )

    const geometry = geometryOf(hatch)
    const loops = geometry.loops as Array<{
      closed: boolean
      points: unknown[]
      length: number
    }>

    expect(loops).toHaveLength(1)
    expect(loops[0].closed).toBe(true)
    expect(loops[0].points.length).toBeGreaterThanOrEqual(3)
    expect(loops[0].length).toBeCloseTo(40)
    expect(geometry.area).toBeCloseTo(100)
    expect(geometry.isHatch).toBe(true)
  })

  test('computes a missing dimension measurement', () => {
    const dimension = add(
      new AcDbAlignedDimension(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(3, 4, 0),
        new AcGePoint3d(1.5, 2, 0)
      )
    )
    dimension.measurement = undefined

    const geometry = geometryOf(dimension)

    expect(geometry.measurement).toBeCloseTo(5)
    expect(geometry.dimensionType).toBeDefined()
  })

  test('measures arc length for an arc dimension without a stored value', () => {
    // A 90° arc of radius 2: the sweep is π/2 radians and the measured value
    // is the arc length, not the sweep.
    const dimension = add(
      new AcDbArcDimension(
        new AcGePoint3d(0, 0, 0),
        new AcGePoint3d(2, 0, 0),
        new AcGePoint3d(0, 2, 0),
        new AcGePoint3d(2, 2, 0)
      )
    )
    dimension.measurement = undefined

    const geometry = geometryOf(dimension)

    expect(geometry.measurement).toBeCloseTo(Math.PI)
  })

  test('keeps the signed distance of an ordinate dimension', () => {
    const dimension = add(
      new AcDbOrdinateDimension(
        new AcGePoint3d(0, 3, 0),
        new AcGePoint3d(4, 3, 0)
      )
    )
    // Ordinate measures defining - origin along the chosen axis. The ordinate
    // value is signed, so a datum above the measured point reports negative.
    dimension.origin = new AcGePoint3d(0, 5, 0)
    dimension.measurement = undefined

    const geometry = geometryOf(dimension)

    expect(geometry.measurement).toBeCloseTo(-2)
  })

  test('measures area through cad.measure.area', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0))
    polyline.addVertexAt(1, new AcGePoint2d(10, 0))
    polyline.addVertexAt(2, new AcGePoint2d(10, 5))
    polyline.addVertexAt(3, new AcGePoint2d(0, 5))
    polyline.closed = true
    const snapshot = toEntitySnapshot(add(polyline))

    const measure = createCadMeasure(id =>
      id === snapshot.id ? snapshot : undefined
    )

    expect(measure.area(snapshot.id)).toBeCloseTo(50)
    expect(measure.length(snapshot.id)).toBeCloseTo(30)
  })

  test('reports no area for an open polyline', () => {
    const polyline = new AcDbPolyline()
    polyline.addVertexAt(0, new AcGePoint2d(0, 0))
    polyline.addVertexAt(1, new AcGePoint2d(10, 0))
    polyline.addVertexAt(2, new AcGePoint2d(10, 5))
    const snapshot = toEntitySnapshot(add(polyline))

    const measure = createCadMeasure(id =>
      id === snapshot.id ? snapshot : undefined
    )

    expect(measure.area(snapshot.id)).toBe(0)
  })
})
