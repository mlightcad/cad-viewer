import {
  AcCmTransparency,
  AcDbArc,
  AcDbBlockReference,
  AcDbCircle,
  AcDbEllipse,
  AcDbEntity,
  AcDbHatch,
  AcDbHatchPatternType,
  AcDbHatchStyle,
  AcDbLine,
  AcDbMText,
  AcDbPoint,
  AcDbPolyline,
  AcDbRay,
  AcDbSpline,
  AcDbText,
  AcDbTextHorizontalMode,
  AcDbTextVerticalMode,
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
  AcGeVector3d
} from '@mlightcad/data-model'
import {
  DRW_Arc,
  DRW_Circle,
  DRW_CoordList,
  DRW_DoubleList,
  DRW_Ellipse,
  DRW_Entity,
  DRW_Hatch,
  DRW_Insert,
  DRW_Line,
  DRW_LWPolyline,
  DRW_MText,
  DRW_Point,
  DRW_Ray,
  DRW_Spline,
  DRW_Text,
  DRW_Xline,
  MainModule
} from '@mlightcad/libdxfrw-web'

export class AcDbEntityConverter {
  convert(entity: DRW_Entity): AcDbEntity | null {
    const dbEntity = this.createEntity(entity)
    if (dbEntity) {
      this.processCommonAttrs(entity, dbEntity)
    }
    return dbEntity
  }

  private createEntity(entity: DRW_Entity): AcDbEntity | null {
    // @ts-expect-error libdxfrw is set in index.html
    const libdxfrw = window.libdxfrw as MainModule

    if (entity.eType == libdxfrw.DRW_ETYPE.ARC) {
      return this.convertArc(entity as DRW_Arc)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.CIRCLE) {
      return this.convertCirle(entity as DRW_Circle)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.DIMENSION) {
      // return this.convertDimension(entity as DimensionEntityCommon)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.ELLIPSE) {
      return this.convertEllipse(entity as DRW_Ellipse)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.HATCH) {
      return this.convertHatch(entity as DRW_Hatch)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.IMAGE) {
      // return this.convertImage(entity as ImageEntity)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.LEADER) {
      // return this.convertLeader(entity as LeaderEntity)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.LINE) {
      return this.convertLine(entity as DRW_Line)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.MTEXT) {
      return this.convertMText(entity as DRW_MText)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.POLYLINE) {
      // return this.convertPolyline(entity as DRW_Polyline)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.LWPOLYLINE) {
      return this.convertPolyline(entity as DRW_LWPolyline)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.POINT) {
      return this.convertPoint(entity as DRW_Point)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.RAY) {
      return this.convertRay(entity as DRW_Ray)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.SPLINE) {
      return this.convertSpline(entity as DRW_Spline)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.TEXT) {
      return this.convertText(entity as DRW_Text)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.SOLID) {
      // return this.convertSolid(entity as SolidEntity)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.VIEWPORT) {
      // return this.convertViewport(entity as ViewportEntity)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.XLINE) {
      return this.convertXline(entity as DRW_Xline)
    } else if (entity.eType == libdxfrw.DRW_ETYPE.INSERT) {
      return this.convertBlockReference(entity as DRW_Insert)
    }
    return null
  }

  private convertArc(arc: DRW_Arc) {
    const dbEntity = new AcDbArc(
      arc.center(),
      arc.radius,
      arc.startAngle,
      arc.endAngle
    )
    return dbEntity
  }

  private convertCirle(circle: DRW_Circle) {
    const dbEntity = new AcDbCircle(circle.basePoint, circle.radius)
    return dbEntity
  }

  private convertEllipse(ellipse: DRW_Ellipse) {
    const majorAxis = new AcGeVector3d(ellipse.secPoint)
    const majorAxisRadius = majorAxis.length()
    const dbEntity = new AcDbEllipse(
      ellipse.basePoint,
      AcGeVector3d.Z_AXIS,
      majorAxis,
      majorAxisRadius,
      majorAxisRadius * ellipse.ratio,
      ellipse.startAngle,
      ellipse.endAngle
    )
    return dbEntity
  }

  private convertBlockReference(blockReference: DRW_Insert) {
    const dbBlockReference = new AcDbBlockReference(blockReference.name)
    if (blockReference.basePoint)
      dbBlockReference.position.copy(blockReference.basePoint)
    dbBlockReference.scaleFactors.x = blockReference.xScale || 1
    dbBlockReference.scaleFactors.y = blockReference.yScale || 1
    dbBlockReference.scaleFactors.z = blockReference.zScale || 1
    dbBlockReference.rotation = blockReference.angle
    dbBlockReference.normal.copy(blockReference.extPoint)
    return dbBlockReference
  }

  private convertHatch(hatch: DRW_Hatch) {
    const dbEntity = new AcDbHatch()

    const definitionLines = hatch.definitionLines
    for (let index = 0, size = definitionLines.size(); index < size; ++index) {
      const definitionLine = definitionLines.get(index)
      if (definitionLine != null) {
        dbEntity.definitionLines.push({
          angle: definitionLine.angle,
          base: definitionLine.base,
          offset: definitionLine.offset,
          dashLengths: this.toNumberArray(definitionLine.dashPattern) // TODO: rename dashPattern to dashLengths
        })
      }
    }
    dbEntity.hatchStyle = hatch.hatchStyle as unknown as AcDbHatchStyle
    dbEntity.patternName = hatch.name
    dbEntity.patternType = hatch.patternType as unknown as AcDbHatchPatternType
    dbEntity.patternAngle = hatch.angle
    dbEntity.patternScale = hatch.scale

    const loops = hatch.getLoopList()
    for (let index = 0, size = loops.size(); index < size; ++index) {
      const loop = loops.get(index)
      if (loop != null) {
        // Check whether it is a polyline
        if (loop.type == 2) {
          const polylineLoop = loop.getObjList().get(0) as DRW_LWPolyline
          if (polylineLoop) {
            const polyline = new AcGePolyline2d()
            // polyline.closed = ??
            const vertices = polylineLoop.getVertexList()
            for (let index = 0, size = vertices.size(); index < size; ++index) {
              const vertex = vertices.get(index)
              if (vertex != null) {
                polyline.addVertexAt(index, {
                  x: vertex.x,
                  y: vertex.y,
                  bulge: vertex.bulge
                })
              }
            }
            dbEntity.add(polyline)
          }
        } else {
          // @ts-expect-error libdxfrw is set in index.html
          const libdxfrw = window.libdxfrw as MainModule

          const objects = loop.getObjList()
          const loopGeometry = new AcGeLoop2d()
          for (let index = 0, size = objects.size(); index < size; ++index) {
            const object = objects.get(index)
            if (object != null) {
              if (object.eType == libdxfrw.DRW_ETYPE.LINE) {
                const line = object as DRW_Line
                loopGeometry.add(new AcGeLine2d(line.basePoint, line.secPoint))
              } else if (object.eType == libdxfrw.DRW_ETYPE.ARC) {
                const arc = object as DRW_Arc
                loopGeometry.add(
                  new AcGeCircArc2d(
                    arc.center(),
                    arc.radius,
                    arc.startAngle,
                    arc.endAngle,
                    !arc.isccw
                  )
                )
              } else if (object.eType == libdxfrw.DRW_ETYPE.ELLIPSE) {
                const ellipse = object as DRW_Ellipse
                const center = ellipse.basePoint
                const secPoint = ellipse.secPoint
                const majorAxis = new AcGeVector2d(secPoint)
                const majorAxisRadius = majorAxis.length()
                const minorAxisRadius = majorAxisRadius * ellipse.ratio
                let startAngle = ellipse.startAngle
                let endAngle = ellipse.endAngle
                const rotation = Math.atan2(secPoint.y, secPoint.x)
                if (!ellipse.isCounterClockwise) {
                  // when clockwise, need to handle start/end angles
                  startAngle = Math.PI * 2 - startAngle
                  endAngle = Math.PI * 2 - endAngle
                }
                loopGeometry.add(
                  new AcGeEllipseArc2d(
                    { x: center.x, y: center.y, z: 0 },
                    majorAxisRadius,
                    minorAxisRadius,
                    startAngle,
                    endAngle,
                    !ellipse.isCounterClockwise,
                    rotation
                  )
                )
              } else if (object.eType == libdxfrw.DRW_ETYPE.SPLINE) {
                const spline = object as DRW_Spline
                if (spline.numberOfControls > 0 && spline.numberOfKnots > 0) {
                  const controlPoints: AcGePoint3dLike[] = this.toPointArray(
                    spline.getControlList(),
                    true
                  )
                  const weights: number[] = this.toNumberArray(spline.weights)
                  const knots: number[] = this.toNumberArray(spline.knots)
                  loopGeometry.add(
                    new AcGeSpline3d(
                      controlPoints,
                      knots,
                      weights.length > 0 ? weights : undefined
                    )
                  )
                } else if (spline.numberOfFits > 0) {
                  const fitPoints: AcGePoint3dLike[] = this.toPointArray(
                    spline.getFitList()
                  )
                  loopGeometry.add(new AcGeSpline3d(fitPoints, 'Uniform'))
                }
              }
            }
          }
          dbEntity.add(loopGeometry)
        }
      }
    }
    return dbEntity
  }

  private convertLine(line: DRW_Line) {
    const start = line.basePoint
    const end = line.secPoint
    const dbEntity = new AcDbLine(
      new AcGePoint3d(start.x, start.y, start.z || 0),
      new AcGePoint3d(end.x, end.y, end.z || 0)
    )
    return dbEntity
  }

  private convertMText(mtext: DRW_MText) {
    const dbEntity = new AcDbMText()
    dbEntity.contents = mtext.text
    if (mtext.style != null) {
      dbEntity.styleName = mtext.style
    }
    dbEntity.height = mtext.height
    // dbEntity.width = mtext.
    dbEntity.lineSpacingFactor = mtext.interlin
    dbEntity.rotation = mtext.angle || 0
    dbEntity.location = mtext.basePoint
    // dbEntity.attachmentPoint =
    //   mtext.attachmentPoint as unknown as AcGiMTextAttachmentPoint
    // if (mtext.direction) {
    //   dbEntity.direction = new AcGeVector3d(mtext.direction)
    // }
    // dbEntity.drawingDirection =
    //   mtext.drawingDirection as unknown as AcGiMTextFlowDirection
    return dbEntity
  }

  private convertPoint(point: DRW_Point) {
    const dbEntity = new AcDbPoint()
    dbEntity.position = point.basePoint
    return dbEntity
  }

  private convertPolyline(polyline: DRW_LWPolyline) {
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
    const dbEntity = new AcDbPolyline()
    dbEntity.closed = !!(polyline.flags & 0x01)
    const vertices = polyline.getVertexList()
    for (let index = 0, size = vertices.size(); index < size; ++index) {
      const vertex = vertices.get(index)
      if (vertex != null) {
        dbEntity.addVertexAt(
          index,
          new AcGePoint2d(vertex.x, vertex.y),
          vertex.bulge,
          vertex.startWidth,
          vertex.endWidth
        )
      }
    }
    return dbEntity
  }

  private convertRay(ray: DRW_Ray) {
    const dbRay = new AcDbRay()
    dbRay.basePoint.copy(ray.basePoint)
    dbRay.unitDir.copy(ray.secPoint)
    return dbRay
  }

  private convertSpline(spline: DRW_Spline) {
    const weights = this.toNumberArray(spline.weights)
    if (spline.numberOfControls > 0 && spline.numberOfKnots > 0) {
      return new AcDbSpline(
        this.toPointArray(spline.getControlList(), false),
        this.toNumberArray(spline.knots),
        weights.length > 0 ? weights : undefined,
        spline.degree, // Default degree
        !!(spline.flags & 0x01)
      )
    } else if (spline.numberOfFits > 0) {
      const fitPoints = this.toPointArray(spline.getFitList())
      if (fitPoints.length > 0) {
        return new AcDbSpline(
          fitPoints,
          'Uniform',
          spline.degree,
          !!(spline.flags & 0x01)
        )
      }
    }
    return null
  }

  private convertText(text: DRW_Text) {
    const dbEntity = new AcDbText()
    dbEntity.textString = text.text
    dbEntity.styleName = text.style
    dbEntity.height = text.height
    dbEntity.position.copy(text.basePoint)
    dbEntity.rotation = text.angle || 0
    dbEntity.oblique = text.oblique ?? 0
    // dbEntity.thickness = ??
    dbEntity.horizontalMode = text.alignH as unknown as AcDbTextHorizontalMode
    dbEntity.verticalMode = text.alignV as unknown as AcDbTextVerticalMode
    dbEntity.widthFactor = text.widthScale ?? 1
    return dbEntity
  }

  private convertXline(xline: DRW_Xline) {
    const dbXline = new AcDbXline()
    dbXline.basePoint.copy(xline.basePoint)
    dbXline.unitDir.copy(xline.secPoint)
    return dbXline
  }

  private processCommonAttrs(entity: DRW_Entity, dbEntity: AcDbEntity) {
    dbEntity.layer = entity.layer
    dbEntity.objectId = entity.handle.toString()
    dbEntity.ownerId = entity.parentHandle.toString()
    if (entity.lineType != null) {
      dbEntity.lineType = entity.lineType
    }
    if (entity.lWeight != null) {
      dbEntity.lineWeight = entity.lWeight as unknown as number
    }
    if (entity.ltypeScale != null) {
      dbEntity.linetypeScale = entity.ltypeScale
    }
    if (entity.color24 != null) {
      dbEntity.color.setRGBValue(entity.color24)
    }
    if (entity.color != null) {
      dbEntity.color.colorIndex = entity.color
    }
    if (entity.colorName) {
      dbEntity.color.colorName = entity.colorName
    }
    if (entity.visible != null) {
      dbEntity.visibility = entity.visible
    }
    if (entity.transparency != null) {
      dbEntity.transparency = AcCmTransparency.deserialize(entity.transparency)
    }
  }

  private toNumberArray(doubleList: DRW_DoubleList) {
    const results: number[] = []
    for (let index = 0, size = doubleList.size(); index < size; ++index) {
      const item = doubleList.get(index)
      if (item != null) {
        results.push(item)
      }
    }
    return results
  }

  private toPointArray(pointList: DRW_CoordList, resetZValue: boolean = true) {
    const results: AcGePoint3dLike[] = []
    for (let index = 0, size = pointList.size(); index < size; ++index) {
      const item = pointList.get(index)
      if (item != null) {
        results.push({ x: item.x, y: item.y, z: resetZValue ? 0 : item.z })
      }
    }
    return results
  }
}
