import { AcCmTransparency } from '@mlightcad/common'
import {
  ArcEntity,
  AttdefEntity,
  AttributeEntity,
  FaceEntity,
  HatchSolidFill,
  SmoothType,
  VertexFlag
} from '@mlightcad/dxf-json'
import { CircleEntity } from '@mlightcad/dxf-json'
import {
  ArcEdge,
  BoundaryPathEdge,
  EdgeBoundaryPath,
  EllipseEdge,
  HatchEntity,
  LineEdge,
  PolylineBoundaryPath,
  SplineEdge
} from '@mlightcad/dxf-json'
import {
  CommonDxfEntity,
  EllipseEntity,
  ImageEntity,
  InsertEntity,
  LeaderEntity,
  LineEntity,
  LWPolylineEntity,
  MTextEntity,
  PointEntity,
  PolylineEntity,
  RayEntity,
  SolidEntity,
  SplineEntity,
  TableEntity,
  TextEntity,
  ViewportEntity,
  WipeoutEntity,
  XLineEntity
} from '@mlightcad/dxf-json'
import {
  AlignedDimensionEntity,
  AngularDimensionEntity,
  DimensionEntityCommon,
  OrdinateDimensionEntity,
  RadialDiameterDimensionEntity
} from '@mlightcad/dxf-json'
import {
  AcGeCircArc2d,
  AcGeEllipseArc2d,
  AcGeLine2d,
  AcGeLoop2d,
  AcGeMathUtil,
  AcGePoint2d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGePolyline2d,
  AcGeSpline3d,
  AcGeVector2d,
  AcGeVector3d
} from '@mlightcad/geometry-engine'
import {
  AcGiMTextAttachmentPoint,
  AcGiMTextFlowDirection
} from '@mlightcad/graphic-interface'

import {
  AcDb2dPolyline,
  AcDb3dPolyline,
  AcDb3PointAngularDimension,
  AcDbAlignedDimension,
  AcDbArc,
  AcDbAttribute,
  AcDbAttributeDefinition,
  AcDbAttributeFlags,
  AcDbAttributeMTextFlag,
  AcDbBlockReference,
  AcDbCircle,
  AcDbDiametricDimension,
  AcDbDimension,
  AcDbEllipse,
  AcDbEntity,
  AcDbFace,
  AcDbHatch,
  AcDbHatchPatternType,
  AcDbHatchStyle,
  AcDbLeader,
  AcDbLeaderAnnotationType,
  AcDbLine,
  AcDbLineSpacingStyle,
  AcDbMText,
  AcDbOrdinateDimension,
  AcDbPoint,
  AcDbPoly2dType,
  AcDbPoly3dType,
  AcDbPolyline,
  AcDbRadialDimension,
  AcDbRasterImage,
  AcDbRasterImageClipBoundaryType,
  AcDbRay,
  AcDbSpline,
  AcDbTable,
  AcDbTableCell,
  AcDbText,
  AcDbTextHorizontalMode,
  AcDbTextVerticalMode,
  AcDbTrace,
  AcDbViewport,
  AcDbWipeout,
  AcDbXline
} from '../entity'

/**
 * Converts DXF entities to AcDbEntity objects.
 *
 * This class provides functionality to convert various DXF entity types
 * (such as lines, circles, arcs, text, etc.) into their corresponding
 * AcDbEntity objects. It handles the conversion of geometric data,
 * properties, and attributes from DXF format to the internal database format.
 *
 * @example
 * ```typescript
 * const converter = new AcDbEntityConverter();
 * const dxfEntity = { type: 'LINE', startPoint: [0, 0, 0], endPoint: [10, 10, 0] };
 * const acDbEntity = converter.convert(dxfEntity);
 * ```
 */
export class AcDbEntityConverter {
  /**
   * Converts a DXF entity to an AcDbEntity.
   *
   * This method takes a DXF entity and converts it to the corresponding
   * AcDbEntity type. It first creates the entity using createEntity(),
   * then processes common attributes using processCommonAttrs().
   *
   * @param entity - The DXF entity to convert
   * @returns The converted AcDbEntity, or null if conversion fails
   *
   * @example
   * ```typescript
   * const dxfLine = { type: 'LINE', startPoint: [0, 0, 0], endPoint: [10, 10, 0] };
   * const acDbLine = converter.convert(dxfLine);
   * if (acDbLine) {
   *   console.log('Converted to:', acDbLine.type);
   * }
   * ```
   */
  convert(entity: CommonDxfEntity): AcDbEntity | null {
    const dbEntity = this.createEntity(entity)
    if (dbEntity) {
      this.processCommonAttrs(entity, dbEntity)
    }
    return dbEntity
  }

  /**
   * Creates the corresponding drawing database entity from DXF format data.
   *
   * This method acts as a factory that routes DXF entities to their specific
   * conversion methods based on the entity type. It handles all supported
   * DXF entity types including geometric entities, text entities, and special entities.
   *
   * @param entity - Input entity data in DXF format
   * @returns The converted drawing database entity, or null if the entity type is not supported
   *
   * @example
   * ```typescript
   * const dxfEntity = { type: 'CIRCLE', center: [0, 0, 0], radius: 5 };
   * const acDbEntity = converter.createEntity(dxfEntity);
   * ```
   */
  private createEntity(entity: CommonDxfEntity): AcDbEntity | null {
    if (entity.type == '3DFACE') {
      return this.convertFace(entity as FaceEntity)
    } else if (entity.type == 'ARC') {
      return this.convertArc(entity as ArcEntity)
    } else if (entity.type == 'ATTDEF') {
      return this.convertAttributeDefinition(entity as AttdefEntity)
    } else if (entity.type == 'ATTRIB') {
      return this.convertAttribute(entity as AttributeEntity)
    } else if (entity.type == 'CIRCLE') {
      return this.convertCirle(entity as CircleEntity)
    } else if (entity.type == 'DIMENSION') {
      return this.convertDimension(entity as DimensionEntityCommon)
    } else if (entity.type == 'ELLIPSE') {
      return this.convertEllipse(entity as EllipseEntity)
    } else if (entity.type == 'HATCH') {
      return this.convertHatch(entity as HatchEntity)
    } else if (entity.type == 'IMAGE') {
      return this.convertImage(entity as ImageEntity)
    } else if (entity.type == 'LEADER') {
      return this.convertLeader(entity as LeaderEntity)
    } else if (entity.type == 'LINE') {
      return this.convertLine(entity as LineEntity)
    } else if (entity.type == 'LWPOLYLINE') {
      return this.convertLWPolyline(entity as LWPolylineEntity)
    } else if (entity.type == 'MTEXT') {
      return this.convertMText(entity as MTextEntity)
    } else if (entity.type == 'POLYLINE') {
      return this.convertPolyline(entity as PolylineEntity)
    } else if (entity.type == 'POINT') {
      return this.convertPoint(entity as PointEntity)
    } else if (entity.type == 'RAY') {
      return this.convertRay(entity as RayEntity)
    } else if (entity.type == 'SPLINE') {
      return this.convertSpline(entity as SplineEntity)
    } else if (entity.type == 'ACAD_TABLE') {
      return this.convertTable(entity as TableEntity)
    } else if (entity.type == 'TEXT') {
      return this.convertText(entity as TextEntity)
    } else if (entity.type == 'SOLID') {
      return this.convertSolid(entity as SolidEntity)
    } else if (entity.type == 'VIEWPORT') {
      return this.convertViewport(entity as ViewportEntity)
    } else if (entity.type == 'WIPEOUT') {
      return this.convertWipeout(entity as WipeoutEntity)
    } else if (entity.type == 'XLINE') {
      return this.convertXline(entity as XLineEntity)
    } else if (entity.type == 'INSERT') {
      return this.convertBlockReference(entity as InsertEntity)
    }
    return null
  }

  /**
   * Converts a DXF 3DFACE entity to an AcDbFace.
   *
   * @param face - The DXF 3DFace entity to convert
   * @returns The converted AcDbFace entity
   */
  private convertFace(face: FaceEntity) {
    const dbEntity = new AcDbFace()
    face.vertices.forEach((vertex, index) =>
      dbEntity.setVertexAt(index, vertex)
    )
    return dbEntity
  }

  /**
   * Converts a DXF arc entity to an AcDbArc.
   *
   * @param arc - The DXF arc entity to convert
   * @returns The converted AcDbArc entity
   *
   * @example
   * ```typescript
   * const dxfArc = { type: 'ARC', center: [0, 0, 0], radius: 5, startAngle: 0, endAngle: 90 };
   * const acDbArc = converter.convertArc(dxfArc);
   * ```
   */
  private convertArc(arc: ArcEntity) {
    const dbEntity = new AcDbArc(
      arc.center,
      arc.radius,
      AcGeMathUtil.degToRad(arc.startAngle),
      AcGeMathUtil.degToRad(arc.endAngle),
      arc.extrusionDirection ?? AcGeVector3d.Z_AXIS
    )
    return dbEntity
  }

  private convertAttributeCommon(
    attrib: AttributeEntity | AttdefEntity,
    dbAttrib: AcDbAttribute | AcDbAttributeDefinition
  ) {
    dbAttrib.textString = attrib.text
    dbAttrib.height = attrib.textHeight
    dbAttrib.position.copy(attrib.startPoint)
    dbAttrib.rotation = attrib.rotation
    dbAttrib.oblique = attrib.obliqueAngle ?? 0
    dbAttrib.thickness = attrib.thickness
    dbAttrib.tag = attrib.tag
    dbAttrib.fieldLength = 0 // dxf-json doesn't have this field
    dbAttrib.isInvisible =
      (attrib.attributeFlag & AcDbAttributeFlags.Invisible) !== 0
    dbAttrib.isConst = (attrib.attributeFlag & AcDbAttributeFlags.Const) !== 0
    dbAttrib.isVerifiable =
      (attrib.attributeFlag & AcDbAttributeFlags.Verifiable) !== 0
    dbAttrib.isPreset = (attrib.attributeFlag & AcDbAttributeFlags.Preset) !== 0
    dbAttrib.isReallyLocked = !!attrib.isReallyLocked
    dbAttrib.isMTextAttribute =
      (attrib.mtextFlag & AcDbAttributeMTextFlag.MultiLine) !== 0
    dbAttrib.isConstMTextAttribute =
      (attrib.mtextFlag & AcDbAttributeMTextFlag.ConstMultiLine) !== 0
  }

  private convertAttribute(attrib: AttributeEntity) {
    const dbAttrib = new AcDbAttribute()
    this.convertAttributeCommon(attrib, dbAttrib)
    dbAttrib.styleName = attrib.textStyle
    dbAttrib.horizontalMode =
      attrib.horizontalJustification as AcDbTextHorizontalMode
    dbAttrib.verticalMode = attrib.verticalJustification as AcDbTextVerticalMode
    dbAttrib.widthFactor = attrib.scale ?? 1
    dbAttrib.lockPositionInBlock = attrib.lockPositionFlag
    return dbAttrib
  }

  private convertAttributeDefinition(attrib: AttdefEntity) {
    const dbAttDef = new AcDbAttributeDefinition()
    this.convertAttributeCommon(attrib, dbAttDef)
    dbAttDef.styleName = attrib.styleName
    dbAttDef.horizontalMode = attrib.halign as unknown as AcDbTextHorizontalMode
    dbAttDef.verticalMode = attrib.valign as unknown as AcDbTextVerticalMode
    dbAttDef.widthFactor = attrib.xScale ?? 1
    dbAttDef.prompt = attrib.prompt
    return dbAttDef
  }

  /**
   * Converts a DXF circle entity to an AcDbCircle.
   *
   * @param circle - The DXF circle entity to convert
   * @returns The converted AcDbCircle entity
   *
   * @example
   * ```typescript
   * const dxfCircle = { type: 'CIRCLE', center: [0, 0, 0], radius: 5 };
   * const acDbCircle = converter.convertCirle(dxfCircle);
   * ```
   */
  private convertCirle(circle: CircleEntity) {
    const dbEntity = new AcDbCircle(
      circle.center,
      circle.radius,
      circle.extrusionDirection ?? AcGeVector3d.Z_AXIS
    )
    return dbEntity
  }

  /**
   * Converts a DXF ellipse entity to an AcDbEllipse.
   *
   * @param ellipse - The DXF ellipse entity to convert
   * @returns The converted AcDbEllipse entity
   *
   * @example
   * ```typescript
   * const dxfEllipse = { type: 'ELLIPSE', center: [0, 0, 0], majorAxisEndPoint: [5, 0, 0] };
   * const acDbEllipse = converter.convertEllipse(dxfEllipse);
   * ```
   */
  private convertEllipse(ellipse: EllipseEntity) {
    const majorAxis = new AcGeVector3d(ellipse.majorAxisEndPoint)
    const majorAxisRadius = majorAxis.length()
    const dbEntity = new AcDbEllipse(
      ellipse.center,
      ellipse.extrusionDirection ?? AcGeVector3d.Z_AXIS,
      majorAxis,
      majorAxisRadius,
      majorAxisRadius * ellipse.axisRatio,
      ellipse.startAngle,
      ellipse.endAngle
    )
    return dbEntity
  }

  private convertLine(line: LineEntity) {
    const start = line.startPoint
    const end = line.endPoint
    const dbEntity = new AcDbLine(
      new AcGePoint3d(start.x, start.y, start.z || 0),
      new AcGePoint3d(end.x, end.y, end.z || 0)
    )
    return dbEntity
  }

  private convertSpline(spline: SplineEntity) {
    // Catch error to construct spline because it maybe one spline in one block.
    // If don't catch the error, the block conversion may be interruptted.
    try {
      if (spline.numberOfControlPoints > 0 && spline.numberOfKnots > 0) {
        return new AcDbSpline(
          spline.controlPoints,
          spline.knots,
          spline.weights,
          spline.degree,
          !!(spline.flag & 0x01)
        )
      } else if (spline.numberOfFitPoints > 0) {
        const fitPoints = this.numberArrayToPointArray(
          spline.fitPoints,
          spline.numberOfFitPoints
        )
        if (fitPoints != null) {
          return new AcDbSpline(
            fitPoints,
            'Uniform',
            spline.degree,
            !!(spline.flag & 0x01)
          )
        }
      }
    } catch (error) {
      console.log(`Failed to convert spline with error: ${error}`)
    }
    return null
  }

  private convertPoint(point: PointEntity) {
    const dbEntity = new AcDbPoint()
    dbEntity.position = point.position
    return dbEntity
  }

  private convertSolid(solid: SolidEntity) {
    const dbEntity = new AcDbTrace()
    solid.points.forEach((point, index) => dbEntity.setPointAt(index, point))
    dbEntity.thickness = solid.thickness
    return dbEntity
  }

  private convertPolyline(polyline: PolylineEntity) {
    // Polyline flag (bit-coded; default = 0):
    // https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-ABF6B778-BE20-4B49-9B58-A94E64CEFFF3
    //
    // 1 = This is a closed polyline (or a polygon mesh closed in the M direction)
    // 2 = Curve-fit vertices have been added
    // 4 = Spline-fit vertices have been added
    // 8 = This is a 3D polyline
    // 16 = This is a 3D polygon mesh
    // 32 = The polygon mesh is closed in the N direction
    // 64 = The polyline is a polyface mesh
    // 128 = The linetype pattern is generated continuously around the vertices of this polyline
    const isClosed = !!(polyline.flag & 0x01)
    const is3dPolyline = !!(polyline.flag & 0x08)
    // Filter out spline control points
    const vertices: AcGePoint3dLike[] = []
    const bulges: number[] = []
    polyline.vertices.map(vertex => {
      if (!(vertex.flag & VertexFlag.SPLINE_CONTROL_POINT)) {
        vertices.push({
          x: vertex.x,
          y: vertex.y,
          z: vertex.z
        })
        bulges.push(vertex.bulge ?? 0)
      }
    })
    if (is3dPolyline) {
      let polyType = AcDbPoly3dType.SimplePoly
      if (polyline.flag & 0x04) {
        if (polyline.smoothType == SmoothType.CUBIC) {
          polyType = AcDbPoly3dType.CubicSplinePoly
        } else if (polyline.smoothType == SmoothType.QUADRATIC) {
          polyType = AcDbPoly3dType.QuadSplinePoly
        }
      }
      return new AcDb3dPolyline(polyType, vertices, isClosed)
    } else {
      let polyType = AcDbPoly2dType.SimplePoly
      if (polyline.flag & 0x02) {
        polyType = AcDbPoly2dType.FitCurvePoly
      } else if (polyline.flag & 0x04) {
        if (polyline.smoothType == SmoothType.CUBIC) {
          polyType = AcDbPoly2dType.CubicSplinePoly
        } else if (polyline.smoothType == SmoothType.QUADRATIC) {
          polyType = AcDbPoly2dType.QuadSplinePoly
        }
      }
      return new AcDb2dPolyline(
        polyType,
        vertices,
        0,
        isClosed,
        polyline.startWidth,
        polyline.endWidth,
        bulges
      )
    }
  }

  private convertLWPolyline(polyline: LWPolylineEntity) {
    const dbEntity = new AcDbPolyline()
    dbEntity.closed = !!(polyline.flag & 0x01)
    polyline.vertices.forEach((vertex, index) => {
      dbEntity.addVertexAt(
        index,
        new AcGePoint2d(vertex.x, vertex.y),
        vertex.bulge,
        vertex.startWidth,
        vertex.endWidth
      )
    })
    return dbEntity
  }

  private convertHatch(hatch: HatchEntity) {
    const dbEntity = new AcDbHatch()

    hatch.definitionLines?.forEach(item => {
      dbEntity.definitionLines.push({
        angle: item.angle,
        base: item.base,
        offset: item.offset,
        dashLengths: item.numberOfDashLengths > 0 ? item.dashLengths : []
      })
    })
    dbEntity.isSolidFill = hatch.solidFill == HatchSolidFill.SolidFill
    dbEntity.hatchStyle = hatch.hatchStyle as unknown as AcDbHatchStyle
    dbEntity.patternName = hatch.patternName
    dbEntity.patternType = hatch.patternType as unknown as AcDbHatchPatternType
    dbEntity.patternAngle = hatch.patternAngle == null ? 0 : hatch.patternAngle
    dbEntity.patternScale = hatch.patternScale == null ? 0 : hatch.patternScale

    const paths = hatch.boundaryPaths
    paths.forEach(path => {
      const flag = path.boundaryPathTypeFlag
      // Check whether it is a polyline
      if (flag & 0x02) {
        const polylinePath = path as PolylineBoundaryPath
        const polyline = new AcGePolyline2d()
        polyline.closed = polylinePath.isClosed
        polylinePath.vertices.forEach((vertex, index) => {
          polyline.addVertexAt(index, {
            x: vertex.x,
            y: vertex.y,
            bulge: vertex.bulge
          })
        })
        dbEntity.add(polyline)
      } else {
        const edgePath = path as EdgeBoundaryPath<BoundaryPathEdge>
        const loop = new AcGeLoop2d()
        edgePath.edges.forEach(edge => {
          if (edge.type == 1) {
            const line = edge as LineEdge
            loop.add(new AcGeLine2d(line.start, line.end))
          } else if (edge.type == 2) {
            const arc = edge as ArcEdge
            loop.add(
              new AcGeCircArc2d(
                arc.center,
                arc.radius,
                AcGeMathUtil.degToRad(arc.startAngle || 0),
                AcGeMathUtil.degToRad(arc.endAngle || 0),
                !arc.isCCW
              )
            )
          } else if (edge.type == 3) {
            const ellipse = edge as EllipseEdge
            const majorAxis = new AcGeVector2d()
            majorAxis.subVectors(ellipse.end, ellipse.center)
            const majorAxisRadius = Math.sqrt(
              Math.pow(ellipse.end.x, 2) + Math.pow(ellipse.end.y, 2)
            )
            // Property name 'lengthOfMinorAxis' is really confusing.
            // Actually length of minor axis means percentage of major axis length.
            const minorAxisRadius = majorAxisRadius * ellipse.lengthOfMinorAxis
            let startAngle = AcGeMathUtil.degToRad(ellipse.startAngle || 0)
            let endAngle = AcGeMathUtil.degToRad(ellipse.endAngle || 0)
            const rotation = Math.atan2(ellipse.end.y, ellipse.end.x)
            if (!ellipse.isCCW) {
              // when clockwise, need to handle start/end angles
              startAngle = Math.PI * 2 - startAngle
              endAngle = Math.PI * 2 - endAngle
            }
            loop.add(
              new AcGeEllipseArc2d(
                { ...ellipse.center, z: 0 },
                majorAxisRadius,
                minorAxisRadius,
                startAngle,
                endAngle,
                !ellipse.isCCW,
                rotation
              )
            )
          } else if (edge.type == 4) {
            const spline = edge as SplineEdge
            if (spline.numberOfControlPoints > 0 && spline.numberOfKnots > 0) {
              const controlPoints: AcGePoint3dLike[] = spline.controlPoints.map(
                item => {
                  return {
                    x: item.x,
                    y: item.y,
                    z: 0
                  }
                }
              )
              let hasWeights = true
              const weights: number[] = spline.controlPoints.map(item => {
                if (item.weight == null) hasWeights = false
                return item.weight || 1
              })
              loop.add(
                new AcGeSpline3d(
                  controlPoints,
                  spline.knots,
                  hasWeights ? weights : undefined
                )
              )
            } else if (spline.numberOfFitData > 0) {
              const fitPoints: AcGePoint3dLike[] = spline.fitDatum.map(item => {
                return {
                  x: item.x,
                  y: item.y,
                  z: 0
                }
              })
              loop.add(new AcGeSpline3d(fitPoints, 'Uniform'))
            }
          }
        })
        dbEntity.add(loop)
      }
    })
    return dbEntity
  }

  private convertTable(table: TableEntity) {
    const dbEntity = new AcDbTable(
      table.name,
      table.rowCount,
      table.columnCount
    )
    dbEntity.attachmentPoint =
      table.attachmentPoint as unknown as AcGiMTextAttachmentPoint
    dbEntity.position.copy(table.startPoint)
    table.columnWidthArr.forEach((width, index) =>
      dbEntity.setColumnWidth(index, width)
    )
    table.rowHeightArr.forEach((height, index) =>
      dbEntity.setRowHeight(index, height)
    )
    table.cells.forEach((cell, index) => {
      dbEntity.setCell(index, cell as unknown as AcDbTableCell)
    })
    return dbEntity
  }

  private convertText(text: TextEntity) {
    const dbEntity = new AcDbText()
    dbEntity.textString = text.text
    dbEntity.styleName = text.styleName
    dbEntity.height = text.textHeight
    dbEntity.position.copy(text.startPoint)
    dbEntity.rotation = AcGeMathUtil.degToRad(text.rotation || 0)
    dbEntity.oblique = text.obliqueAngle ?? 0
    dbEntity.thickness = text.thickness
    dbEntity.horizontalMode = text.halign as unknown as AcDbTextHorizontalMode
    dbEntity.verticalMode = text.valign as unknown as AcDbTextVerticalMode
    dbEntity.widthFactor = text.xScale ?? 1
    return dbEntity
  }

  private convertMText(mtext: MTextEntity) {
    const dbEntity = new AcDbMText()
    dbEntity.contents = mtext.text
    if (mtext.styleName != null) {
      dbEntity.styleName = mtext.styleName
    }
    dbEntity.height = mtext.height
    dbEntity.width = mtext.width
    dbEntity.rotation = AcGeMathUtil.degToRad(mtext.rotation || 0)
    dbEntity.location = mtext.insertionPoint as AcGePoint3d
    dbEntity.attachmentPoint =
      mtext.attachmentPoint as unknown as AcGiMTextAttachmentPoint
    if (mtext.direction) {
      dbEntity.direction = new AcGeVector3d(mtext.direction)
    }
    dbEntity.drawingDirection =
      mtext.drawingDirection as unknown as AcGiMTextFlowDirection
    return dbEntity
  }

  private convertLeader(leader: LeaderEntity) {
    const dbEntity = new AcDbLeader()
    leader.vertices.forEach(point => {
      dbEntity.appendVertex(point)
    })
    dbEntity.hasArrowHead = leader.isArrowheadEnabled
    dbEntity.hasHookLine = leader.isHooklineExists
    dbEntity.isSplined = leader.isSpline
    dbEntity.dimensionStyle = leader.styleName
    dbEntity.annoType =
      leader.leaderCreationFlag as unknown as AcDbLeaderAnnotationType
    return dbEntity
  }

  private convertDimension(dimension: DimensionEntityCommon) {
    if (
      dimension.subclassMarker == 'AcDbAlignedDimension' ||
      dimension.subclassMarker == 'AcDbRotatedDimension'
    ) {
      const entity = dimension as AlignedDimensionEntity
      const dbEntity = new AcDbAlignedDimension(
        entity.subDefinitionPoint1,
        entity.subDefinitionPoint2,
        entity.definitionPoint
      )
      if (entity.insertionPoint) {
        dbEntity.dimBlockPosition = { ...entity.insertionPoint, z: 0 }
      }
      dbEntity.rotation = AcGeMathUtil.degToRad(entity.rotationAngle || 0)
      this.processDimensionCommonAttrs(dimension, dbEntity)
      return dbEntity
    } else if (dimension.subclassMarker == 'AcDb3PointAngularDimension') {
      const entity = dimension as AngularDimensionEntity
      const dbEntity = new AcDb3PointAngularDimension(
        entity.centerPoint,
        entity.subDefinitionPoint1,
        entity.subDefinitionPoint2,
        entity.definitionPoint
      )
      this.processDimensionCommonAttrs(dimension, dbEntity)
      return dbEntity
    } else if (dimension.subclassMarker == 'AcDbOrdinateDimension') {
      const entity = dimension as OrdinateDimensionEntity
      const dbEntity = new AcDbOrdinateDimension(
        entity.subDefinitionPoint1,
        entity.subDefinitionPoint2
      )
      this.processDimensionCommonAttrs(dimension, dbEntity)
      return dbEntity
    } else if (dimension.subclassMarker == 'AcDbRadialDimension') {
      const entity = dimension as RadialDiameterDimensionEntity
      const dbEntity = new AcDbRadialDimension(
        entity.definitionPoint,
        entity.centerPoint,
        entity.leaderLength
      )
      this.processDimensionCommonAttrs(dimension, dbEntity)
      return dbEntity
    } else if (dimension.subclassMarker == 'AcDbDiametricDimension') {
      const entity = dimension as RadialDiameterDimensionEntity
      const dbEntity = new AcDbDiametricDimension(
        entity.definitionPoint,
        entity.centerPoint,
        entity.leaderLength
      )
      this.processDimensionCommonAttrs(dimension, dbEntity)
      return dbEntity
    }
    return null
  }

  private processImage(image: ImageEntity, dbImage: AcDbRasterImage) {
    dbImage.position.copy(image.position)
    dbImage.brightness = image.brightness
    dbImage.contrast = image.contrast
    dbImage.fade = image.fade

    dbImage.isShownClipped = (image.flags | 0x0004) > 0
    dbImage.isImageShown = (image.flags | 0x0003) > 0
    dbImage.isImageTransparent = (image.flags | 0x0008) > 0
    dbImage.imageDefId = image.imageDefHandle
    dbImage.isClipped = image.isClipped
    image.clippingBoundaryPath.forEach(point => {
      dbImage.clipBoundary.push(new AcGePoint2d(point))
    })

    // Calculate the scale factors
    dbImage.width =
      Math.sqrt(
        image.uPixel.x ** 2 + image.uPixel.y ** 2 + image.uPixel.z ** 2
      ) * image.imageSize.x
    dbImage.height =
      Math.sqrt(
        image.vPixel.x ** 2 + image.vPixel.y ** 2 + image.vPixel.z ** 2
      ) * image.imageSize.y

    // Calculate the rotation angle
    // Rotation is determined by the angle of the U-vector relative to the X-axis
    dbImage.rotation = Math.atan2(image.uPixel.y, image.uPixel.x)
  }

  private convertImage(image: ImageEntity) {
    const dbImage = new AcDbRasterImage()
    this.processImage(image, dbImage)
    dbImage.clipBoundaryType =
      image.clippingBoundaryType as unknown as AcDbRasterImageClipBoundaryType
    return dbImage
  }

  private processWipeout(wipeout: WipeoutEntity, dbWipeout: AcDbWipeout) {
    dbWipeout.position.copy(wipeout.position)
    dbWipeout.brightness = wipeout.brightness
    dbWipeout.contrast = wipeout.contrast
    dbWipeout.fade = wipeout.fade

    dbWipeout.isShownClipped = (wipeout.displayFlag | 0x0004) > 0
    dbWipeout.isImageShown = (wipeout.displayFlag | 0x0003) > 0
    dbWipeout.isImageTransparent = (wipeout.displayFlag | 0x0008) > 0
    dbWipeout.imageDefId = wipeout.imageDefHardId
    dbWipeout.isClipped = wipeout.isClipping
    wipeout.boundary.forEach(point => {
      dbWipeout.clipBoundary.push(new AcGePoint2d(point))
    })
    dbWipeout.clipBoundaryType =
      wipeout.boundaryType as unknown as AcDbRasterImageClipBoundaryType

    // Calculate the scale factors
    dbWipeout.width =
      Math.sqrt(
        wipeout.uDirection.x ** 2 +
          wipeout.uDirection.y ** 2 +
          wipeout.uDirection.z ** 2
      ) * wipeout.imageSize.x
    dbWipeout.height =
      Math.sqrt(
        wipeout.vDirection.x ** 2 +
          wipeout.vDirection.y ** 2 +
          wipeout.vDirection.z ** 2
      ) * wipeout.imageSize.y

    // Calculate the rotation angle
    // Rotation is determined by the angle of the U-vector relative to the X-axis
    dbWipeout.rotation = Math.atan2(wipeout.uDirection.y, wipeout.uDirection.x)
  }

  private convertWipeout(wipeout: WipeoutEntity) {
    const dbWipeout = new AcDbWipeout()
    this.processWipeout(wipeout, dbWipeout)
    return dbWipeout
  }

  private convertViewport(viewport: ViewportEntity) {
    const dbViewport = new AcDbViewport()
    dbViewport.number = viewport.viewportId
    dbViewport.centerPoint.copy(viewport.viewportCenter)
    dbViewport.height = viewport.height
    dbViewport.width = viewport.width
    dbViewport.viewCenter.copy(viewport.displayCenter)
    dbViewport.viewHeight = viewport.viewHeight
    return dbViewport
  }

  private convertRay(ray: RayEntity) {
    const dbRay = new AcDbRay()
    dbRay.basePoint.copy(ray.position)
    dbRay.unitDir.copy(ray.direction)
    return dbRay
  }

  private convertXline(xline: XLineEntity) {
    const dbXline = new AcDbXline()
    dbXline.basePoint.copy(xline.position)
    dbXline.unitDir.copy(xline.direction)
    return dbXline
  }

  private convertBlockReference(blockReference: InsertEntity) {
    const dbBlockReference = new AcDbBlockReference(blockReference.name)
    if (blockReference.insertionPoint)
      dbBlockReference.position.copy(blockReference.insertionPoint)
    dbBlockReference.scaleFactors.x = blockReference.xScale || 1
    dbBlockReference.scaleFactors.y = blockReference.yScale || 1
    dbBlockReference.scaleFactors.z = blockReference.zScale || 1
    dbBlockReference.rotation =
      blockReference.rotation != null
        ? AcGeMathUtil.degToRad(blockReference.rotation)
        : 0
    dbBlockReference.normal.copy(
      blockReference.extrusionDirection ?? { x: 0, y: 0, z: 1 }
    )
    return dbBlockReference
  }

  private processDimensionCommonAttrs(
    entity: DimensionEntityCommon,
    dbEntity: AcDbDimension
  ) {
    dbEntity.dimBlockId = entity.name
    dbEntity.textPosition.copy(entity.textPoint)
    dbEntity.textRotation = entity.textRotation || 0
    if (entity.textLineSpacingFactor) {
      dbEntity.textLineSpacingFactor = entity.textLineSpacingFactor
    }
    if (entity.textLineSpacingStyle) {
      dbEntity.textLineSpacingStyle =
        entity.textLineSpacingStyle as unknown as AcDbLineSpacingStyle
    }
    dbEntity.dimensionStyleName = entity.styleName
    dbEntity.dimensionText = entity.text || ''
    dbEntity.measurement = entity.measurement
    dbEntity.normal.copy(entity.extrusionDirection ?? { x: 0, y: 0, z: 1 })
  }

  /**
   * Processes common attributes from a DXF entity to an AcDbEntity.
   *
   * This method copies common properties like layer, object ID, owner ID,
   * linetype, lineweight, color, visibility, and transparency from the
   * DXF entity to the corresponding AcDbEntity.
   *
   * @param entity - The source DXF entity
   * @param dbEntity - The target AcDbEntity to populate
   *
   * @example
   * ```typescript
   * converter.processCommonAttrs(dxfEntity, acDbEntity);
   * ```
   */
  private processCommonAttrs(entity: CommonDxfEntity, dbEntity: AcDbEntity) {
    dbEntity.layer = entity.layer || '0'
    // I found some dxf file may have entity without handle. If so, let's use objectId
    // created by AcDbObject constructor instead.
    if (entity.handle) dbEntity.objectId = entity.handle
    dbEntity.ownerId = entity.ownerBlockRecordSoftId || ''
    if (entity.lineType != null) {
      dbEntity.lineType = entity.lineType
    }
    if (entity.lineweight != null) {
      dbEntity.lineWeight = entity.lineweight
    }
    if (entity.lineTypeScale != null) {
      dbEntity.linetypeScale = entity.lineTypeScale
    }
    if (entity.color != null) {
      dbEntity.color.setRGBValue(entity.color)
    }
    if (entity.colorIndex != null) {
      dbEntity.color.colorIndex = entity.colorIndex
    }
    if (entity.colorName) {
      dbEntity.color.colorName = entity.colorName
    }
    if (entity.isVisible != null) {
      dbEntity.visibility = entity.isVisible
    }
    if (entity.transparency != null) {
      dbEntity.transparency = AcCmTransparency.deserialize(entity.transparency)
    }
  }

  /**
   * Converts a number array to an array of 3D points.
   *
   * This utility method takes a flat array of numbers and converts it to
   * an array of AcGePoint3dLike objects. It automatically detects whether
   * the input represents 2D or 3D points based on the array length and
   * number of points.
   *
   * @param numbers - Flat array of numbers representing point coordinates
   * @param numberOfPoints - Expected number of points in the array
   * @returns Array of AcGePoint3dLike objects, or undefined if the conversion fails
   *
   * @example
   * ```typescript
   * const numbers = [0, 0, 10, 10, 20, 20]; // 3 points in 2D
   * const points = converter.numberArrayToPointArray(numbers, 3);
   * // Returns: [{x: 0, y: 0, z: 0}, {x: 10, y: 10, z: 0}, {x: 20, y: 20, z: 0}]
   * ```
   */
  private numberArrayToPointArray(numbers: number[], numberOfPoints: number) {
    const count = numbers.length
    let dimension = 0
    if (count / 2 == numberOfPoints) {
      dimension = 2
    } else if (count / 3 == numberOfPoints) {
      dimension = 3
    }
    if (dimension == 0) return undefined

    const points: AcGePoint3dLike[] = []
    for (let index = 0, size = count / dimension; index < size; ++index) {
      points.push({
        x: numbers[index * dimension],
        y: numbers[index * dimension + 1],
        z: dimension == 3 ? numbers[index * dimension + 2] : 0
      })
    }
    return points
  }
}
