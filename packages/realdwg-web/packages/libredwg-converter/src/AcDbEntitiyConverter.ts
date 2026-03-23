import {
  AcCmTransparency,
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
  AcDbXline,
  AcGeCircArc2d,
  AcGeEllipseArc2d,
  AcGeLine2d,
  AcGeLoop2d,
  AcGePoint2d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGePolyline2d,
  AcGeSpline3d,
  AcGeVector2d,
  AcGeVector3d,
  AcGiMTextAttachmentPoint,
  AcGiMTextFlowDirection
} from '@mlightcad/data-model'
import type {
  Dwg3dFaceEntity,
  DwgAlignedDimensionEntity,
  DwgAngularDimensionEntity,
  DwgArcEdge,
  DwgArcEntity,
  DwgAttdefEntity,
  DwgAttribEntity,
  DwgBoundaryPathEdge,
  DwgCircleEntity,
  DwgDimensionEntityCommon,
  DwgEdgeBoundaryPath,
  DwgEllipseEdge,
  DwgEllipseEntity,
  DwgEntity,
  DwgHatchEntity,
  DwgImageEntity,
  DwgInsertEntity,
  DwgLeaderEntity,
  DwgLineEdge,
  DwgLineEntity,
  DwgLWPolylineEntity,
  DwgMTextEntity,
  DwgOrdinateDimensionEntity,
  DwgPointEntity,
  DwgPolyline2dEntity,
  DwgPolyline3dEntity,
  DwgPolylineBoundaryPath,
  DwgRadialDiameterDimensionEntity,
  DwgRayEntity,
  DwgSolidEntity,
  DwgSplineEdge,
  DwgSplineEntity,
  DwgTableEntity,
  DwgTextEntity,
  DwgViewportEntity,
  DwgWipeoutEntity,
  DwgXlineEntity
} from '@mlightcad/libredwg-web'

export class AcDbEntityConverter {
  convert(entity: DwgEntity): AcDbEntity | null {
    const dbEntity = this.createEntity(entity)
    if (dbEntity) {
      this.processCommonAttrs(entity, dbEntity)
    }
    return dbEntity
  }

  /**
   * Create the corresponding drawing database entity from data in dxf format
   * @param entity Input entity data in dxf format
   * @returns Return the converted drawing database entity
   */
  private createEntity(entity: DwgEntity): AcDbEntity | null {
    if (entity.type == '3DFACE') {
      return this.convertFace(entity as Dwg3dFaceEntity)
    } else if (entity.type == 'ARC') {
      return this.convertArc(entity as DwgArcEntity)
    } else if (entity.type == 'ATTDEF') {
      return this.convertAttributeDefinition(entity as DwgAttdefEntity)
    } else if (entity.type == 'CIRCLE') {
      return this.convertCirle(entity as DwgCircleEntity)
    } else if (entity.type == 'DIMENSION') {
      return this.convertDimension(entity as DwgDimensionEntityCommon)
    } else if (entity.type == 'ELLIPSE') {
      return this.convertEllipse(entity as DwgEllipseEntity)
    } else if (entity.type == 'HATCH') {
      return this.convertHatch(entity as DwgHatchEntity)
    } else if (entity.type == 'IMAGE') {
      return this.convertImage(entity as DwgImageEntity)
    } else if (entity.type == 'LEADER') {
      return this.convertLeader(entity as DwgLeaderEntity)
    } else if (entity.type == 'LINE') {
      return this.convertLine(entity as DwgLineEntity)
    } else if (entity.type == 'LWPOLYLINE') {
      return this.convertLWPolyline(entity as DwgLWPolylineEntity)
    } else if (entity.type == 'MTEXT') {
      return this.convertMText(entity as DwgMTextEntity)
    } else if (entity.type == 'POINT') {
      return this.convertPoint(entity as DwgPointEntity)
    } else if (entity.type == 'POLYLINE2D') {
      return this.convertPolyline2d(entity as DwgPolyline2dEntity)
    } else if (entity.type == 'POLYLINE3D') {
      return this.convertPolyline3d(entity as DwgPolyline3dEntity)
    } else if (entity.type == 'RAY') {
      return this.convertRay(entity as DwgRayEntity)
    } else if (entity.type == 'SPLINE') {
      return this.convertSpline(entity as DwgSplineEntity)
    } else if (entity.type == 'ACAD_TABLE') {
      return this.convertTable(entity as DwgTableEntity)
    } else if (entity.type == 'TEXT') {
      return this.convertText(entity as DwgTextEntity)
    } else if (entity.type == 'SOLID') {
      return this.convertSolid(entity as DwgSolidEntity)
    } else if (entity.type == 'VIEWPORT') {
      return this.convertViewport(entity as DwgViewportEntity)
    } else if (entity.type == 'WIPEOUT') {
      return this.convertWipeout(entity as DwgWipeoutEntity)
    } else if (entity.type == 'XLINE') {
      return this.convertXline(entity as DwgXlineEntity)
    } else if (entity.type == 'INSERT') {
      return this.convertBlockReference(entity as DwgInsertEntity)
    }
    return null
  }

  private convertFace(face: Dwg3dFaceEntity) {
    const dbEntity = new AcDbFace()
    if (face.corner1) dbEntity.setVertexAt(0, face.corner1)
    if (face.corner2) dbEntity.setVertexAt(1, face.corner2)
    if (face.corner3) dbEntity.setVertexAt(2, face.corner3)
    if (face.corner4) dbEntity.setVertexAt(3, face.corner4)
    dbEntity.setEdgeInvisibilities(face.flag)
    return dbEntity
  }

  private convertArc(arc: DwgArcEntity) {
    const dbEntity = new AcDbArc(
      arc.center,
      arc.radius,
      arc.startAngle,
      arc.endAngle,
      arc.extrusionDirection ?? AcGeVector3d.Z_AXIS
    )
    return dbEntity
  }

  private convertCirle(circle: DwgCircleEntity) {
    const dbEntity = new AcDbCircle(
      circle.center,
      circle.radius,
      circle.extrusionDirection ?? AcGeVector3d.Z_AXIS
    )
    return dbEntity
  }

  private convertEllipse(ellipse: DwgEllipseEntity) {
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

  private convertLine(line: DwgLineEntity) {
    const start = line.startPoint
    const end = line.endPoint
    const dbEntity = new AcDbLine(
      new AcGePoint3d(start.x, start.y, start.z),
      new AcGePoint3d(end.x, end.y, end.z)
    )
    return dbEntity
  }

  private convertSpline(spline: DwgSplineEntity) {
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
        return new AcDbSpline(
          spline.fitPoints,
          'Uniform',
          spline.degree,
          !!(spline.flag & 0x01)
        )
      }
    } catch (error) {
      console.log(`Failed to convert spline with error: ${error}`)
    }
    return null
  }

  private convertPoint(point: DwgPointEntity) {
    const dbEntity = new AcDbPoint()
    dbEntity.position = point.position
    return dbEntity
  }

  private convertSolid(solid: DwgSolidEntity) {
    const dbEntity = new AcDbTrace()
    dbEntity.setPointAt(0, { ...solid.corner1, z: 0 })
    dbEntity.setPointAt(1, { ...solid.corner2, z: 0 })
    dbEntity.setPointAt(2, { ...solid.corner3, z: 0 })
    dbEntity.setPointAt(
      3,
      solid.corner4 ? { ...solid.corner4, z: 0 } : { ...solid.corner3, z: 0 }
    )
    dbEntity.thickness = solid.thickness
    return dbEntity
  }

  private convertLWPolyline(polyline: DwgLWPolylineEntity) {
    // Libredwg changes meaning of the 'flag' field. '512' means closed.
    const dbEntity = new AcDbPolyline()
    dbEntity.closed = !!(polyline.flag & 0x200)
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

  private convertPolyline2d(polyline: DwgPolyline2dEntity) {
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

    // Filter out spline control points
    const vertices: AcGePoint3dLike[] = []
    const bulges: number[] = []
    polyline.vertices.map(vertex => {
      // Check whether it is one spline control point
      if (!(vertex.flag & 0x10)) {
        vertices.push({
          x: vertex.x,
          y: vertex.y,
          z: vertex.z
        })
        bulges.push(vertex.bulge ?? 0)
      }
    })

    let polyType = AcDbPoly2dType.SimplePoly
    if (polyline.flag & 0x02) {
      polyType = AcDbPoly2dType.FitCurvePoly
    } else if (polyline.flag & 0x04) {
      // Please don't use enum DwgSmoothType value here.
      // It will result in libredwg-web bundled in this package.
      if (polyline.smoothType == 6) {
        // DwgSmoothType.CUBIC
        polyType = AcDbPoly2dType.CubicSplinePoly
      } else if (polyline.smoothType == 5) {
        // DwgSmoothType.QUADRATIC
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

  private convertPolyline3d(polyline: DwgPolyline3dEntity) {
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

    // Filter out spline control points
    const vertices: AcGePoint3dLike[] = []
    polyline.vertices.map(vertex => {
      // Check whether it is one spline control point
      if (!(vertex.flag & 0x10)) {
        vertices.push({
          x: vertex.x,
          y: vertex.y,
          z: vertex.z
        })
      }
    })

    let polyType = AcDbPoly3dType.SimplePoly
    if (polyline.flag & 0x04) {
      // Please don't use enum DwgSmoothType value here.
      // It will result in libredwg-web bundled in this package.
      if (polyline.smoothType == 6) {
        // DwgSmoothType.CUBIC
        polyType = AcDbPoly3dType.CubicSplinePoly
      } else if (polyline.smoothType == 5) {
        // DwgSmoothType.QUADRATIC
        polyType = AcDbPoly3dType.QuadSplinePoly
      }
    }
    return new AcDb3dPolyline(polyType, vertices, isClosed)
  }

  private convertHatch(hatch: DwgHatchEntity) {
    const dbEntity = new AcDbHatch()

    hatch.definitionLines?.forEach(item => {
      dbEntity.definitionLines.push({
        angle: item.angle,
        base: item.base,
        offset: item.offset,
        dashLengths: item.numberOfDashLengths > 0 ? item.dashLengths : []
      })
    })
    // Important: Don't use DwgHatchSolidFill.SolidFill to avoid bundling libredwg-web into libredeg-converter
    dbEntity.isSolidFill = hatch.solidFill == 1
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
        const polylinePath = path as DwgPolylineBoundaryPath
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
        const edgePath = path as DwgEdgeBoundaryPath<DwgBoundaryPathEdge>
        const loop = new AcGeLoop2d()
        edgePath.edges.forEach(edge => {
          // TODO: It seems there are some issue on libredwg. Sometimes 'undefined' edges are added.
          if (edge == null) return
          if (edge.type == 1) {
            const line = edge as DwgLineEdge
            loop.add(new AcGeLine2d(line.start, line.end))
          } else if (edge.type == 2) {
            const arc = edge as DwgArcEdge
            loop.add(
              new AcGeCircArc2d(
                arc.center,
                arc.radius,
                arc.startAngle,
                arc.endAngle,
                !arc.isCCW
              )
            )
          } else if (edge.type == 3) {
            const ellipse = edge as DwgEllipseEdge
            const majorAxis = new AcGeVector2d()
            majorAxis.subVectors(ellipse.end, ellipse.center)
            const majorAxisRadius = Math.sqrt(
              Math.pow(ellipse.end.x, 2) + Math.pow(ellipse.end.y, 2)
            )
            // Property name 'lengthOfMinorAxis' is really confusing.
            // Actually length of minor axis means percentage of major axis length.
            const minorAxisRadius = majorAxisRadius * ellipse.lengthOfMinorAxis
            let startAngle = ellipse.startAngle
            let endAngle = ellipse.endAngle
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
            const spline = edge as DwgSplineEdge
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

  private convertTable(table: DwgTableEntity) {
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

  private convertText(text: DwgTextEntity) {
    const dbEntity = new AcDbText()
    dbEntity.textString = text.text
    dbEntity.styleName = text.styleName
    dbEntity.height = text.textHeight
    dbEntity.position.copy(text.startPoint)
    dbEntity.rotation = text.rotation
    dbEntity.oblique = text.obliqueAngle ?? 0
    dbEntity.thickness = text.thickness
    dbEntity.horizontalMode = text.halign as unknown as AcDbTextHorizontalMode
    dbEntity.verticalMode = text.valign as unknown as AcDbTextVerticalMode
    dbEntity.widthFactor = text.xScale ?? 1
    return dbEntity
  }

  private convertMText(mtext: DwgMTextEntity) {
    const dbEntity = new AcDbMText()
    dbEntity.contents = mtext.text
    if (mtext.styleName != null) {
      dbEntity.styleName = mtext.styleName
    }
    dbEntity.height = mtext.textHeight
    dbEntity.width = mtext.rectWidth
    dbEntity.rotation = mtext.rotation || 0
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

  private convertLeader(leader: DwgLeaderEntity) {
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

  private convertDimension(dimension: DwgDimensionEntityCommon) {
    if (
      dimension.subclassMarker == 'AcDbAlignedDimension' ||
      dimension.subclassMarker == 'AcDbRotatedDimension'
    ) {
      const entity = dimension as DwgAlignedDimensionEntity
      const dbEntity = new AcDbAlignedDimension(
        entity.subDefinitionPoint1,
        entity.subDefinitionPoint2,
        entity.definitionPoint
      )
      if (entity.insertionPoint) {
        dbEntity.dimBlockPosition = {
          x: entity.insertionPoint.x,
          y: entity.insertionPoint.y,
          z: 0
        }
      }
      dbEntity.rotation = entity.rotationAngle
      this.processDimensionCommonAttrs(dimension, dbEntity)
      return dbEntity
    } else if (dimension.subclassMarker == 'AcDb3PointAngularDimension') {
      const entity = dimension as DwgAngularDimensionEntity
      const dbEntity = new AcDb3PointAngularDimension(
        entity.centerPoint,
        entity.subDefinitionPoint1,
        entity.subDefinitionPoint2,
        entity.definitionPoint
      )
      this.processDimensionCommonAttrs(dimension, dbEntity)
      return dbEntity
    } else if (dimension.subclassMarker == 'AcDbOrdinateDimension') {
      const entity = dimension as DwgOrdinateDimensionEntity
      const dbEntity = new AcDbOrdinateDimension(
        entity.subDefinitionPoint1,
        entity.subDefinitionPoint2
      )
      this.processDimensionCommonAttrs(dimension, dbEntity)
      return dbEntity
    } else if (dimension.subclassMarker == 'AcDbRadialDimension') {
      const entity = dimension as DwgRadialDiameterDimensionEntity
      const dbEntity = new AcDbRadialDimension(
        entity.definitionPoint,
        entity.centerPoint,
        entity.leaderLength
      )
      this.processDimensionCommonAttrs(dimension, dbEntity)
      return dbEntity
    } else if (dimension.subclassMarker == 'AcDbDiametricDimension') {
      const entity = dimension as DwgRadialDiameterDimensionEntity
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

  private processImage(
    image: DwgImageEntity | DwgWipeoutEntity,
    dbImage: AcDbRasterImage
  ) {
    dbImage.position.copy(image.position)
    dbImage.brightness = image.brightness
    dbImage.contrast = image.contrast
    dbImage.fade = image.fade
    dbImage.imageDefId = image.imageDefHandle as string
    dbImage.isClipped = image.clipping > 0
    dbImage.isShownClipped = (image.flags | 0x0004) > 0
    dbImage.isImageShown = (image.flags | 0x0003) > 0
    dbImage.isImageTransparent = (image.flags | 0x0008) > 0
    image.clippingBoundaryPath.forEach(point => {
      dbImage.clipBoundary.push(new AcGePoint2d(point))
    })
    dbImage.clipBoundaryType =
      image.clippingBoundaryType as unknown as AcDbRasterImageClipBoundaryType

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

  private convertImage(image: DwgImageEntity) {
    const dbImage = new AcDbRasterImage()
    this.processImage(image, dbImage)
    return dbImage
  }

  private convertWipeout(wipeout: DwgWipeoutEntity) {
    const dbWipeout = new AcDbWipeout()
    this.processImage(wipeout, dbWipeout)
    return dbWipeout
  }

  private convertViewport(viewport: DwgViewportEntity) {
    const dbViewport = new AcDbViewport()
    dbViewport.number = viewport.viewportId
    dbViewport.centerPoint.copy(viewport.viewportCenter)
    dbViewport.height = viewport.height
    dbViewport.width = viewport.width
    dbViewport.viewCenter.copy(viewport.displayCenter)
    dbViewport.viewHeight = viewport.viewHeight
    return dbViewport
  }

  private convertRay(ray: DwgRayEntity) {
    const dbRay = new AcDbRay()
    dbRay.basePoint.copy(ray.firstPoint)
    dbRay.unitDir.copy(ray.unitDirection)
    return dbRay
  }

  private convertXline(xline: DwgXlineEntity) {
    const dbXline = new AcDbXline()
    dbXline.basePoint.copy(xline.firstPoint)
    dbXline.unitDir.copy(xline.unitDirection)
    return dbXline
  }

  private convertAttributeCommon(
    attrib: DwgAttribEntity | DwgAttdefEntity,
    dbAttrib: AcDbAttribute | AcDbAttributeDefinition
  ) {
    const text = attrib.text
    dbAttrib.textString = text.text
    dbAttrib.styleName = text.styleName
    dbAttrib.height = text.textHeight
    dbAttrib.position.copy(text.startPoint)
    dbAttrib.rotation = text.rotation
    dbAttrib.oblique = text.obliqueAngle ?? 0
    dbAttrib.thickness = text.thickness
    dbAttrib.horizontalMode = text.halign as unknown as AcDbTextHorizontalMode
    dbAttrib.verticalMode = text.valign as unknown as AcDbTextVerticalMode
    dbAttrib.widthFactor = text.xScale ?? 1
    dbAttrib.tag = attrib.tag
    dbAttrib.fieldLength = attrib.fieldLength
    dbAttrib.isInvisible = (attrib.flags & AcDbAttributeFlags.Invisible) !== 0
    dbAttrib.isConst = (attrib.flags & AcDbAttributeFlags.Const) !== 0
    dbAttrib.isVerifiable = (attrib.flags & AcDbAttributeFlags.Verifiable) !== 0
    dbAttrib.isPreset = (attrib.flags & AcDbAttributeFlags.Preset) !== 0
    dbAttrib.lockPositionInBlock = attrib.lockPositionFlag
    dbAttrib.isReallyLocked = attrib.isReallyLocked
    dbAttrib.isMTextAttribute =
      (attrib.mtextFlag & AcDbAttributeMTextFlag.MultiLine) !== 0
    dbAttrib.isConstMTextAttribute =
      (attrib.mtextFlag & AcDbAttributeMTextFlag.ConstMultiLine) !== 0
  }

  private convertAttribute(attrib: DwgAttribEntity) {
    const dbAttrib = new AcDbAttribute()
    this.convertAttributeCommon(attrib, dbAttrib)
    return dbAttrib
  }

  private convertAttributeDefinition(attrib: DwgAttdefEntity) {
    const dbAttDef = new AcDbAttributeDefinition()
    this.convertAttributeCommon(attrib, dbAttDef)
    dbAttDef.prompt = attrib.prompt
    return dbAttDef
  }

  private convertBlockReference(blockReference: DwgInsertEntity) {
    const dbBlockReference = new AcDbBlockReference(blockReference.name)
    if (blockReference.insertionPoint)
      dbBlockReference.position.copy(blockReference.insertionPoint)
    dbBlockReference.scaleFactors.x = blockReference.xScale
    dbBlockReference.scaleFactors.y = blockReference.yScale
    dbBlockReference.scaleFactors.z = blockReference.zScale
    dbBlockReference.rotation = blockReference.rotation
    dbBlockReference.normal.copy(blockReference.extrusionDirection)
    if (blockReference.attribs) {
      blockReference.attribs.forEach(attrib => {
        const dbAttrib = this.convertAttribute(attrib)
        dbBlockReference.appendAttributes(dbAttrib)
      })
    }
    return dbBlockReference
  }

  private processDimensionCommonAttrs(
    entity: DwgDimensionEntityCommon,
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
  }

  private processCommonAttrs(entity: DwgEntity, dbEntity: AcDbEntity) {
    dbEntity.layer = entity.layer || '0'
    dbEntity.objectId = entity.handle
    dbEntity.ownerId = entity.ownerBlockRecordSoftId
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
      const transparency = new AcCmTransparency()
      transparency.method = entity.transparencyType
      if (transparency.isByBlock || transparency.isByBlock) {
        transparency.alpha = entity.transparency
      }
      dbEntity.transparency = transparency
    }
  }
}
