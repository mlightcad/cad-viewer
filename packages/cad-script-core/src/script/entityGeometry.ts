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
  AcDbDynBlockReference,
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

import {
  type SnapshotPoint,
  toSnapshotEntityColor,
  toSnapshotMatrix,
  toSnapshotPoint
} from './snapshotValue'

/** One sampled boundary edge of a hatch loop. */
interface SnapshotCurvePiece {
  start: SnapshotPoint
  end: SnapshotPoint
  points: SnapshotPoint[]
}

/** Sample counts for the curved primitives used to rebuild hatch loops. */
const ARC_LOOP_SAMPLES = 32
const SPLINE_LOOP_SAMPLES = 64

/** Distance under which two boundary edge endpoints count as connected. */
const LOOP_JOIN_TOLERANCE = 1e-3

/**
 * Copies type-specific geometry for every concrete entity in data-model.
 *
 * Subclasses are matched before their bases. Binary payloads such as ACIS,
 * OLE streams, and proxy graphics are left out so a snapshot stays JSON-sized.
 *
 * Besides raw definition points, the copy carries derived values a script
 * would otherwise have to recompute: lengths, areas, bulges, vertex widths,
 * spline control data, hatch loops, table cell text, and block attributes.
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
      origin: toSnapshotPoint(entity.origin),
      definingPoint: toSnapshotPoint(entity.definingPoint),
      leaderEndPoint: toSnapshotPoint(entity.leaderEndPoint),
      useXAxis: entity.useXAxis
    }
  }
  if (entity instanceof AcDbDimension) return dimensionBase(entity)

  if (entity instanceof AcDbAttribute) {
    return {
      ...textGeometry(entity),
      tag: entity.tag,
      invisible: entity.isInvisible,
      isMTextAttribute: entity.isMTextAttribute,
      mtextContents: entity.mtext?.contents
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
      plainText: stripMTextControlCodes(entity.contents),
      height: entity.height,
      width: entity.width,
      extentsWidth: entity.extentsWidth,
      rotation: entity.rotation,
      styleName: entity.styleName,
      attachmentPoint: entity.attachmentPoint,
      direction: toSnapshotPoint(entity.direction),
      lineSpacingFactor: entity.lineSpacingFactor,
      lineSpacingStyle: entity.lineSpacingStyle,
      backgroundFill: entity.backgroundFill,
      backgroundFillColor: entity.backgroundFillColor,
      backgroundScaleFactor: entity.backgroundScaleFactor,
      drawingDirection: entity.drawingDirection,
      columnType: entity.columnType,
      columnCount: entity.columnCount,
      columnWidth: entity.columnWidth,
      columnGutter: entity.columnGutter,
      columnFlowReversed: entity.columnFlowReversed
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
      arcId: entity.arcId,
      xScale: entity.xScale,
      characterSpacing: entity.characterSpacing,
      offsetFromArc: entity.offsetFromArc,
      leftOffset: entity.leftOffset,
      rightOffset: entity.rightOffset,
      alignment: entity.alignment,
      isReverse: entity.isReverse
    }
  }

  if (entity instanceof AcDbTable) {
    return {
      ...insertGeometry(entity),
      rows: entity.numRows,
      columns: entity.numColumns,
      attachmentPoint: entity.attachmentPoint,
      rowHeights: indexedNumbers(entity.numRows, index =>
        entity.rowHeight(index)
      ),
      columnWidths: indexedNumbers(entity.numColumns, index =>
        entity.columnWidth(index)
      ),
      tableWidth: summed(entity.numColumns, index => entity.columnWidth(index)),
      tableHeight: summed(entity.numRows, index => entity.rowHeight(index)),
      cells: tableCells(entity)
    }
  }
  if (entity instanceof AcDbBlockReference) return insertGeometry(entity)

  if (entity instanceof AcDbCircle && !(entity instanceof AcDbArc)) {
    return {
      center: toSnapshotPoint(entity.center),
      radius: entity.radius,
      area: entity.area,
      circumference: 2 * Math.PI * entity.radius,
      closed: entity.closed
    }
  }
  if (entity instanceof AcDbArc) {
    return {
      center: toSnapshotPoint(entity.center),
      radius: entity.radius,
      startAngle: entity.startAngle,
      endAngle: entity.endAngle,
      startAngleDeg: degrees(entity.startAngle),
      endAngleDeg: degrees(entity.endAngle),
      length: arcLength(entity.radius, entity.startAngle, entity.endAngle),
      area: entity.area,
      startPoint: toSnapshotPoint(entity.startPoint),
      endPoint: toSnapshotPoint(entity.endPoint),
      midPoint: toSnapshotPoint(entity.midPoint),
      closed: entity.closed
    }
  }
  if (entity instanceof AcDbLine) {
    const direction = subtract(entity.endPoint, entity.startPoint)
    return {
      start: toSnapshotPoint(entity.startPoint),
      end: toSnapshotPoint(entity.endPoint),
      length: distance(entity.startPoint, entity.endPoint),
      midPoint: toSnapshotPoint(entity.midPoint),
      direction: toSnapshotPoint(normalize(direction)),
      closed: entity.closed
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
      endAngleDeg: degrees(entity.endAngle),
      area: entity.area,
      isCircular:
        Math.abs(entity.majorAxisRadius - entity.minorAxisRadius) < 1e-9,
      closed: entity.closed
    }
  }
  if (entity instanceof AcDbPolyline) {
    const points = indexedPoints(entity.numberOfVertices, index =>
      entity.getPoint3dAt(index)
    )
    const vertices = polylineVertices(entity, points)
    return {
      points,
      vertices,
      bulges: vertices.map(vertex => vertex.bulge ?? 0),
      hasBulges: vertices.some(vertex => (vertex.bulge ?? 0) !== 0),
      hasWidths: hasPolylineWidths(vertices),
      closed: entity.closed,
      elevation: entity.elevation,
      length: geometryPropertyNumber(entity, 'length'),
      area: entity.area
    }
  }
  if (entity instanceof AcDb2dPolyline) {
    const points = indexedPoints(entity.numberOfVertices, index => {
      const point = entity.getPointAt(index)
      return { x: point.x, y: point.y, z: entity.elevation }
    })
    const vertices = polylineVertices(entity, points)
    return {
      points,
      vertices,
      bulges: vertices.map(vertex => vertex.bulge ?? 0),
      hasBulges: vertices.some(vertex => (vertex.bulge ?? 0) !== 0),
      hasWidths: hasPolylineWidths(vertices),
      closed: entity.closed,
      polyType: entity.polyType,
      elevation: entity.elevation,
      length: geometryPropertyNumber(entity, 'length'),
      area: entity.area
    }
  }
  if (entity instanceof AcDb3dPolyline) {
    const points = indexedPoints(entity.numberOfVertices, index =>
      entity.getPointAt(index)
    )
    return {
      points,
      closed: entity.closed,
      polyType: entity.polyType,
      length:
        geometryPropertyNumber(entity, 'length') ?? polylinePathLength(points)
    }
  }
  if (entity instanceof AcDb2dVertex || entity instanceof AcDb3dVertex) {
    return { position: toSnapshotPoint(entity.position) }
  }
  if (entity instanceof AcDbPoint) {
    return {
      position: toSnapshotPoint(entity.position),
      ecsRotation: entity.ecsRotation
    }
  }
  if (entity instanceof AcDbRay || entity instanceof AcDbXline) {
    return {
      basePoint: toSnapshotPoint(entity.basePoint),
      unitDir: toSnapshotPoint(entity.unitDir)
    }
  }
  if (entity instanceof AcDbSpline) {
    const curve = readSplineCurve(entity)
    return {
      closed: entity.closed,
      fitTolerance: entity.fitTolerance,
      knotTolerance: entity.knotTolerance,
      controlTolerance: entity.controlTolerance,
      normal: toSnapshotPoint(entity.normal),
      points: entity.subGetGripPoints().map(point => toSnapshotPoint(point)),
      controlPoints: curve
        ? curve.controlPoints.map(point => toSnapshotPoint(point))
        : undefined,
      fitPoints: curve
        ? curve.fitPoints.map(point => toSnapshotPoint(point))
        : undefined,
      knots: curve ? [...curve.knots] : undefined,
      weights: curve?.weights ? [...curve.weights] : undefined,
      degree: curve?.degree,
      length: curve?.length,
      area: entity.area,
      isFitPointSpline: curve?.isFitPointSpline,
      isControlPointSpline: curve?.isControlPointSpline,
      startPoint: curve ? toSnapshotPoint(curve.startPoint) : undefined,
      endPoint: curve ? toSnapshotPoint(curve.endPoint) : undefined
    }
  }
  if (entity instanceof AcDbLeader) {
    // `AcDbLeader.closed` is always false and `area` always 0 in data-model, so
    // neither says anything about the drawn leader and both are omitted.
    return {
      vertices: entity.vertices.map(point => toSnapshotPoint(point)),
      dimensionStyle: entity.dimensionStyle,
      hasArrowHead: entity.hasArrowHead,
      hasHookLine: entity.hasHookLine,
      isSplined: entity.isSplined,
      numVertices: entity.numVertices,
      textHeight: entity.textHeight,
      textWidth: entity.textWidth,
      annoType: entity.annoType,
      associatedAnnotation: entity.associatedAnnotation
    }
  }
  if (entity instanceof AcDbMLeader) {
    return {
      contents: entity.contents,
      textLocation: optionalPoint(entity.textLocation),
      textHeight: entity.textHeight,
      textWidth: entity.textWidth,
      textRotation: entity.textRotation,
      landingPoint: optionalPoint(entity.landingPoint),
      contentType: entity.contentType,
      numberOfLeaders: entity.numberOfLeaders,
      doglegLength: entity.doglegLength,
      doglegEnabled: entity.doglegEnabled,
      leaderLineType: entity.leaderLineType,
      leaderLineColor: toSnapshotEntityColor(entity.leaderLineColor ?? {}),
      leaders: entity.leaders.map(leader => ({
        vertices: leader.leaderLines.flatMap(line =>
          line.vertices.map(point => toSnapshotPoint(point))
        ),
        lastLeaderLinePoint: optionalPoint(leader.lastLeaderLinePoint),
        landingPoint: optionalPoint(leader.landingPoint)
      }))
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
      patternDouble: entity.patternDouble,
      hatchStyle: entity.hatchStyle,
      isSolidFill: entity.isSolidFill,
      isHatch: entity.isHatch,
      isGradient: entity.isGradient,
      backgroundColor: toSnapshotEntityColor(entity.backgroundColor ?? {}),
      elevation: entity.elevation,
      associative: entity.associative,
      area: entity.area,
      gradientAngle: entity.isGradient ? entity.gradientAngle : undefined,
      gradientShift: entity.isGradient ? entity.gradientShift : undefined,
      gradientType: entity.isGradient ? entity.gradientType : undefined,
      gradientName: entity.isGradient ? entity.gradientName : undefined,
      gradientOneColorMode: entity.isGradient
        ? entity.gradientOneColorMode
        : undefined,
      shadeTintValue: entity.isGradient ? entity.shadeTintValue : undefined,
      gradientStartColor: entity.isGradient
        ? entity.gradientStartColor
        : undefined,
      gradientEndColor: entity.isGradient ? entity.gradientEndColor : undefined,
      boundary: entity.subGetGripPoints().map(point => toSnapshotPoint(point)),
      loops: hatchLoops(entity)
    }
  }
  if (entity instanceof AcDbSolid || entity instanceof AcDbTrace) {
    return {
      points: quadrilateralPoints(entity),
      area: entity.area
    }
  }
  if (entity instanceof AcDbFace) {
    return {
      points: facePoints(entity),
      area: entity.area
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
    // `AcDbPolyFaceMesh.area` is hardcoded to 0 in data-model, so it is omitted.
    return { vertices, faces }
  }
  if (entity instanceof AcDbPolygonMesh) {
    const vertices = []
    for (let index = 0; index < entity.numberOfVertices; index++) {
      vertices.push(toSnapshotPoint(entity.getVertexAt(index).position))
    }
    // `AcDbPolygonMesh.area` is hardcoded to 0 in data-model, so it is omitted.
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
      imageSize: toSnapshotPoint({
        x: entity.imageSize.x,
        y: entity.imageSize.y
      }),
      scale: toSnapshotPoint({ x: entity.scale.x, y: entity.scale.y }),
      clipBoundaryType: entity.clipBoundaryType,
      clipBoundary: entity.clipBoundary.map(point =>
        toSnapshotPoint({ x: point.x, y: point.y })
      ),
      brightness: entity.brightness,
      contrast: entity.contrast,
      fade: entity.fade,
      isImageShown: entity.isImageShown,
      isImageTransparent: entity.isImageTransparent,
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
      viewDirection: toSnapshotPoint(entity.viewDirection),
      viewHeight: entity.viewHeight,
      viewTwistAngle: entity.viewTwistAngle,
      sheetName: entity.sheetName,
      status: entity.status,
      frozenLayerIds: [...entity.frozenLayerIds]
    }
  }
  if (entity instanceof AcDbShape) {
    return {
      name: entity.name,
      position: toSnapshotPoint(entity.position),
      size: entity.size,
      rotation: entity.rotation,
      styleName: entity.styleName,
      shapeNumber: entity.shapeNumber,
      widthFactor: entity.widthFactor,
      oblique: entity.oblique,
      isPlanar: entity.isPlanar
    }
  }
  if (entity instanceof AcDbFcf) {
    return {
      position: toSnapshotPoint(entity.location),
      text: entity.text,
      dimensionStyle: entity.dimensionStyle,
      textHeight: entity.textHeight,
      direction: toSnapshotPoint(entity.direction),
      annotative: entity.annotative
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

/**
 * Reads the corner points of a face.
 *
 * `getVertexAt` clamps out-of-range indexes, so a triangular face returns its
 * third point twice. Trailing repeats are dropped to keep one entry per corner.
 */
function facePoints(entity: AcDbFace): SnapshotPoint[] {
  const points = indexedPoints(4, index => entity.getVertexAt(index))
  while (points.length > 1) {
    const last = points[points.length - 1] as SnapshotPoint
    const previous = points[points.length - 2] as SnapshotPoint
    if (!pointsClose(last, previous)) break
    points.pop()
  }
  return points
}

/**
 * Reads the corner points of a solid or trace.
 *
 * The fourth corner of a triangular solid repeats the third; it is dropped for
 * the same reason as on a face.
 */
function quadrilateralPoints(entity: AcDbSolid | AcDbTrace): SnapshotPoint[] {
  const points = indexedPoints(4, index => entity.getPointAt(index))
  while (points.length > 1) {
    const last = points[points.length - 1] as SnapshotPoint
    const previous = points[points.length - 2] as SnapshotPoint
    if (!pointsClose(last, previous)) break
    points.pop()
  }
  return points
}

/**
 * Reads text geometry, including placement and formatting flags.
 *
 * Attribute and attribute-definition copies extend this base.
 */
function textGeometry(entity: AcDbText): Record<string, unknown> {
  return {
    position: toSnapshotPoint(entity.position),
    text: entity.textString,
    height: entity.height,
    rotation: entity.rotation,
    styleName: entity.styleName,
    alignmentPoint: toSnapshotPoint(entity.alignmentPoint),
    hasAlignmentPoint: entity.hasAlignmentPoint,
    oblique: entity.oblique,
    obliqueDeg: degrees(entity.oblique),
    horizontalMode: entity.horizontalMode,
    verticalMode: entity.verticalMode,
    widthFactor: entity.widthFactor,
    isBackward: entity.isBackward,
    isUpsideDown: entity.isUpsideDown
  }
}

/**
 * Reads block-reference placement plus dynamic-block and MINSERT data.
 */
function insertGeometry(entity: AcDbBlockReference): Record<string, unknown> {
  const dynamic = readDynamicBlockInfo(entity)
  return {
    name: entity.blockName,
    effectiveName: dynamic.effectiveName,
    isDynamicBlock: dynamic.isDynamicBlock,
    position: toSnapshotPoint(entity.position),
    rotation: entity.rotation,
    scale: toSnapshotPoint(entity.scaleFactors),
    columnCount: entity.columnCount,
    rowCount: entity.rowCount,
    columnSpacing: entity.columnSpacing,
    rowSpacing: entity.rowSpacing,
    blockTransform: readBlockTransform(entity),
    attributes: readBlockAttributes(entity)
  }
}

function readDynamicBlockInfo(entity: AcDbBlockReference): {
  effectiveName?: string
  isDynamicBlock?: boolean
} {
  try {
    const reference = new AcDbDynBlockReference(entity)
    const isDynamicBlock = reference.isDynamicBlock()
    if (!isDynamicBlock) return { isDynamicBlock: false }
    const drawable = AcDbDynBlockReference.drawableBlockTableRecord(entity)
    return {
      isDynamicBlock: true,
      effectiveName: drawable?.name ?? entity.blockName
    }
  } catch {
    return {}
  }
}

function readBlockTransform(entity: AcDbBlockReference): number[] | undefined {
  try {
    return toSnapshotMatrix(entity.blockTransform)
  } catch {
    return undefined
  }
}

function readBlockAttributes(entity: AcDbBlockReference): unknown[] {
  const attributes: unknown[] = []
  try {
    for (const attribute of entity.attributeIterator()) {
      attributes.push({
        tag: attribute.tag,
        text: attribute.textString,
        position: toSnapshotPoint(attribute.position),
        invisible: attribute.isInvisible
      })
    }
  } catch {
    // A reference without attributes throws nothing; ignore a broken iterator.
  }
  return attributes
}

/**
 * Reads the first text content of every table cell, row by row.
 */
function tableCells(entity: AcDbTable): string[][] {
  const cells: string[][] = []
  for (let row = 0; row < entity.numRows; row++) {
    const line: string[] = []
    for (let column = 0; column < entity.numColumns; column++) {
      try {
        line.push(entity.textString(row, column) ?? '')
      } catch {
        line.push('')
      }
    }
    cells.push(line)
  }
  return cells
}

/**
 * Reads placement and annotation data shared by every dimension type.
 *
 * `measurement` comes from the dimension property accessor, which is the same
 * path the property palette uses and is implemented per subtype (an arc
 * dimension measures arc length, an ordinate dimension a signed distance).
 * When a drawing lacks the value, {@link measuredDimension} derives it from the
 * definition points.
 */
function dimensionBase(entity: AcDbDimension): Record<string, unknown> {
  const stored = entity.measurement
  const measurement =
    stored !== undefined && Number.isFinite(stored)
      ? stored
      : (geometryPropertyNumber(entity, 'measurement') ??
        measuredDimension(entity))
  const customText =
    typeof entity.dimensionText === 'string' && entity.dimensionText.length > 0
      ? entity.dimensionText
      : undefined
  return {
    text: entity.dimensionText,
    annotationText: customText,
    measurement,
    dimensionType: entity.dimensionType,
    textPosition: toSnapshotPoint(entity.textPosition),
    styleName: entity.dimensionStyleName,
    rotation: entity.textRotation,
    horizontalRotation: entity.horizontalRotation,
    horizontalRotationDeg: degrees(entity.horizontalRotation),
    attachmentPoint: entity.attachmentPoint,
    textLineSpacingFactor: entity.textLineSpacingFactor,
    textLineSpacingStyle: entity.textLineSpacingStyle,
    normal: toSnapshotPoint(entity.normal)
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

/**
 * Returns the dimension measurement, computing it when the entity has none.
 *
 * The fallback mirrors how each dimension type derives its value from the
 * definition points, so a drawing loaded without the cached measurement still
 * yields a usable number. Angular dimensions report an angle in radians, arc
 * dimensions an arc length, and ordinate dimensions a signed distance.
 */
function measuredDimension(entity: AcDbDimension): number | undefined {
  if (entity instanceof AcDbAlignedDimension) {
    return distance(entity.xLine1Point, entity.xLine2Point)
  }
  if (entity instanceof AcDbRadialDimension) {
    return distance(entity.center, entity.chordPoint)
  }
  if (entity instanceof AcDbDiametricDimension) {
    return distance(entity.chordPoint, entity.farChordPoint)
  }
  if (
    entity instanceof AcDb3PointAngularDimension ||
    entity instanceof AcDbArcDimension
  ) {
    const sweep = angularSweep(entity)
    if (entity instanceof AcDbArcDimension) {
      return sweep * distance(entity.centerPoint, entity.xLine1Point)
    }
    return sweep
  }
  if (entity instanceof AcDbOrdinateDimension) {
    return entity.useXAxis
      ? entity.definingPoint.x - entity.origin.x
      : entity.definingPoint.y - entity.origin.y
  }
  return undefined
}

/**
 * CCW sweep between the two extension-line rays, chosen so it contains the
 * arc point. Mirrors how data-model builds the annotation for angular and arc
 * dimensions.
 */
function angularSweep(
  entity: AcDb3PointAngularDimension | AcDbArcDimension
): number {
  const start = Math.atan2(
    entity.xLine1Point.y - entity.centerPoint.y,
    entity.xLine1Point.x - entity.centerPoint.x
  )
  const end = Math.atan2(
    entity.xLine2Point.y - entity.centerPoint.y,
    entity.xLine2Point.x - entity.centerPoint.x
  )
  const arcAngle = Math.atan2(
    entity.arcPoint.y - entity.centerPoint.y,
    entity.arcPoint.x - entity.centerPoint.x
  )
  const normalize = (angle: number) => {
    let value = angle
    while (value < 0) value += Math.PI * 2
    while (value >= Math.PI * 2) value -= Math.PI * 2
    return value
  }
  const ns = normalize(start)
  const ne = normalize(end)
  const na = normalize(arcAngle)
  const ccwContains = (from: number, to: number, point: number) =>
    from <= to ? point >= from && point <= to : point >= from || point <= to
  const from = ccwContains(ns, ne, na) ? ns : ne
  const to = ccwContains(ns, ne, na) ? ne : ns
  let sweep = to - from
  while (sweep < 0) sweep += Math.PI * 2
  return sweep
}

/**
 * Reads polyline vertices with their coordinates, bulge, and width data.
 *
 * `AcDbPolyline` and `AcDb2dPolyline` keep bulges and widths on their 2D
 * vertices, which have no public accessor beyond the property group. The
 * coordinates come from the point list so they stay in WCS.
 *
 * @param entity - Polyline entity.
 * @param points - WCS points, one per vertex.
 * @returns One entry per vertex.
 */
function polylineVertices(
  entity: AcDbPolyline | AcDb2dPolyline,
  points: readonly SnapshotPoint[]
): Array<Record<string, number | undefined>> {
  const stored = readGeometryProperty(entity, 'vertices') as
    | Array<{
        x?: number
        y?: number
        z?: number
        bulge?: number
        startWidth?: number
        endWidth?: number
      }>
    | undefined
  const vertices: Array<Record<string, number | undefined>> = []
  for (let index = 0; index < entity.numberOfVertices; index++) {
    const vertex = stored?.[index]
    const point = points[index]
    const bulge =
      typeof vertex?.bulge === 'number'
        ? vertex.bulge
        : entity instanceof AcDb2dPolyline
          ? entity.getBulgeAt(index)
          : 0
    vertices.push({
      x: point?.x,
      y: point?.y,
      z: point?.z,
      bulge,
      startWidth: vertex?.startWidth,
      endWidth: vertex?.endWidth
    })
  }
  return vertices
}

/**
 * Reports whether any vertex carries a non-zero start or end width.
 */
function hasPolylineWidths(
  vertices: ReadonlyArray<Record<string, number | undefined>>
): boolean {
  return vertices.some(
    vertex => (vertex.startWidth ?? 0) !== 0 || (vertex.endWidth ?? 0) !== 0
  )
}

/**
 * Reads one property from the entity's property groups.
 *
 * data-model computes some values (polyline length, 2D vertices) without a
 * public getter; the property accessor is the supported path to them.
 */
function readGeometryProperty(entity: AcDbEntity, name: string): unknown {
  try {
    for (const group of entity.properties.groups) {
      for (const property of group.properties) {
        if (property.name !== name) continue
        return property.accessor.get()
      }
    }
  } catch {
    // Property groups can throw while the drawing is still being resolved.
  }
  return undefined
}

function geometryPropertyNumber(
  entity: AcDbEntity,
  name: string
): number | undefined {
  const value = readGeometryProperty(entity, name)
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Reads the geometry spline behind an `AcDbSpline`.
 *
 * `AcDbSpline` exposes its control data only through the intersection
 * primitives; using them avoids reaching into private fields.
 */
function readSplineCurve(entity: AcDbSpline): {
  controlPoints: Array<{ x: number; y: number; z: number }>
  fitPoints: Array<{ x: number; y: number; z: number }>
  knots: number[]
  weights?: number[]
  degree: number
  length: number
  isFitPointSpline: boolean
  isControlPointSpline: boolean
  startPoint: SnapshotPoint
  endPoint: SnapshotPoint
} | null {
  try {
    const primitive = entity
      .subGetIntersectCurves()
      .find(candidate => candidate.kind === 'spline')
    if (!primitive || primitive.kind !== 'spline') return null
    const spline = primitive.spline
    return {
      controlPoints: spline.controlPoints,
      fitPoints: spline.fitPoints ?? [],
      knots: spline.knots,
      weights: spline.weights,
      degree: spline.degree,
      length: spline.length,
      isFitPointSpline: spline.isFitPointSpline,
      isControlPointSpline: spline.isControlPointSpline,
      startPoint: toSnapshotPoint(spline.startPoint),
      endPoint: toSnapshotPoint(spline.endPoint)
    }
  } catch {
    return null
  }
}

/**
 * Rebuilds hatch boundary loops as sampled polylines.
 *
 * Boundary primitives come back unordered and may run in either direction, so
 * edges are chained end to start until each loop closes.
 */
function hatchLoops(entity: AcDbHatch): Array<{
  closed: boolean
  points: SnapshotPoint[]
  length: number
}> {
  const pieces = hatchBoundaryPieces(entity)
  if (pieces.length === 0) return []

  const remaining = [...pieces]
  const loops: Array<{
    closed: boolean
    points: SnapshotPoint[]
    length: number
  }> = []

  while (remaining.length > 0) {
    const first = remaining.shift() as SnapshotCurvePiece
    const points = [...first.points]
    let closed = pointsClose(first.start, first.end)

    if (!closed) {
      let cursor = first.end
      while (remaining.length > 0) {
        const index = remaining.findIndex(
          piece =>
            pointsClose(piece.start, cursor) || pointsClose(piece.end, cursor)
        )
        if (index < 0) break
        const next = remaining.splice(index, 1)[0] as SnapshotCurvePiece
        const ordered = pointsClose(next.start, cursor)
          ? next.points
          : [...next.points].reverse()
        points.push(...ordered.slice(1))
        cursor = ordered[ordered.length - 1] as SnapshotPoint
        if (pointsClose(cursor, points[0] as SnapshotPoint)) {
          closed = true
          break
        }
      }
    }

    loops.push({
      closed,
      points,
      length: polylinePathLength(points, closed)
    })
  }
  return loops
}

function hatchBoundaryPieces(entity: AcDbHatch): SnapshotCurvePiece[] {
  let primitives: Array<{ kind: string }> = []
  try {
    primitives = entity.subGetIntersectCurves()
  } catch {
    return []
  }
  const pieces: SnapshotCurvePiece[] = []
  for (const primitive of primitives) {
    const piece = sampleBoundaryPrimitive(primitive)
    if (piece) pieces.push(piece)
  }
  return pieces
}

function sampleBoundaryPrimitive(
  primitive: unknown
): SnapshotCurvePiece | undefined {
  const candidate = primitive as {
    kind?: string
    line?: { startPoint: SnapshotPoint; endPoint: SnapshotPoint }
    arc?: {
      startPoint: SnapshotPoint
      endPoint: SnapshotPoint
      getPoints: (count: number) => SnapshotPoint[]
    }
    spline?: {
      startPoint: SnapshotPoint
      endPoint: SnapshotPoint
      getPoints: (count: number) => SnapshotPoint[]
    }
  }
  try {
    if (candidate.kind === 'line' && candidate.line) {
      const points = [
        toSnapshotPoint(candidate.line.startPoint),
        toSnapshotPoint(candidate.line.endPoint)
      ]
      return {
        start: points[0] as SnapshotPoint,
        end: points[1] as SnapshotPoint,
        points
      }
    }
    if (candidate.kind === 'circArc' && candidate.arc) {
      const points = candidate.arc
        .getPoints(ARC_LOOP_SAMPLES)
        .map(point => toSnapshotPoint(point))
      return {
        start: toSnapshotPoint(candidate.arc.startPoint),
        end: toSnapshotPoint(candidate.arc.endPoint),
        points
      }
    }
    if (candidate.kind === 'ellipseArc' && candidate.arc) {
      const points = candidate.arc
        .getPoints(ARC_LOOP_SAMPLES)
        .map(point => toSnapshotPoint(point))
      return {
        start: toSnapshotPoint(candidate.arc.startPoint),
        end: toSnapshotPoint(candidate.arc.endPoint),
        points
      }
    }
    if (candidate.kind === 'spline' && candidate.spline) {
      const points = candidate.spline
        .getPoints(SPLINE_LOOP_SAMPLES)
        .map(point => toSnapshotPoint(point))
      return {
        start: toSnapshotPoint(candidate.spline.startPoint),
        end: toSnapshotPoint(candidate.spline.endPoint),
        points
      }
    }
  } catch {
    return undefined
  }
  return undefined
}

/** Drops common MTEXT formatting codes so text can be searched and grouped. */
function stripMTextControlCodes(text: string): string {
  return text
    .replace(/\\[PpNn]/g, '\n')
    .replace(/\\[A-Za-z][^;]*;/g, '')
    .replace(/[{}]/g, '')
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

function indexedNumbers(
  count: number,
  read: (index: number) => number
): number[] {
  const values: number[] = []
  for (let index = 0; index < count; index++) {
    const value = read(index)
    values.push(Number.isFinite(value) ? value : 0)
  }
  return values
}

function summed(count: number, read: (index: number) => number): number {
  return indexedNumbers(count, read).reduce((total, value) => total + value, 0)
}

function optionalPoint(
  point: { x: number; y: number; z?: number } | undefined
): SnapshotPoint | undefined {
  return point ? toSnapshotPoint(point) : undefined
}

function polylinePathLength(
  points: readonly SnapshotPoint[],
  closed = false
): number {
  if (points.length < 2) return 0
  let total = 0
  for (let index = 1; index < points.length; index++) {
    total += distance(
      points[index - 1] as SnapshotPoint,
      points[index] as SnapshotPoint
    )
  }
  if (closed) {
    total += distance(
      points[points.length - 1] as SnapshotPoint,
      points[0] as SnapshotPoint
    )
  }
  return total
}

function arcLength(radius: number, startAngle: number, endAngle: number) {
  let delta = endAngle - startAngle
  while (delta < 0) delta += Math.PI * 2
  return radius * delta
}

function pointsClose(a: SnapshotPoint, b: SnapshotPoint): boolean {
  return (
    Math.abs(a.x - b.x) <= LOOP_JOIN_TOLERANCE &&
    Math.abs(a.y - b.y) <= LOOP_JOIN_TOLERANCE &&
    Math.abs(a.z - b.z) <= LOOP_JOIN_TOLERANCE
  )
}

function distance(
  a: { x: number; y: number; z?: number },
  b: { x: number; y: number; z?: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0))
}

function subtract(
  a: { x: number; y: number; z?: number },
  b: { x: number; y: number; z?: number }
): SnapshotPoint {
  return { x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) }
}

function normalize(vector: SnapshotPoint): SnapshotPoint {
  const length = Math.hypot(vector.x, vector.y, vector.z)
  if (length === 0) return { x: 0, y: 0, z: 0 }
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length }
}

function degrees(radians: number): number {
  return (radians * 180) / Math.PI
}