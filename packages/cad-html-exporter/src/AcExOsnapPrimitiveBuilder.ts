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
  AcDbArc,
  AcDbBlockReference,
  type AcDbBlockTableRecord,
  AcDbCircle,
  type AcDbDatabase,
  AcDbEllipse,
  AcDbEntity,
  AcDbLine,
  type AcDbObjectId,
  AcDbPoint,
  AcDbPolyline,
  AcDbSpline,
  AcGeCircArc2d,
  type AcGePoint3dLike,
  type AcGeVector3dLike
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

const TAU = Math.PI * 2
const EPS = 1e-9

/** Maps entity extrusion normal to arc/circle winding sign. @internal */
function normalSignFromVector(normal: AcGeVector3dLike): 1 | -1 {
  return normal.z >= 0 ? 1 : -1
}

/** Applies a 4×4 layout/block matrix to a 3D point; returns XY. @internal */
function transformPoint(
  matrix: THREE.Matrix4,
  p: AcGePoint3dLike
): { x: number; y: number } {
  const v = new THREE.Vector3(p.x, p.y, p.z ?? 0).applyMatrix4(matrix)
  return { x: v.x, y: v.y }
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
  return Math.abs(sx - sy) <= EPS * Math.max(sx, sy, 1)
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
    closed: entity.closed
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
    if (Math.abs(bulge) > EPS) {
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
  blockStack: Set<AcDbObjectId>
) {
  if (!entity.visibility) return

  const layer = effectiveLayer(entity.layer, insertLayer)

  if (entity instanceof AcDbBlockReference) {
    const block = entity.blockTableRecord
    if (!block || blockStack.has(block.objectId)) return
    blockStack.add(block.objectId)
    const insertMatrix = (
      entity as unknown as { getFullInsertionTransform(): THREE.Matrix4 }
    ).getFullInsertionTransform()
    const nested = new THREE.Matrix4().multiplyMatrices(matrix, insertMatrix)
    const blockInsertLayer = effectiveLayer(entity.layer, insertLayer)
    visitBlock(block, nested, blockInsertLayer, out, blockStack)
    blockStack.delete(block.objectId)
    return
  }

  if (entity instanceof AcDbLine) {
    pushLine(out, layer, matrix, entity.startPoint, entity.endPoint)
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
  blockStack: Set<AcDbObjectId>
) {
  for (const entity of block.newIterator()) {
    visitEntity(entity, matrix, insertLayer, out, blockStack)
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
 * `AcDbSpline`, `AcDbPolyline` (lines + bulge arcs), `AcDbPoint`, and INSERT.
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
export function buildOsnapCatalog(
  database: AcDbDatabase,
  layoutBtrId: string
): AcExOsnapCatalog {
  const block = database.tables.blockTable.getIdAt(layoutBtrId)
  if (!block) {
    return { primitives: [] }
  }

  const primitives: AcExOsnapPrimitive[] = []
  const identity = new THREE.Matrix4()
  visitBlock(block, identity, '0', primitives, new Set())
  return { primitives }
}
