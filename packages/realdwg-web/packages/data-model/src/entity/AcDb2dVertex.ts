import {
  AcGeBox3d,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbOsnapMode } from '../misc'
import { AcDbEntity } from './AcDbEntity'

export enum AcDb2dVertexType {
  /**
   * A standard vertex within a 2D polyline.
   */
  Vertex = 0,
  /**
   * A vertex that was automatically generated as the result of a curve-fit operation.
   * This type of vertex can go away or change automatically during subsequent editing
   * operations on the polyline.
   */
  CurveFitVertex = 1,
  /**
   * A vertex that was automatically generated as the result of a spline-fit operation.
   * This type of vertex can go away or change automatically during subsequent editing
   * operations on the polyline.
   */
  SplineFitVertex = 8,
  /**
   * A control point for a spline or curve-fit polyline.
   */
  SplineCtlVertex
}

/**
 * Represents the vertices in 2D polylines.
 */
export class AcDb2dVertex extends AcDbEntity {
  /** The entity type name */
  static override typeName: string = '2dVertex'

  private _position: AcGePoint3d
  /**
   * The bulge factor used to indicate how much of an arc segment is present at this vertex.
   * The bulge factor is the tangent of one fourth the included angle for an arc segment, made
   * negative if the arc goes clockwise from the start point to the endpoint. A bulge of 0 indicates a
   * straight segment, and a bulge of 1 is a semicircle.
   */
  private _bulge: number
  /** The starting width at this vertex */
  private _startWidth: number
  /** The ending width at this vertex */
  private _endWidth: number
  /** The vertex type */
  private _vertexType: AcDb2dVertexType

  /**
   * Creates a new 2d vertex entity.
   */
  constructor() {
    super()
    this._position = new AcGePoint3d()
    this._bulge = 0
    this._startWidth = 0
    this._endWidth = 0
    this._vertexType = AcDb2dVertexType.Vertex
  }

  /**
   * Gets the position value of the vertex. The position point value must be in OCS coordinates
   * (the OCS of the polyline containing the vertex), not WCS. The Z coordinate is kept in the
   * owning AcDb2dPolyline only for historical purposes.
   *
   * @returns The position value of the vertex
   */
  get position(): AcGePoint3d {
    return this._position
  }

  /**
   * Sets the position value of the vertex. The position point value must be in OCS coordinates
   * (the OCS of the polyline containing the vertex), not WCS. The Z coordinate is kept in the
   * owning AcDb2dPolyline only for historical purposes.
   *
   * @param value - The position value of the vertex
   */
  set position(value: AcGePoint3dLike) {
    this._position.copy(value)
  }

  /**
   * Gets the vertex's bulge value.
   *
   * @returns The vertex's bulge value
   */
  get bulge(): number {
    return this._bulge
  }

  /**
   * Sets the vertex's bulge value.
   *
   * @param value - The vertex's bulge value
   */
  set bulge(value: number) {
    this._bulge = value
  }

  /**
   * Gets the start width for the vertex. The start width is used as the width at this vertex
   * for the polyline segment from this vertex to the next vertex.
   *
   * @returns The start width for the vertex
   */
  get startWidth(): number {
    return this._startWidth
  }

  /**
   * Sets the start width for the vertex. The start width is used as the width at this vertex
   * for the polyline segment from this vertex to the next vertex.
   *
   * @param value - The start width for the vertex
   */
  set startWidth(value: number) {
    this._startWidth = value
  }

  /**
   * Gets the end width for the vertex. The end width is used as the width at the end of the
   * polyline segment from this vertex to the next vertex.
   *
   * @returns The end width for the vertex
   */
  get endWidth(): number {
    return this._endWidth
  }

  /**
   * Sets the end width for the vertex. The end width is used as the width at the end of the
   * polyline segment from this vertex to the next vertex.
   *
   * @param value - The end width for the vertex
   */
  set endWidth(value: number) {
    this._endWidth = value
  }

  /**
   * Gets the type of this vertex.
   * @returns The type of this vertex
   */
  get vertexType(): AcDb2dVertexType {
    return this._vertexType
  }

  /**
   * Sets the type of this vertex.
   * @param value - The type of this vertex
   */
  set vertexType(value: AcDb2dVertexType) {
    this._vertexType = value
  }

  /**
   * Gets the geometric extents (bounding box) of this vertex.
   *
   * @returns The bounding box that encompasses the entire vertex
   */
  get geometricExtents() {
    return new AcGeBox3d().expandByPoint(this._position)
  }

  /**
   * Gets the grip points for this vertex.
   *
   * @returns Array of grip points (center, start point, end point)
   */
  subGetGripPoints() {
    const gripPoints = new Array<AcGePoint3d>()
    gripPoints.push(this._position)
    return gripPoints
  }

  /**
   * Gets the object snap points for this vertex.
   *
   * Object snap points are precise points that can be used for positioning
   * when drawing or editing. This method provides snap points based on the
   * specified snap mode.
   *
   * @param _osnapMode - The object snap mode
   * @param _pickPoint - The point where the user picked
   * @param _lastPoint - The last point
   * @param snapPoints - Array to populate with snap points
   */
  subGetOsnapPoints(
    _osnapMode: AcDbOsnapMode,
    _pickPoint: AcGePoint3dLike,
    _lastPoint: AcGePoint3dLike,
    snapPoints: AcGePoint3dLike[]
  ) {
    snapPoints.push(this._position)
  }

  /**
   * Transforms this vertex by the specified matrix.
   *
   * @param matrix - The transformation matrix to apply
   * @returns This vertex after transformation
   */
  transformBy(matrix: AcGeMatrix3d) {
    this._position.applyMatrix4(matrix)
    return this
  }

  /**
   * Draws nothing because it will be drawn by its parent 2d polyline.
   *
   * @param renderer - The renderer to use for drawing
   * @returns undefined
   */
  subWorldDraw(_renderer: AcGiRenderer): undefined {
    return undefined
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbVertex')
    filer.writeSubclassMarker('AcDb2dVertex')
    filer.writePoint3d(10, this.position)
    filer.writeDouble(40, this.startWidth)
    filer.writeDouble(41, this.endWidth)
    filer.writeDouble(42, this.bulge)
    filer.writeInt16(70, this.vertexType)
    return this
  }
}
