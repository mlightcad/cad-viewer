import {
  AcDbEntity,
  AcGeCircArc3d,
  AcGeEllipseArc3d,
  AcGePoint3dLike,
  AcGeVector3d,
  getOcsReferenceVector
} from '@mlightcad/data-model'

import { AcTrBufferGeometryUtil } from './AcTrBufferGeometryUtil'

const FINITE_VECTOR_EPS = 1e-12
const reportedIssues = new Set<string>()

export interface AcTrGeometrySanitizerContext {
  currentDrawingEntity?: AcDbEntity
}

/**
 * Optional diagnostics for invalid CAD geometry during development.
 *
 * Not used on the normal render path — upstream fixes in data-model /
 * geometry-engine should prevent non-finite coordinates. Call these helpers
 * manually while investigating a DWG, or from tests.
 */
export class AcTrGeometrySanitizer {
  static isFinitePoint(point: AcGePoint3dLike | null | undefined): boolean {
    return AcTrBufferGeometryUtil.isFinitePoint(point)
  }

  static filterFinitePoints(
    points: AcGePoint3dLike[],
    context?: AcTrGeometrySanitizerContext,
    source = 'lines'
  ): AcGePoint3dLike[] {
    const filtered = points.filter(point =>
      AcTrGeometrySanitizer.isFinitePoint(point)
    )
    if (filtered.length !== points.length) {
      AcTrGeometrySanitizer.reportIssue(
        context,
        source,
        `dropped ${points.length - filtered.length} non-finite point(s)`
      )
    }
    return filtered
  }

  static filterFiniteLineSegments(
    array: Float32Array,
    itemSize: number,
    indices: Uint16Array,
    context?: AcTrGeometrySanitizerContext,
    source = 'lineSegments'
  ): { array: Float32Array; indices: Uint16Array } | null {
    const vertexCount = Math.floor(array.length / itemSize)
    const vertexValid = new Uint8Array(vertexCount)
    for (let vertex = 0; vertex < vertexCount; vertex++) {
      const base = vertex * itemSize
      vertexValid[vertex] =
        Number.isFinite(array[base]) &&
        Number.isFinite(array[base + 1]) &&
        Number.isFinite(array[base + 2] ?? 0)
          ? 1
          : 0
    }

    const validIndices: number[] = []
    for (let index = 0; index + 1 < indices.length; index += 2) {
      const start = indices[index]
      const end = indices[index + 1]
      if (vertexValid[start] && vertexValid[end]) {
        validIndices.push(start, end)
      }
    }

    const droppedVertices =
      vertexCount - vertexValid.reduce((sum, v) => sum + v, 0)
    const droppedSegments = indices.length / 2 - validIndices.length / 2
    if (droppedVertices > 0 || droppedSegments > 0) {
      AcTrGeometrySanitizer.reportIssue(
        context,
        source,
        `dropped ${droppedVertices} vertex(es) and ${droppedSegments} segment(s) with non-finite coordinates`
      )
    }

    if (validIndices.length === 0) {
      return null
    }

    return {
      array,
      indices: new Uint16Array(validIndices)
    }
  }

  /**
   * Repairs circular arcs whose plane basis became degenerate during OCS/WCS
   * conversion or proxy-graphic decoding.
   */
  static repairCircArc3d(
    arc: AcGeCircArc3d,
    context?: AcTrGeometrySanitizerContext
  ): AcGeCircArc3d | null {
    if (!AcTrGeometrySanitizer.isFinitePoint(arc.center)) {
      AcTrGeometrySanitizer.reportIssue(
        context,
        'circularArc',
        'skipped arc with non-finite center'
      )
      return null
    }
    if (!Number.isFinite(arc.radius) || arc.radius <= 0) {
      AcTrGeometrySanitizer.reportIssue(
        context,
        'circularArc',
        `skipped arc with invalid radius (${arc.radius})`
      )
      return null
    }

    const normal = arc.normal
    const refVec = arc.refVec
    const normalLength = vectorLength(normal)
    const refLength = vectorLength(refVec)
    const needsNormalRepair =
      !Number.isFinite(normalLength) || normalLength < FINITE_VECTOR_EPS
    const needsRefRepair =
      !Number.isFinite(refLength) || refLength < FINITE_VECTOR_EPS

    if (!needsNormalRepair && !needsRefRepair) {
      return arc
    }

    const repaired = arc.clone()
    if (needsNormalRepair) {
      repaired.normal = new AcGeVector3d(AcGeVector3d.Z_AXIS)
      AcTrGeometrySanitizer.reportIssue(
        context,
        'circularArc',
        'replaced degenerate arc normal with Z_AXIS'
      )
    }
    if (needsRefRepair || needsNormalRepair) {
      repaired.refVec = getOcsReferenceVector(repaired.normal)
      if (needsRefRepair && !needsNormalRepair) {
        AcTrGeometrySanitizer.reportIssue(
          context,
          'circularArc',
          'rebuilt degenerate arc reference vector'
        )
      }
    }

    const sample = repaired.getPoints(4)
    if (!sample.every(point => AcTrGeometrySanitizer.isFinitePoint(point))) {
      AcTrGeometrySanitizer.reportIssue(
        context,
        'circularArc',
        'skipped arc that still produces non-finite tessellation after repair'
      )
      return null
    }

    return repaired
  }

  /**
   * Repairs elliptical arcs with the same class of degenerate basis vectors.
   */
  static repairEllipseArc3d(
    arc: AcGeEllipseArc3d,
    context?: AcTrGeometrySanitizerContext
  ): AcGeEllipseArc3d | null {
    if (!AcTrGeometrySanitizer.isFinitePoint(arc.center)) {
      AcTrGeometrySanitizer.reportIssue(
        context,
        'ellipticalArc',
        'skipped ellipse arc with non-finite center'
      )
      return null
    }
    if (
      !Number.isFinite(arc.majorAxisRadius) ||
      arc.majorAxisRadius <= 0 ||
      !Number.isFinite(arc.minorAxisRadius) ||
      arc.minorAxisRadius <= 0
    ) {
      AcTrGeometrySanitizer.reportIssue(
        context,
        'ellipticalArc',
        'skipped ellipse arc with invalid axis radii'
      )
      return null
    }

    const majorAxis = arc.majorAxis
    const normal = arc.normal
    const majorLength = vectorLength(majorAxis)
    const normalLength = vectorLength(normal)
    const needsNormalRepair =
      !Number.isFinite(normalLength) || normalLength < FINITE_VECTOR_EPS
    const needsMajorRepair =
      !Number.isFinite(majorLength) || majorLength < FINITE_VECTOR_EPS

    if (!needsNormalRepair && !needsMajorRepair) {
      return arc
    }

    const repaired = arc.clone()
    if (needsNormalRepair) {
      repaired.normal = new AcGeVector3d(AcGeVector3d.Z_AXIS)
      AcTrGeometrySanitizer.reportIssue(
        context,
        'ellipticalArc',
        'replaced degenerate ellipse normal with Z_AXIS'
      )
    }
    if (needsMajorRepair) {
      repaired.majorAxis = getOcsReferenceVector(repaired.normal)
      AcTrGeometrySanitizer.reportIssue(
        context,
        'ellipticalArc',
        'rebuilt degenerate ellipse major axis'
      )
    }

    const sample = repaired.getPoints(4)
    if (!sample.every(point => AcTrGeometrySanitizer.isFinitePoint(point))) {
      AcTrGeometrySanitizer.reportIssue(
        context,
        'ellipticalArc',
        'skipped ellipse arc that still produces non-finite tessellation after repair'
      )
      return null
    }

    return repaired
  }

  static reportIssue(
    context: AcTrGeometrySanitizerContext | undefined,
    source: string,
    detail: string
  ) {
    const entity = context?.currentDrawingEntity
    const entityKey = entity
      ? `${entityTypeName(entity)}:${entity.objectId}`
      : 'unknown-entity'
    const key = `${entityKey}:${source}:${detail}`
    if (reportedIssues.has(key)) {
      return
    }
    reportedIssues.add(key)

    const label = entity
      ? `${entityTypeName(entity)} ${entity.objectId} (layer ${entity.layer})`
      : 'unknown entity'
    console.warn(
      `[AcTrGeometrySanitizer] ${label} ${source}: ${detail}. Upstream DWG/proxy-graphic data is likely invalid.`
    )
  }

  /** Clears deduplicated diagnostic keys; intended for tests. */
  static resetDiagnosticsForTests() {
    reportedIssues.clear()
  }
}

function entityTypeName(entity: AcDbEntity): string {
  const ctor = entity.constructor as { typeName?: string; name?: string }
  return ctor.typeName ?? ctor.name ?? 'Entity'
}

function vectorLength(vector: { x: number; y: number; z?: number }) {
  const z = vector.z ?? 0
  return Math.hypot(vector.x, vector.y, z)
}
