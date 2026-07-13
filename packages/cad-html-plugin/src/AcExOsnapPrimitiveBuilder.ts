/**
 * Builds {@link AcExOsnapCatalog} from an open `AcDbDatabase`.
 *
 * Walks layout block table records recursively, expands `AcDbBlockReference`
 * (INSERT) with full insertion transforms, and emits compact analytic primitives
 * for the offline HTML viewer. This path preserves circle/arc/ellipse/spline
 * definitions that would otherwise be lost after tessellation into line batches.
 *
 * @packageDocumentation
 */

import {
  AcDb2dPolyline,
  AcDb3dPolyline,
  AcDbArc,
  AcDbBlockReference,
  type AcDbBlockTableRecord,
  AcDbCircle,
  type AcDbDatabase,
  AcDbDimension,
  AcDbEllipse,
  AcDbEntity,
  AcDbFace,
  AcDbHatch,
  AcDbLeader,
  AcDbLine,
  AcDbMLeader,
  type AcDbMLeaderLeader,
  type AcDbMLeaderLine,
  AcDbMLine,
  AcDbMText,
  type AcDbObjectId,
  AcDbPoint,
  AcDbPolyline,
  AcDbRasterImage,
  AcDbRay,
  AcDbSpline,
  AcDbTable,
  AcDbText,
  AcDbTrace,
  AcDbXline,
  AcGeCircArc2d,
  AcGeEllipseArc2d,
  AcGeLine2d,
  AcGeLoop2d,
  type AcGeLoop2dType,
  type AcGeMatrix3d,
  type AcGePoint3dLike,
  AcGePolyline2d,
  AcGeTol,
  type AcGeVector3dLike,
  FLOAT_TOL,
  TAU
} from '@mlightcad/data-model'
import * as THREE from 'three'

import type {
  AcExOsnapArcPrimitive,
  AcExOsnapCatalog,
  AcExOsnapCirclePrimitive,
  AcExOsnapEllipsePrimitive,
  AcExOsnapLinePrimitive,
  AcExOsnapPrimitive,
  AcExOsnapSplinePrimitive
} from './AcExOsnapPrimitiveTypes'

/** Maps entity extrusion normal to arc/circle winding sign. @internal */
function normalSignFromVector(normal: AcGeVector3dLike): 1 | -1 {
  return normal.z >= 0 ? 1 : -1
}

/** Half-length used when exporting infinite rays/xlines as finite segments. @internal */
const INFINITE_LINE_HALF_LENGTH = 1_000_000

/** Applies a 4×4 layout/block matrix to a 3D point; returns XY. @internal */
function transformPoint(
  matrix: THREE.Matrix4,
  p: AcGePoint3dLike
): { x: number; y: number } {
  const v = new THREE.Vector3(p.x, p.y, p.z ?? 0).applyMatrix4(matrix)
  return { x: v.x, y: v.y }
}

/**
 * Converts an {@link AcGeMatrix3d} (or compatible matrix) to `THREE.Matrix4`.
 *
 * Block and dimension transforms from `@mlightcad/data-model` are `AcGeMatrix3d`
 * instances. They share column-major `elements` with Three.js but are not
 * `THREE.Matrix4` subclasses, so they must be copied before use with Three APIs
 * that rely on matrix type checks.
 *
 * @internal
 */
function acGeMatrix3dToThree(matrix: AcGeMatrix3d): THREE.Matrix4 {
  const e = matrix.elements
  return new THREE.Matrix4(
    e[0],
    e[4],
    e[8],
    e[12],
    e[1],
    e[5],
    e[9],
    e[13],
    e[2],
    e[6],
    e[10],
    e[14],
    e[3],
    e[7],
    e[11],
    e[15]
  )
}

/** Composes parent and child layout / INSERT / dimension-block transforms. @internal */
function composeTransforms(
  parent: THREE.Matrix4,
  child: AcGeMatrix3d
): THREE.Matrix4 {
  return new THREE.Matrix4().multiplyMatrices(
    parent,
    acGeMatrix3dToThree(child)
  )
}

/** Applies a 4×4 matrix to a direction vector (no translation); returns normalized XY. @internal */
function transformVector(
  matrix: THREE.Matrix4,
  v: AcGeVector3dLike
): { x: number; y: number } {
  const out = new THREE.Vector3(v.x, v.y, v.z ?? 0)
    .transformDirection(matrix)
    .normalize()
  return { x: out.x, y: out.y }
}

/**
 * Returns whether the XY scale factors of `matrix` are equal.
 *
 * Circles/arcs stay circular only under uniform XY scale; otherwise they are
 * exported as {@link AcExOsnapEllipsePrimitive}.
 *
 * @internal
 */
function scaleIsUniform(matrix: THREE.Matrix4): boolean {
  const sx = new THREE.Vector3(
    matrix.elements[0],
    matrix.elements[1],
    matrix.elements[2]
  ).length()
  const sy = new THREE.Vector3(
    matrix.elements[4],
    matrix.elements[5],
    matrix.elements[6]
  ).length()
  return AcGeTol.equal(sx, sy, FLOAT_TOL * Math.max(sx, sy, 1))
}

/**
 * Resolves the block table record (BTR) that owns a layout's geometry.
 *
 * {@link buildOsnapCatalog} walks this BTR recursively to emit analytic snap
 * primitives. Lookup tries, in order:
 *
 * 1. {@link AcDbBlockTable.getIdAt} with `layoutBtrId`
 * 2. Linear scan of the block table comparing {@link AcDbObjectId}
 * 3. Model-space BTR when `layoutBtrId` matches {@link AcDbBlockTable.modelSpace}
 *
 * @param database - Open drawing whose block table is searched.
 * @param layoutBtrId - Object id of the layout's owning block table record
 *   (same value stored on {@link AcExLayoutSnapshot.btrId}).
 * @returns The matching BTR, or `undefined` when no block can be resolved.
 * @internal
 */
function resolveLayoutBlock(
  database: AcDbDatabase,
  layoutBtrId: string
): AcDbBlockTableRecord | undefined {
  const direct = database.tables.blockTable.getIdAt(layoutBtrId)
  if (direct) {
    return direct
  }
  for (const block of database.tables.blockTable.newIterator()) {
    if (block.objectId === layoutBtrId) {
      return block
    }
  }
  const modelSpace = database.tables.blockTable.modelSpace
  if (modelSpace.objectId === layoutBtrId) {
    return modelSpace
  }
  return undefined
}

/**
 * Type guard for CAD line entities across `@mlightcad/data-model` versions.
 *
 * Prefer {@link AcDbLine} via `instanceof` when available. Some runtime builds
 * expose LINE entities with `type === 'LINE'` (or `'Line'`) and `startPoint` /
 * `endPoint` fields without registering the `AcDbLine` constructor, which would
 * otherwise be skipped during catalog export.
 *
 * @param entity - Candidate entity from a layout BTR iterator.
 * @returns `true` when the entity carries two geometric endpoints suitable for
 *   {@link AcExOsnapLinePrimitive} export.
 * @internal
 */
function isLineLikeEntity(entity: AcDbEntity): entity is AcDbEntity & {
  startPoint: AcGePoint3dLike
  endPoint: AcGePoint3dLike
} {
  if (entity instanceof AcDbLine) {
    return true
  }
  const candidate = entity as {
    type?: string
    startPoint?: AcGePoint3dLike
    endPoint?: AcGePoint3dLike
  }
  return (
    (candidate.type === 'LINE' || candidate.type === 'Line') &&
    candidate.startPoint != null &&
    candidate.endPoint != null
  )
}

/**
 * Appends one {@link AcExOsnapLinePrimitive} from a line-like database entity.
 *
 * Transforms {@link AcDbLine.startPoint} / {@link AcDbLine.endPoint} (or equivalent
 * duck-typed fields) into WCS via `matrix`, then delegates to {@link pushLine}.
 *
 * @param out - Primitive array mutated by {@link visitEntity}.
 * @param layer - Effective layer after block layer-0 inheritance.
 * @param matrix - Accumulated layout / INSERT transform.
 * @param entity - Line entity validated by {@link isLineLikeEntity}.
 * @internal
 */
function pushLineEntity(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  entity: AcDbEntity & {
    startPoint: AcGePoint3dLike
    endPoint: AcGePoint3dLike
  }
) {
  pushLine(out, layer, matrix, entity.startPoint, entity.endPoint)
}

/** Block reference shape used for recursive osnap traversal. @internal */
type AcExBlockReferenceLike = AcDbEntity & {
  blockTableRecord: AcDbBlockTableRecord | undefined
  blockName?: string
  getFullInsertionTransform(): AcGeMatrix3d
}

/** Dimension entity shape whose geometry lives in an anonymous block. @internal */
type AcExDimensionLike = AcDbDimension & {
  getFullDimBlockTransform(): AcGeMatrix3d
}

/**
 * Resolves the block table record referenced by an INSERT entity.
 *
 * Prefer {@link AcExBlockReferenceLike.blockTableRecord} when the entity is
 * database-backed; fall back to `blockName` on the export database.
 *
 * @internal
 */
function resolveBlockReferenceBlock(
  entity: AcExBlockReferenceLike,
  database: AcDbDatabase
): AcDbBlockTableRecord | undefined {
  return (
    entity.blockTableRecord ??
    (entity.blockName
      ? database.tables.blockTable.getAt(entity.blockName)
      : undefined)
  )
}

/**
 * Resolves the anonymous block referenced by a dimension entity.
 *
 * @internal
 */
function resolveDimensionBlock(
  entity: AcExDimensionLike,
  database: AcDbDatabase
): AcDbBlockTableRecord | undefined {
  const dimBlockId = entity.dimBlockId
  return dimBlockId ? database.tables.blockTable.getAt(dimBlockId) : undefined
}

/**
 * Resolves the anonymous block referenced by a table entity.
 *
 * Prefers {@link AcDbBlockReference.blockTableRecord}; falls back to
 * {@link AcDbTable.owningBlockRecordId} from imported DXF/DWG files.
 *
 * @internal
 */
function resolveTableBlock(
  entity: AcDbTable,
  database: AcDbDatabase
): AcDbBlockTableRecord | undefined {
  const asBlockRef = entity as unknown as AcExBlockReferenceLike
  const resolved = resolveBlockReferenceBlock(asBlockRef, database)
  if (resolved) {
    return resolved
  }
  const owningBlockId = entity.owningBlockRecordId
  return owningBlockId
    ? database.tables.blockTable.getAt(owningBlockId)
    : undefined
}

/** Returns the full INSERT transform for block/table entities. @internal */
function blockInsertTransform(entity: AcDbBlockReference): AcGeMatrix3d {
  return (
    entity as unknown as AcExBlockReferenceLike
  ).getFullInsertionTransform()
}

/** Returns whether a block table record contains at least one entity. @internal */
function blockHasEntities(block: AcDbBlockTableRecord): boolean {
  for (const _entity of block.newIterator()) {
    return true
  }
  return false
}

/**
 * Raster image shape used to read {@link AcDbRasterImage.boundaryPath}.
 * @internal
 */
type AcExRasterImageLike = AcDbRasterImage & {
  boundaryPath(): AcGePoint3dLike[]
}

/**
 * Detects block references across data-model versions (`AcDbBlockReference`,
 * `AcDbBlockReference2`, etc.) without relying on `instanceof`.
 *
 * @internal
 */
function isBlockReferenceEntity(
  entity: AcDbEntity
): entity is AcExBlockReferenceLike {
  return (
    typeof (entity as { getFullInsertionTransform?: unknown })
      .getFullInsertionTransform === 'function' && 'blockTableRecord' in entity
  )
}

/** Appends a WCS line primitive after transforming endpoints. @internal */
function pushLine(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  start: AcGePoint3dLike,
  end: AcGePoint3dLike
) {
  const a = transformPoint(matrix, start)
  const b = transformPoint(matrix, end)
  const prim: AcExOsnapLinePrimitive = {
    kind: 'line',
    layer,
    x0: a.x,
    y0: a.y,
    x1: b.x,
    y1: b.y
  }
  out.push(prim)
}

/**
 * Appends a long WCS line segment along a unit direction (ray or xline).
 *
 * @internal
 */
function pushDirectedLine(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  base: AcGePoint3dLike,
  unitDir: AcGeVector3dLike,
  bidirectional: boolean
) {
  const origin = transformPoint(matrix, base)
  const dir = transformVector(matrix, unitDir)
  const len = Math.hypot(dir.x, dir.y) || 1
  const ux = dir.x / len
  const uy = dir.y / len
  const half = INFINITE_LINE_HALF_LENGTH
  const x0 = bidirectional ? origin.x - ux * half : origin.x
  const y0 = bidirectional ? origin.y - uy * half : origin.y
  const x1 = origin.x + ux * half
  const y1 = origin.y + uy * half
  out.push({ kind: 'line', layer, x0, y0, x1, y1 })
}

/**
 * Appends line segments connecting an ordered vertex path.
 *
 * @internal
 */
function pushVertexPath(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  vertices: AcGePoint3dLike[],
  closed: boolean
) {
  if (vertices.length < 2) return
  const segmentCount = closed ? vertices.length : vertices.length - 1
  for (let i = 0; i < segmentCount; i++) {
    pushLine(
      out,
      layer,
      matrix,
      vertices[i]!,
      vertices[(i + 1) % vertices.length]!
    )
  }
}

/**
 * Builds the MLINE reference path (`startPosition` + segment vertices).
 *
 * Matches {@link AcDbMLine.subGetOsnapPoints}, which snaps to the center path
 * rather than offset style-element geometry.
 *
 * @internal
 */
function pushMLine(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  entity: AcDbMLine
) {
  const path: AcGePoint3dLike[] = [entity.startPosition]
  for (const segment of entity.segments) {
    path.push(segment.position)
  }
  pushVertexPath(out, layer, matrix, path, entity.closed)
}

/**
 * Resolves drawable leader-line vertices the same way as
 * `AcDbMLeader.getLeaderLineDrawPoints`.
 *
 * @internal
 */
function resolveMLeaderLineDrawPoints(
  entity: AcDbMLeader,
  leader: AcDbMLeaderLeader,
  line: AcDbMLeaderLine
): AcGePoint3dLike[] {
  if (line.vertices.length >= 2) {
    return line.vertices
  }
  if (line.vertices.length === 0) {
    return []
  }
  const start = line.vertices[0]!
  const end =
    leader.lastLeaderLinePoint ??
    leader.landingPoint ??
    entity.landingPoint ??
    entity.contentBasePosition
  if (!end) {
    return line.vertices
  }
  const dx = start.x - end.x
  const dy = start.y - end.y
  const dz = (start.z ?? 0) - (end.z ?? 0)
  if (Math.hypot(dx, dy, dz) <= FLOAT_TOL) {
    return line.vertices
  }
  return [start, end]
}

/**
 * Exports multileader leader segments and annotation anchor points.
 *
 * Leader geometry follows {@link AcDbMLeader.subGetOsnapPoints}; anchor points
 * mirror insertion snaps on MText/block content.
 *
 * @internal
 */
function pushMLeader(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  entity: AcDbMLeader
) {
  for (const leader of entity.leaders) {
    for (const line of leader.leaderLines) {
      const drawPoints = resolveMLeaderLineDrawPoints(entity, leader, line)
      pushVertexPath(out, layer, matrix, drawPoints, false)
    }
  }

  const pushAnchor = (point: AcGePoint3dLike | undefined) => {
    if (!point) return
    const p = transformPoint(matrix, point)
    out.push({ kind: 'point', layer, x: p.x, y: p.y })
  }

  pushAnchor(entity.contentBasePosition)
  pushAnchor(entity.mtextContent?.anchorPoint)
  pushAnchor(entity.blockContent?.position)
}

/**
 * Decomposes `AcDb2dPolyline` into line and arc primitives (legacy POLYLINE).
 *
 * @internal
 */
function push2dPolyline(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  entity: AcDb2dPolyline
) {
  const count = entity.numberOfVertices
  if (count < 2) return

  const elevation = entity.elevation
  const segmentCount = entity.closed ? count : count - 1
  for (let i = 0; i < segmentCount; i++) {
    const start2d = entity.getPointAt(i)
    const end2d = entity.getPointAt((i + 1) % count)
    const bulge = entity.getBulgeAt(i)
    const start = { x: start2d.x, y: start2d.y, z: elevation }
    const end = { x: end2d.x, y: end2d.y, z: elevation }
    if (AcGeTol.isPositive(Math.abs(bulge))) {
      const startW = transformPoint(matrix, start)
      const endW = transformPoint(matrix, end)
      const arc2d = new AcGeCircArc2d(startW, endW, bulge)
      const center = arc2d.center
      out.push({
        kind: 'arc',
        layer,
        cx: center.x,
        cy: center.y,
        r: arc2d.radius,
        startAngle: arc2d.startAngle,
        endAngle: arc2d.endAngle,
        normalSign: arc2d.clockwise ? -1 : 1
      })
    } else {
      pushLine(out, layer, matrix, start, end)
    }
  }
}

/** Appends a WCS circle primitive (uniform scale on radius). @internal */
function pushCircle(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  center: AcGePoint3dLike,
  radius: number,
  normal: AcGeVector3dLike
) {
  const c = transformPoint(matrix, center)
  const sx = new THREE.Vector3(
    matrix.elements[0],
    matrix.elements[1],
    matrix.elements[2]
  ).length()
  const prim: AcExOsnapCirclePrimitive = {
    kind: 'circle',
    layer,
    cx: c.x,
    cy: c.y,
    r: radius * sx,
    normalSign: normalSignFromVector(normal)
  }
  out.push(prim)
}

/** Appends a WCS arc primitive from `AcDbArc` (uniform XY scale). @internal */
function pushArc(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  entity: AcDbArc
) {
  const center = transformPoint(matrix, entity.center)
  const sx = new THREE.Vector3(
    matrix.elements[0],
    matrix.elements[1],
    matrix.elements[2]
  ).length()
  const prim: AcExOsnapArcPrimitive = {
    kind: 'arc',
    layer,
    cx: center.x,
    cy: center.y,
    r: entity.radius * sx,
    startAngle: entity.startAngle,
    endAngle: entity.endAngle,
    normalSign: normalSignFromVector(entity.normal)
  }
  out.push(prim)
}

/** Appends a WCS ellipse primitive from `AcDbEllipse`. @internal */
function pushEllipse(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  entity: AcDbEllipse
) {
  const center = transformPoint(matrix, entity.center)
  const geo = (entity as unknown as { _geo?: { majorAxis?: AcGeVector3dLike } })
    ._geo
  const majorAxis = geo?.majorAxis ?? { x: 1, y: 0, z: 0 }
  const axis = transformVector(matrix, majorAxis)
  const len = Math.hypot(axis.x, axis.y) || 1
  const sx = new THREE.Vector3(
    matrix.elements[0],
    matrix.elements[1],
    matrix.elements[2]
  ).length()
  const sy = new THREE.Vector3(
    matrix.elements[4],
    matrix.elements[5],
    matrix.elements[6]
  ).length()
  const prim: AcExOsnapEllipsePrimitive = {
    kind: 'ellipse',
    layer,
    cx: center.x,
    cy: center.y,
    majorX: axis.x / len,
    majorY: axis.y / len,
    majorR: entity.majorAxisRadius * sx,
    minorR: entity.minorAxisRadius * sy,
    startAngle: entity.startAngle,
    endAngle: entity.endAngle,
    closed: entity.closed,
    normalSign: normalSignFromVector(entity.normal)
  }
  out.push(prim)
}

/**
 * Appends a WCS spline primitive from `AcDbSpline` control/fit data.
 *
 * Reads internal `_geo` fields from the data model (control points, knots,
 * weights, degree). Skips the entity when no control points are available.
 *
 * @internal
 */
function pushSpline(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  entity: AcDbSpline
) {
  const geo = (
    entity as unknown as {
      _geo?: {
        degree?: number
        knots?: number[]
        weights?: number[]
        controlPoints?: AcGePoint3dLike[]
        fitPoints?: AcGePoint3dLike[]
        closed?: boolean
      }
    }
  )._geo
  if (!geo?.controlPoints?.length) return

  const controlPoints: number[] = []
  for (const cp of geo.controlPoints) {
    const p = transformPoint(matrix, cp)
    controlPoints.push(p.x, p.y)
  }

  const prim: AcExOsnapSplinePrimitive = {
    kind: 'spline',
    layer,
    controlPoints,
    degree: geo.degree ?? 3,
    knots: [...(geo.knots ?? [])],
    weights: [...(geo.weights ?? [])],
    closed: geo.closed ?? false
  }
  if (geo.fitPoints?.length) {
    prim.fitPoints = []
    for (const fp of geo.fitPoints) {
      const p = transformPoint(matrix, fp)
      prim.fitPoints.push(p.x, p.y)
    }
  }
  out.push(prim)
}

/**
 * Decomposes `AcDbPolyline` into line and arc primitives.
 *
 * Straight segments become {@link AcExOsnapLinePrimitive}; bulge segments are
 * converted with {@link AcGeCircArc2d} in WCS (endpoints transformed first so
 * rotation/translation of INSERT is respected; bulge is invariant under similarity).
 *
 * @internal
 */
function pushPolyline(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  entity: AcDbPolyline
) {
  const runtimeVertices = (
    entity as unknown as {
      _geo?: { vertices?: Array<{ x: number; y: number; bulge?: number }> }
    }
  )._geo?.vertices

  const vertices =
    runtimeVertices && runtimeVertices.length > 1
      ? runtimeVertices.map(v => ({ x: v.x, y: v.y, bulge: v.bulge }))
      : Array.from({ length: entity.numberOfVertices }, (_, i) => {
          const p = entity.getPoint2dAt(i)
          return { x: p.x, y: p.y, bulge: 0 as number | undefined }
        })

  const count = vertices.length
  if (count < 2) return

  const segmentCount = entity.closed ? count : count - 1
  for (let i = 0; i < segmentCount; i++) {
    const start = vertices[i]!
    const end = vertices[(i + 1) % count]!
    const bulge = start.bulge ?? 0
    if (AcGeTol.isPositive(Math.abs(bulge))) {
      const startW = transformPoint(matrix, { x: start.x, y: start.y, z: 0 })
      const endW = transformPoint(matrix, { x: end.x, y: end.y, z: 0 })
      const arc2d = new AcGeCircArc2d(startW, endW, bulge)
      const center = arc2d.center
      out.push({
        kind: 'arc',
        layer,
        cx: center.x,
        cy: center.y,
        r: arc2d.radius,
        startAngle: arc2d.startAngle,
        endAngle: arc2d.endAngle,
        normalSign: arc2d.clockwise ? -1 : 1
      })
    } else {
      pushLine(
        out,
        layer,
        matrix,
        { x: start.x, y: start.y, z: 0 },
        { x: end.x, y: end.y, z: 0 }
      )
    }
  }
}

/** Appends a WCS arc from a 2D circular arc at a fixed elevation. @internal */
function pushCircArc2dBoundary(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  arc: AcGeCircArc2d,
  elevation: number
) {
  if (scaleIsUniform(matrix)) {
    const center = transformPoint(matrix, {
      x: arc.center.x,
      y: arc.center.y,
      z: elevation
    })
    const sx = new THREE.Vector3(
      matrix.elements[0],
      matrix.elements[1],
      matrix.elements[2]
    ).length()
    out.push({
      kind: 'arc',
      layer,
      cx: center.x,
      cy: center.y,
      r: arc.radius * sx,
      startAngle: arc.startAngle,
      endAngle: arc.endAngle,
      normalSign: arc.clockwise ? -1 : 1
    })
    return
  }

  pushLine(
    out,
    layer,
    matrix,
    { x: arc.startPoint.x, y: arc.startPoint.y, z: elevation },
    { x: arc.endPoint.x, y: arc.endPoint.y, z: elevation }
  )
}

/** Appends a WCS ellipse arc from a 2D ellipse arc at a fixed elevation. @internal */
function pushEllipseArc2dBoundary(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  arc: AcGeEllipseArc2d,
  elevation: number
) {
  const center = transformPoint(matrix, {
    x: arc.center.x,
    y: arc.center.y,
    z: elevation
  })
  const majorDir = transformVector(matrix, {
    x: Math.cos(arc.rotation),
    y: Math.sin(arc.rotation),
    z: 0
  })
  const len = Math.hypot(majorDir.x, majorDir.y) || 1
  const sx = new THREE.Vector3(
    matrix.elements[0],
    matrix.elements[1],
    matrix.elements[2]
  ).length()
  const sy = new THREE.Vector3(
    matrix.elements[4],
    matrix.elements[5],
    matrix.elements[6]
  ).length()
  out.push({
    kind: 'ellipse',
    layer,
    cx: center.x,
    cy: center.y,
    majorX: majorDir.x / len,
    majorY: majorDir.y / len,
    majorR: arc.majorAxisRadius * sx,
    minorR: arc.minorAxisRadius * sy,
    startAngle: arc.startAngle,
    endAngle: arc.endAngle,
    closed: false,
    normalSign: arc.clockwise ? -1 : 1
  })
}

/**
 * Exports one hatch boundary polyline loop (bulge-aware).
 *
 * Matches {@link AcDbHatch.subGetOsnapPoints} boundary traversal.
 *
 * @internal
 */
function pushHatchPolyline2d(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  polyline: AcGePolyline2d,
  elevation: number
) {
  const vertexCount = polyline.numberOfVertices
  if (vertexCount < 2) return

  const segmentCount = polyline.closed ? vertexCount : vertexCount - 1
  for (let index = 0; index < segmentCount; index++) {
    const start = polyline.getPointAt(index)
    const end = polyline.getPointAt((index + 1) % vertexCount)
    const bulge = polyline.vertices[index]?.bulge ?? 0
    const start3 = { x: start.x, y: start.y, z: elevation }
    const end3 = { x: end.x, y: end.y, z: elevation }
    if (AcGeTol.isPositive(Math.abs(bulge))) {
      const startW = transformPoint(matrix, start3)
      const endW = transformPoint(matrix, end3)
      const arc2d = new AcGeCircArc2d(startW, endW, bulge)
      const center = arc2d.center
      out.push({
        kind: 'arc',
        layer,
        cx: center.x,
        cy: center.y,
        r: arc2d.radius,
        startAngle: arc2d.startAngle,
        endAngle: arc2d.endAngle,
        normalSign: arc2d.clockwise ? -1 : 1
      })
    } else {
      pushLine(out, layer, matrix, start3, end3)
    }
  }
}

/** Exports one hatch boundary loop (polyline or edge loop). @internal */
function pushHatchLoop(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  loop: AcGeLoop2dType,
  elevation: number
) {
  if (loop instanceof AcGePolyline2d) {
    pushHatchPolyline2d(out, layer, matrix, loop, elevation)
    return
  }

  if (loop instanceof AcGeLoop2d) {
    for (const curve of loop.curves) {
      if (curve instanceof AcGeLine2d) {
        pushLine(
          out,
          layer,
          matrix,
          {
            x: curve.startPoint.x,
            y: curve.startPoint.y,
            z: elevation
          },
          {
            x: curve.endPoint.x,
            y: curve.endPoint.y,
            z: elevation
          }
        )
      } else if (curve instanceof AcGeCircArc2d) {
        pushCircArc2dBoundary(out, layer, matrix, curve, elevation)
      } else if (curve instanceof AcGeEllipseArc2d) {
        pushEllipseArc2dBoundary(out, layer, matrix, curve, elevation)
      }
    }
  }
}

/**
 * Exports hatch boundary loops as line/arc/ellipse primitives.
 *
 * Reads internal `_geo.loops` from the data model, mirroring
 * {@link AcDbHatch.subGetOsnapPoints}.
 *
 * @internal
 */
function pushHatch(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  entity: AcDbHatch
) {
  const loops = (
    entity as unknown as {
      _geo?: { loops?: ReadonlyArray<AcGeLoop2dType> }
    }
  )._geo?.loops
  if (!loops?.length) return

  const elevation = entity.elevation
  for (const loop of loops) {
    pushHatchLoop(out, layer, matrix, loop, elevation)
  }
}

/**
 * Exports procedural table grid lines when no anonymous block geometry exists.
 *
 * Grid layout follows {@link AcDbTable.subWorldDraw} local coordinates.
 *
 * @internal
 */
function pushTableGrid(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  entity: AcDbTable
) {
  const tableMatrix = composeTransforms(matrix, blockInsertTransform(entity))

  const columnXs = [0]
  for (let column = 0; column < entity.numColumns; column++) {
    columnXs.push(columnXs[column]! + entity.columnWidth(column))
  }

  const rowYs = [0]
  for (let row = 0; row < entity.numRows; row++) {
    rowYs.push(rowYs[row]! - entity.rowHeight(row))
  }

  const totalWidth = columnXs[columnXs.length - 1]!
  const totalHeight = rowYs[rowYs.length - 1]!

  for (const y of rowYs) {
    pushLine(
      out,
      layer,
      tableMatrix,
      { x: 0, y, z: 0 },
      { x: totalWidth, y, z: 0 }
    )
  }

  for (const x of columnXs) {
    pushLine(
      out,
      layer,
      tableMatrix,
      { x, y: 0, z: 0 },
      { x, y: totalHeight, z: 0 }
    )
  }
}

/**
 * Visits a table entity: anonymous block content when present, else grid lines.
 *
 * @internal
 */
function visitTableEntity(
  entity: AcDbTable,
  matrix: THREE.Matrix4,
  insertLayer: string,
  out: AcExOsnapPrimitive[],
  blockStack: Set<AcDbObjectId>,
  database: AcDbDatabase,
  includeLayer?: (layerName: string) => boolean
) {
  const layer = effectiveLayer(entity.layer, insertLayer)
  if (includeLayer && !includeLayer(layer)) {
    return
  }
  const block = resolveTableBlock(entity, database)
  if (block && !blockStack.has(block.objectId) && blockHasEntities(block)) {
    blockStack.add(block.objectId)
    const nested = composeTransforms(matrix, blockInsertTransform(entity))
    visitBlock(block, nested, layer, out, blockStack, database, includeLayer)
    blockStack.delete(block.objectId)
    return
  }

  pushTableGrid(out, layer, matrix, entity)
  const insertion = transformPoint(matrix, entity.position)
  out.push({ kind: 'point', layer, x: insertion.x, y: insertion.y })
}

/**
 * Exports raster image clip/frame boundary and insertion point.
 *
 * Uses {@link AcDbRasterImage.boundaryPath} to match live-viewer osnap behavior.
 *
 * @internal
 */
function pushRasterImage(
  out: AcExOsnapPrimitive[],
  layer: string,
  matrix: THREE.Matrix4,
  entity: AcDbRasterImage
) {
  let boundary = (entity as AcExRasterImageLike).boundaryPath()
  if (boundary.length > 1) {
    const first = boundary[0]!
    const last = boundary[boundary.length - 1]!
    if (
      first.x === last.x &&
      first.y === last.y &&
      (first.z ?? 0) === (last.z ?? 0)
    ) {
      boundary = boundary.slice(0, -1)
    }
  }
  if (boundary.length >= 2) {
    pushVertexPath(out, layer, matrix, boundary, true)
  }

  const insertion = transformPoint(matrix, entity.position)
  out.push({ kind: 'point', layer, x: insertion.x, y: insertion.y })
}

/**
 * Resolves AutoCAD layer-0 inheritance inside blocks.
 *
 * @param entityLayer - Layer name stored on the entity in the block definition.
 * @param insertLayer - Layer of the owning INSERT (or layout default).
 * @returns Layer name written onto exported primitives.
 * @internal
 */
function effectiveLayer(entityLayer: string, insertLayer: string): string {
  return entityLayer === '0' ? insertLayer : entityLayer
}

/**
 * Visits one database entity and appends zero or more WCS primitives.
 *
 * Recurses into {@link AcDbBlockReference} with accumulated transforms.
 * Skips invisible entities and breaks cycles via `blockStack`.
 *
 * @internal
 */
function visitEntity(
  entity: AcDbEntity,
  matrix: THREE.Matrix4,
  insertLayer: string,
  out: AcExOsnapPrimitive[],
  blockStack: Set<AcDbObjectId>,
  database: AcDbDatabase,
  includeLayer?: (layerName: string) => boolean
) {
  if (!entity.visibility) return

  const layer = effectiveLayer(entity.layer, insertLayer)
  if (includeLayer && !includeLayer(layer)) {
    return
  }

  if (entity instanceof AcDbTable) {
    visitTableEntity(
      entity,
      matrix,
      insertLayer,
      out,
      blockStack,
      database,
      includeLayer
    )
    return
  }

  if (isBlockReferenceEntity(entity)) {
    const block = resolveBlockReferenceBlock(entity, database)
    if (!block || blockStack.has(block.objectId)) return
    blockStack.add(block.objectId)
    const nested = composeTransforms(matrix, entity.getFullInsertionTransform())
    const blockInsertLayer = effectiveLayer(entity.layer, insertLayer)
    visitBlock(
      block,
      nested,
      blockInsertLayer,
      out,
      blockStack,
      database,
      includeLayer
    )
    blockStack.delete(block.objectId)
    return
  }

  if (entity instanceof AcDbDimension) {
    const dimension = entity as AcExDimensionLike
    const block = resolveDimensionBlock(dimension, database)
    if (!block || blockStack.has(block.objectId)) return
    blockStack.add(block.objectId)
    const nested = composeTransforms(
      matrix,
      dimension.getFullDimBlockTransform()
    )
    visitBlock(block, nested, layer, out, blockStack, database, includeLayer)
    blockStack.delete(block.objectId)
    return
  }

  if (isLineLikeEntity(entity)) {
    pushLineEntity(out, layer, matrix, entity)
    return
  }

  if (entity instanceof AcDbCircle) {
    if (scaleIsUniform(matrix)) {
      pushCircle(
        out,
        layer,
        matrix,
        entity.center,
        entity.radius,
        entity.normal
      )
    } else {
      pushEllipse(out, layer, matrix, ellipseFromCircle(entity))
    }
    return
  }

  if (entity instanceof AcDbArc) {
    if (scaleIsUniform(matrix)) {
      pushArc(out, layer, matrix, entity)
    } else {
      pushEllipse(out, layer, matrix, ellipseFromArc(entity))
    }
    return
  }

  if (entity instanceof AcDbEllipse) {
    pushEllipse(out, layer, matrix, entity)
    return
  }

  if (entity instanceof AcDbSpline) {
    pushSpline(out, layer, matrix, entity)
    return
  }

  if (entity instanceof AcDbPolyline) {
    pushPolyline(out, layer, matrix, entity)
    return
  }

  if (entity instanceof AcDb2dPolyline) {
    push2dPolyline(out, layer, matrix, entity)
    return
  }

  if (entity instanceof AcDb3dPolyline) {
    const vertices: AcGePoint3dLike[] = []
    for (let i = 0; i < entity.numberOfVertices; i++) {
      vertices.push(entity.getPointAt(i))
    }
    pushVertexPath(out, layer, matrix, vertices, entity.closed)
    return
  }

  if (entity instanceof AcDbHatch) {
    pushHatch(out, layer, matrix, entity)
    return
  }

  if (entity instanceof AcDbRay) {
    pushDirectedLine(
      out,
      layer,
      matrix,
      entity.basePoint,
      entity.unitDir,
      false
    )
    return
  }

  if (entity instanceof AcDbXline) {
    pushDirectedLine(out, layer, matrix, entity.basePoint, entity.unitDir, true)
    return
  }

  if (entity instanceof AcDbTrace) {
    const vertices = [
      entity.getPointAt(0),
      entity.getPointAt(1),
      entity.getPointAt(2),
      entity.getPointAt(3)
    ]
    pushVertexPath(out, layer, matrix, vertices, true)
    return
  }

  if (entity instanceof AcDbFace) {
    const vertices = entity.subGetGripPoints()
    if (vertices.length >= 2) {
      pushVertexPath(out, layer, matrix, vertices, vertices.length >= 3)
    }
    return
  }

  if (entity instanceof AcDbLeader) {
    const vertices = entity.vertices
    if (vertices.length >= 2) {
      pushVertexPath(out, layer, matrix, vertices, false)
    }
    return
  }

  if (entity instanceof AcDbMLine) {
    pushMLine(out, layer, matrix, entity)
    return
  }

  if (entity instanceof AcDbMLeader) {
    pushMLeader(out, layer, matrix, entity)
    return
  }

  if (entity instanceof AcDbText) {
    const p = transformPoint(matrix, entity.position)
    out.push({ kind: 'point', layer, x: p.x, y: p.y })
    return
  }

  if (entity instanceof AcDbMText) {
    const p = transformPoint(matrix, entity.location)
    out.push({ kind: 'point', layer, x: p.x, y: p.y })
    return
  }

  if (entity instanceof AcDbRasterImage) {
    pushRasterImage(out, layer, matrix, entity)
    return
  }

  if (entity instanceof AcDbPoint) {
    const p = transformPoint(matrix, entity.position)
    out.push({ kind: 'point', layer, x: p.x, y: p.y })
  }
}

/** Iterates all entities in a block BTR. @internal */
function visitBlock(
  block: AcDbBlockTableRecord,
  matrix: THREE.Matrix4,
  insertLayer: string,
  out: AcExOsnapPrimitive[],
  blockStack: Set<AcDbObjectId>,
  database: AcDbDatabase,
  includeLayer?: (layerName: string) => boolean
) {
  for (const entity of block.newIterator()) {
    visitEntity(
      entity,
      matrix,
      insertLayer,
      out,
      blockStack,
      database,
      includeLayer
    )
  }
}

/** Converts a circle to a temporary ellipse for non-uniform block transforms. @internal */
function ellipseFromCircle(entity: AcDbCircle): AcDbEllipse {
  return new AcDbEllipse(
    entity.center,
    entity.normal,
    { x: 1, y: 0, z: 0 },
    entity.radius,
    entity.radius,
    0,
    TAU
  )
}

/** Converts an arc to a temporary ellipse for non-uniform block transforms. @internal */
function ellipseFromArc(entity: AcDbArc): AcDbEllipse {
  return new AcDbEllipse(
    entity.center,
    entity.normal,
    { x: 1, y: 0, z: 0 },
    entity.radius,
    entity.radius,
    entity.startAngle,
    entity.endAngle
  )
}

/**
 * Builds the object-snap catalog for one layout (model space or paper space).
 *
 * Traverses the layout's block table record (`layoutBtrId`), including all nested
 * `AcDbBlockReference` entities with full WCS transforms. Entities on layer `0`
 * inside blocks inherit the INSERT layer per AutoCAD rules.
 *
 * Supported entity types: `AcDbLine`, `AcDbCircle`, `AcDbArc`, `AcDbEllipse`,
 * `AcDbSpline`, `AcDbPolyline`, `AcDb2dPolyline`, `AcDb3dPolyline`, `AcDbHatch`,
 * `AcDbRay`, `AcDbXline`, `AcDbTrace`, `AcDbFace`, `AcDbLeader`, `AcDbMLine`,
 * `AcDbMLeader`, `AcDbText`, `AcDbMText`, `AcDbPoint`, `AcDbRasterImage`,
 * `AcDbTable`, INSERT, and dimension entities (`AcDbDimension` and subclasses
 * via anonymous dim blocks).
 *
 * @param database - Open drawing database (same instance used for HTML export).
 * @param layoutBtrId - Object id of the layout's owning block table record
 *   (e.g. model space BTR id from the renderer scene).
 * @returns Catalog with {@link AcExOsnapCatalog.primitives} in WCS; empty array
 *   when the BTR id is unknown or the layout has no snap-capable geometry.
 *
 * @example
 * ```ts
 * const osnap = buildOsnapCatalog(database, scene.modelSpaceBtrId)
 * layoutSnapshot.osnap = osnap
 * ```
 */
export interface AcExOsnapCatalogOptions {
  /** When set, only entities on layers for which this returns `true` are exported. */
  includeLayer?: (layerName: string) => boolean
}

export function buildOsnapCatalog(
  database: AcDbDatabase,
  layoutBtrId: string,
  options: AcExOsnapCatalogOptions = {}
): AcExOsnapCatalog {
  const block = resolveLayoutBlock(database, layoutBtrId)
  if (!block) {
    return { primitives: [] }
  }

  const primitives: AcExOsnapPrimitive[] = []
  const identity = new THREE.Matrix4()
  visitBlock(
    block,
    identity,
    '0',
    primitives,
    new Set(),
    database,
    options.includeLayer
  )
  return { primitives }
}
