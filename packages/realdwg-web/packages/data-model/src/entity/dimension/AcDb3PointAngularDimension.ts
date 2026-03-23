import {
  AcGeBox3d,
  AcGePoint3d,
  AcGePointLike
} from '@mlightcad/geometry-engine'

import { AcDbDxfFiler } from '../../base'
import { AcDbDimension } from './AcDbDimension'

/**
 * Represents a three-point angular dimension entity in AutoCAD.
 *
 * This dimension type measures the angle between two lines or edges by defining three points:
 * a center point and two points that define the lines or edges being measured. The dimension
 * displays the angle value and typically includes extension lines, dimension lines, and arrows.
 *
 * Three-point angular dimensions are commonly used to measure angles between non-parallel lines,
 * angles of arcs, or any angular measurement that requires three reference points.
 */
export class AcDb3PointAngularDimension extends AcDbDimension {
  /** The entity type name */
  static override typeName: string = '3PointAngularDimension'

  private _arcPoint: AcGePoint3d
  private _centerPoint: AcGePoint3d
  private _xLine1Point: AcGePoint3d
  private _xLine2Point: AcGePoint3d

  /**
   * Creates a new three-point angular dimension.
   *
   * @param centerPoint - The center point of the angle being measured. This is typically
   *                      the vertex where the two lines or edges meet
   * @param xLine1Point - The first extension line end point. This defines one of the
   *                      lines or edges being measured
   * @param xLine2Point - The second extension line end point. This defines the other
   *                      line or edge being measured
   * @param arcPoint - A point on the arc that represents the angle being measured.
   *                   This point helps determine the direction and extent of the angle
   * @param dimText - Optional custom dimension text to display instead of the calculated
   *                  angle value. If null, the calculated angle will be displayed
   * @param dimStyle - Optional name of the dimension style table record to use for
   *                   formatting. If null, the current default style will be used
   */
  constructor(
    centerPoint: AcGePointLike,
    xLine1Point: AcGePointLike,
    xLine2Point: AcGePointLike,
    arcPoint: AcGePointLike,
    dimText: string | null = null,
    dimStyle: string | null = null
  ) {
    super()
    this._centerPoint = new AcGePoint3d().copy(centerPoint)
    this._xLine1Point = new AcGePoint3d().copy(xLine1Point)
    this._xLine2Point = new AcGePoint3d().copy(xLine2Point)
    this._arcPoint = new AcGePoint3d().copy(arcPoint)

    this.dimensionText = dimText
    // TODO: Set it to the current default dimStyle within the AutoCAD editor if dimStyle is null
    this.dimensionStyleName = dimStyle
  }

  /**
   * Gets or sets a point on the arc that represents the angle being measured.
   *
   * This point is used to determine the direction and extent of the angle measurement.
   * It helps define which side of the angle should be measured and how the dimension
   * arc should be drawn.
   *
   * @returns The arc point that defines the angle measurement
   */
  get arcPoint() {
    return this._arcPoint
  }
  set arcPoint(value: AcGePoint3d) {
    this._arcPoint.copy(value)
  }

  /**
   * Gets or sets the center point of the angle being measured.
   *
   * The center point is the vertex where the two lines or edges meet. This point
   * serves as the reference for measuring the angle between the two extension lines.
   *
   * @returns The center point of the angle
   */
  get centerPoint() {
    return this._centerPoint
  }
  set centerPoint(value: AcGePoint3d) {
    this._centerPoint.copy(value)
  }

  /**
   * Gets or sets the first extension line end point.
   *
   * This point defines one of the lines or edges being measured. The extension line
   * extends from this point to the center point, helping to clearly identify the
   * first reference line for the angle measurement.
   *
   * @returns The first extension line end point
   */
  get xLine1Point() {
    return this._xLine1Point
  }
  set xLine1Point(value: AcGePoint3d) {
    this._xLine1Point.copy(value)
  }

  /**
   * Gets or sets the second extension line end point.
   *
   * This point defines the other line or edge being measured. The extension line
   * extends from this point to the center point, helping to clearly identify the
   * second reference line for the angle measurement.
   *
   * @returns The second extension line end point
   */
  get xLine2Point() {
    return this._xLine2Point
  }
  set xLine2Point(value: AcGePoint3d) {
    this._xLine2Point.copy(value)
  }

  /**
   * Gets the geometric extents (bounding box) of this dimension entity.
   *
   * The geometric extents define the minimum bounding box that completely contains
   * the dimension entity, including all its components like extension lines,
   * dimension lines, arrows, and text.
   *
   * @returns A 3D bounding box containing the dimension entity
   * @inheritdoc
   */
  get geometricExtents() {
    // TODO: Finish it
    return new AcGeBox3d()
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDb3PointAngularDimension')
    filer.writePoint3d(13, this.xLine1Point)
    filer.writePoint3d(14, this.xLine2Point)
    filer.writePoint3d(15, this.centerPoint)
    filer.writePoint3d(16, this.arcPoint)
    return this
  }
}
