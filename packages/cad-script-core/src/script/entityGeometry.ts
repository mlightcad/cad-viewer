import {
  AcDb2dPolyline,
  AcDb2dVertex,
  AcDb3dPolyline,
  AcDb3dSolid,
  AcDb3dVertex,
  AcDb3PointAngularDimension,
  AcDbAlignedDimension,
  AcDbArc,
  AcDbArcAlignedText,
  AcDbArcDimension,
  AcDbAttribute,
  AcDbAttributeDefinition,
  AcDbBlockReference,
  AcDbCircle,
  AcDbDiametricDimension,
  AcDbDimension,
  AcDbEllipse,
  AcDbEntity,
  AcDbFace,
  AcDbFcf,
  AcDbHatch,
  AcDbLeader,
  AcDbLine,
  AcDbMLeader,
  AcDbMLine,
  AcDbMText,
  AcDbOle2Frame,
  AcDbOrdinateDimension,
  AcDbPoint,
  AcDbPolyFaceMesh,
  AcDbPolygonMesh,
  AcDbPolyline,
  AcDbProxyEntity,
  AcDbRadialDimension,
  AcDbRasterImage,
  AcDbRay,
  AcDbRotatedDimension,
  AcDbShape,
  AcDbSolid,
  AcDbSpline,
  AcDbTable,
  AcDbText,
  AcDbTrace,
  AcDbViewport,
  AcDbWipeout,
  AcDbXline
} from '@mlightcad/data-model'

import { type SnapshotPoint, toSnapshotPoint } from './snapshotValue'

/**
 * Copies type-specific geometry for every concrete entity in data-model.
 *
 * Subclasses are matched before their bases. Binary payloads such as ACIS,
 * OLE streams, and proxy graphics are left out so a snapshot stays JSON-sized.
 *
 * @param entity - Live database entity.
 * @returns Plain geometry, or `undefined` when the type has no extra fields.
 */
export function readEntityGeometry(
  entity: AcDbEntity
): Record<string, unknown> | undefined {
  if (entity instanceof AcDbRotatedDimension) {
    return { ...alignedDimension(entity) }
  }
  if (entity instanceof AcDbAlignedDimension) return alignedDimension(entity)
  if (entity instanceof AcDb3PointAngularDimension) {
    return {
      ...dimensionBase(entity),
      arcPoint: toSnapshotPoint(entity.arcPoint),
      centerPoint: toSnapshotPoint(entity.centerPoint),
      xLine1Point: toSnapshotPoint(entity.xLine1Point),
      xLine2Point: toSnapshotPoint(entity.xLine2Point)
    }
  }
  if (entity instanceof AcDbArcDimension) {
    return {
      ...dimensionBase(entity),
      arcPoint: toSnapshotPoint(entity.arcPoint),
      centerPoint: toSnapshotPoint(entity.centerPoint),
      xLine1Point: toSnapshotPoint(entity.xLine1Point),
      xLine2Point: toSnapshotPoint(entity.xLine2Point)
    }
  }
  if (entity instanceof AcDbDiametricDimension) {
    return {
      ...dimensionBase(entity),
      chordPoint: toSnapshotPoint(entity.chordPoint),
      farChordPoint: toSnapshotPoint(entity.farChordPoint),
      leaderLength: entity.leaderLength
    }
  }
  if (entity instanceof AcDbRadialDimension) {
    return {
      ...dimensionBase(entity),
      center: toSnapshotPoint(entity.center),
      chordPoint: toSnapshotPoint(entity.chordPoint),
      leaderLength: entity.leaderLength
    }
  }
  if (entity instanceof AcDbOrdinateDimension) {
    return {
      ...dimensionBase(entity),
      definingPoint: toSnapshotPoint(entity.definingPoint),
      leaderEndPoint: toSnapshotPoint(entity.leaderEndPoint)
    }
  }
  if (entity instanceof AcDbDimension) return dimensionBase(entity)

  if (entity instanceof AcDbAttribute) {
    return {
      ...textGeometry(entity),
      tag: entity.tag,
      invisible: entity.isInvisible
    }
  }
  if (entity instanceof AcDbAttributeDefinition) {
    return {
      ...textGeometry(entity),
      tag: entity.tag,
      prompt: entity.prompt,
      invisible: entity.isInvisible
    }
  }
  if (entity instanceof AcDbMText) {
    return {
      position: toSnapshotPoint(entity.location),
      text: entity.contents,
      height: entity.height,
      width: entity.width,
      rotation: entity.rotation,
      styleName: entity.styleName,
      attachmentPoint: entity.attachmentPoint
    }
  }
  if (entity instanceof AcDbText) return textGeometry(entity)
  if (entity instanceof AcDbArcAlignedText) {
    return {
      text: entity.textString,
      height: entity.textSize,
      center: toSnapshotPoint(entity.center),
      radius: entity.radius,
      startAngle: entity.startAngle,
      endAngle: entity.endAngle,
      startAngleDeg: degrees(entity.startAngle),
      endAngleDeg: degrees(entity.endAngle),
      styleName: entity.styleName,
      arcId: entity.arcId
    }
  }

  if (entity instanceof AcDbTable) {
    return {
      ...insertGeometry(entity),
      rows: entity.numRows,
      columns: entity.numColumns
    }
  }
  if (entity instanceof AcDbBlockReference) return insertGeometry(entity)

  if (entity instanceof AcDbCircle && !(entity instanceof AcDbArc)) {
    return {
      center: toSnapshotPoint(entity.center),
      radius: entity.radius
    }
  }
  if (entity instanceof AcDbArc) {
    return {
      center: toSnapshotPoint(entity.center),
      radius: entity.radius,
      startAngle: entity.startAngle,
      endAngle: entity.endAngle,
      startAngleDeg: degrees(entity.startAngle),
      endAngleDeg: degrees(entity.endAngle)
    }
  }
  if (entity instanceof AcDbLine) {
    return {
      start: toSnapshotPoint(entity.startPoint),
      end: toSnapshotPoint(entity.endPoint)
    }
  }
  if (entity instanceof AcDbEllipse) {
    return {
      center: toSnapshotPoint(entity.center),
      majorAxis: toSnapshotPoint(entity.majorAxis),
      majorRadius: entity.majorAxisRadius,
      minorRadius: entity.minorAxisRadius,
      startAngle: entity.startAngle,
      endAngle: entity.endAngle,
      startAngleDeg: degrees(entity.startAngle),
      endAngleDeg: degrees(entity.endAngle)
    }
  }
  if (entity instanceof AcDbPolyline) {
    return {
      points: indexedPoints(entity.numberOfVertices, index =>
        entity.getPoint3dAt(index)
      ),
      closed: entity.closed,
      elevation: entity.elevation
    }
  }
  if (entity instanceof AcDb2dPolyline) {
    return {
      points: indexedPoints(entity.numberOfVertices, index => {
        const point = entity.getPointAt(index)
        return { x: point.x, y: point.y, z: entity.elevation }
      }),
      closed: entity.closed,
      polyType: entity.polyType,
      elevation: entity.elevation
    }
  }
  if (entity instanceof AcDb3dPolyline) {
    return {
      points: indexedPoints(entity.numberOfVertices, index =>
        entity.getPointAt(index)
      ),
      closed: entity.closed,
      polyType: entity.polyType
    }
  }
  if (entity instanceof AcDb2dVertex || entity instanceof AcDb3dVertex) {
    return { position: toSnapshotPoint(entity.position) }
  }
  if (entity instanceof AcDbPoint) {
    return { position: toSnapshotPoint(entity.position) }
  }
  if (entity instanceof AcDbRay || entity instanceof AcDbXline) {
    return {
      basePoint: toSnapshotPoint(entity.basePoint),
      unitDir: toSnapshotPoint(entity.unitDir)
    }
  }
  if (entity instanceof AcDbSpline) {
    return {
      closed: entity.closed,
      fitTolerance: entity.fitTolerance,
      knotTolerance: entity.knotTolerance,
      controlTolerance: entity.controlTolerance,
      normal: toSnapshotPoint(entity.normal),
      points: entity.subGetGripPoints().map(point => toSnapshotPoint(point))
    }
  }
  if (entity instanceof AcDbLeader) {
    return {
      vertices: entity.vertices.map(point => toSnapshotPoint(point)),
      dimensionStyle: entity.dimensionStyle,
      hasArrowHead: entity.hasArrowHead
    }
  }
  if (entity instanceof AcDbMLeader) {
    return {
      contents: entity.contents,
      textLocation: optionalPoint(entity.textLocation),
      textHeight: entity.textHeight,
      textRotation: entity.textRotation,
      landingPoint: optionalPoint(entity.landingPoint),
      contentType: entity.contentType,
      numberOfLeaders: entity.numberOfLeaders
    }
  }
  if (entity instanceof AcDbMLine) {
    return {
      styleName: entity.styleName,
      scale: entity.scale,
      justification: entity.justification,
      closed: entity.closed,
      startPosition: toSnapshotPoint(entity.startPosition),
      vertices: entity.segments.map(segment =>
        toSnapshotPoint(segment.position)
      )
    }
  }
  if (entity instanceof AcDbHatch) {
    return {
      patternName: entity.patternName,
      patternType: entity.patternType,
      patternAngle: entity.patternAngle,
      patternScale: entity.patternScale,
      isSolidFill: entity.isSolidFill,
      isGradient: entity.isGradient,
      elevation: entity.elevation,
      associative: entity.associative,
      boundary: entity.subGetGripPoints().map(point => toSnapshotPoint(point))
    }
  }
  if (entity instanceof AcDbSolid || entity instanceof AcDbTrace) {
    return {
      points: indexedPoints(4, index => entity.getPointAt(index))
    }
  }
  if (entity instanceof AcDbFace) {
    return {
      points: indexedPoints(4, index => entity.getVertexAt(index))
    }
  }
  if (entity instanceof AcDbPolyFaceMesh) {
    const vertices = []
    for (let index = 0; index < entity.numberOfVertices; index++) {
      vertices.push(toSnapshotPoint(entity.getVertexAt(index).position))
    }
    const faces = []
    for (let index = 0; index < entity.numberOfFaces; index++) {
      faces.push([...entity.getFaceAt(index).vertexIndices])
    }
    return { vertices, faces }
  }
  if (entity instanceof AcDbPolygonMesh) {
    const vertices = []
    for (let index = 0; index < entity.numberOfVertices; index++) {
      vertices.push(toSnapshotPoint(entity.getVertexAt(index).position))
    }
    return {
      mCount: entity.mCount,
      nCount: entity.nCount,
      closedM: entity.closedM,
      closedN: entity.closedN,
      vertices
    }
  }
  if (entity instanceof AcDbWipeout || entity instanceof AcDbRasterImage) {
    return {
      position: toSnapshotPoint(entity.position),
      rotation: entity.rotation,
      width: entity.width,
      height: entity.height,
      imageFileName: entity.imageFileName,
      imageDisplayName: entity.imageDisplayName,
      isClipped: entity.isClipped
    }
  }
  if (entity instanceof AcDbOle2Frame) {
    return {
      upperLeft: toSnapshotPoint(entity.upperLeftCorner),
      lowerRight: toSnapshotPoint(entity.lowerRightCorner),
      userType: entity.userType,
      oleObjectType: entity.oleObjectType
    }
  }
  if (entity instanceof AcDbViewport) {
    return {
      number: entity.number,
      center: toSnapshotPoint(entity.centerPoint),
      width: entity.width,
      height: entity.height,
      viewCenter: toSnapshotPoint(entity.viewCenter),
      viewTarget: toSnapshotPoint(entity.viewTarget),
      viewHeight: entity.viewHeight,
      viewTwistAngle: entity.viewTwistAngle
    }
  }
  if (entity instanceof AcDbShape) {
    return {
      name: entity.name,
      position: toSnapshotPoint(entity.position),
      size: entity.size,
      rotation: entity.rotation,
      styleName: entity.styleName
    }
  }
  if (entity instanceof AcDbFcf) {
    return {
      position: toSnapshotPoint(entity.location),
      text: entity.text,
      dimensionStyle: entity.dimensionStyle
    }
  }
  if (entity instanceof AcDb3dSolid) {
    return {
      version: entity.version,
      guid: entity.guid,
      hasRenderableGeometry: entity.hasRenderableGeometry
    }
  }
  if (entity instanceof AcDbProxyEntity) {
    return {
      originalDxfName: entity.originalDxfName,
      originalClassName: entity.originalClassName,
      applicationName: entity.applicationName
    }
  }
  return undefined
}

function textGeometry(entity: AcDbText): Record<string, unknown> {
  return {
    position: toSnapshotPoint(entity.position),
    text: entity.textString,
    height: entity.height,
    rotation: entity.rotation,
    styleName: entity.styleName
  }
}

function insertGeometry(entity: AcDbBlockReference): Record<string, unknown> {
  return {
    name: entity.blockName,
    position: toSnapshotPoint(entity.position),
    rotation: entity.rotation,
    scale: toSnapshotPoint(entity.scaleFactors)
  }
}

function dimensionBase(entity: AcDbDimension): Record<string, unknown> {
  return {
    text: entity.dimensionText,
    measurement: entity.measurement,
    textPosition: toSnapshotPoint(entity.textPosition),
    styleName: entity.dimensionStyleName,
    rotation: entity.textRotation
  }
}

function alignedDimension(
  entity: AcDbAlignedDimension
): Record<string, unknown> {
  return {
    ...dimensionBase(entity),
    dimLinePoint: toSnapshotPoint(entity.dimLinePoint),
    xLine1Point: toSnapshotPoint(entity.xLine1Point),
    xLine2Point: toSnapshotPoint(entity.xLine2Point),
    dimensionRotation: entity.rotation,
    oblique: entity.oblique
  }
}

function indexedPoints(
  count: number,
  read: (index: number) => { x: number; y: number; z?: number }
): SnapshotPoint[] {
  const points: SnapshotPoint[] = []
  for (let index = 0; index < count; index++) {
    points.push(toSnapshotPoint(read(index)))
  }
  return points
}

function optionalPoint(
  point: { x: number; y: number; z?: number } | undefined
): SnapshotPoint | undefined {
  return point ? toSnapshotPoint(point) : undefined
}

function degrees(radians: number): number {
  return (radians * 180) / Math.PI
}
