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

export enum AcDb3dVertexType {
  /**
   * A standard vertex within the polyface mesh.
   */
  SimpleVertex,
  /**
   * A control point for a spline or curve-fit mesh.
   */
  ControlVertex,
  /**
   * A vertex that was automatically generated as the result of a spline or curve-fit operation.
   * This type of vertex can go away or change automatically during subsequent editing operations
   * on the mesh.
   */
  FitVertex
}

/**
 * Represents the vertices within 3D polylines in AutoCAD.
 */
export class AcDb3dVertex extends AcDbEntity {
  /** The entity type name */
  static override typeName: string = '3dVertex'

  /** The WCS point value of this vertex */
  private _position: AcGePoint3d
  /** The vertex type */
  private _vertexType: AcDb3dVertexType

  /**
   * Creates a new 3d vertex entity.
   */
  constructor() {
    super()
    this._position = new AcGePoint3d()
    this._vertexType = AcDb3dVertexType.SimpleVertex
  }

  /**
   * Gets the WCS point value of this vertex.
   *
   * @returns The WCS point value of this vertex.
   */
  get position(): AcGePoint3d {
    return this._position
  }

  /**
   * Sets WCS point value of this vertex.
   *
   * @param value - The WCS point value of this vertex.
   */
  set position(value: AcGePoint3dLike) {
    this._position.copy(value)
  }

  /**
   * Gets the type of this vertex.
   * @returns The type of this vertex
   */
  get vertexType(): AcDb3dVertexType {
    return this._vertexType
  }

  /**
   * Sets the type of this vertex.
   * @param value - The type of this vertex
   */
  set vertexType(value: AcDb3dVertexType) {
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
   * Draws nothing because it will be drawn by its parent 3d polyline.
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
    filer.writeSubclassMarker('AcDb3dPolylineVertex')
    filer.writePoint3d(10, this.position)
    filer.writeInt16(70, this.vertexType | 32)
    return this
  }
}
