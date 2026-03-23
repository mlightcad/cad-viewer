import {
  AcGeBox3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/geometry-engine'

import { AcDbDxfFiler } from '../../base'
import { AcDbDimension } from './AcDbDimension'

/**
 * Represents an ordinate dimension entity in AutoCAD.
 *
 * Ordinate dimensions measure the "horizontal" (X axis) or "vertical" (Y axis) distance
 * from a specified origin point to some other specified point. They are commonly used
 * in mechanical drawings, architectural plans, and other technical documentation where
 * precise coordinate measurements are required.
 *
 * The dimension displays a leader line from the defining point to the leader end point,
 * with the annotation text located appropriately near the end of the leader. Ordinate
 * dimensions are particularly useful for dimensioning parts with multiple features that
 * need to be positioned relative to a common reference point.
 */
export class AcDbOrdinateDimension extends AcDbDimension {
  /** The entity type name */
  static override typeName: string = 'OrdinateDimension'

  private _definingPoint: AcGePoint3d
  private _leaderEndPoint: AcGePoint3d

  /**
   * Creates a new ordinate dimension.
   *
   * @param definingPoint - The point where the ordinate leader should start. This is
   *                        the point being measured relative to the dimension's origin
   * @param leaderEndPoint - The point where the ordinate leader should end. This point
   *                         is used for the dimension leader's endpoint and in text
   *                         position calculations
   * @param dimText - Optional custom dimension text to display instead of the calculated
   *                  coordinate value. If null, the calculated coordinate will be displayed
   * @param dimStyle - Optional name of the dimension style table record to use for
   *                   formatting. If null, the current default style will be used
   */
  constructor(
    definingPoint: AcGePoint3dLike,
    leaderEndPoint: AcGePoint3dLike,
    dimText: string | null = null,
    dimStyle: string | null = null
  ) {
    super()
    this._definingPoint = new AcGePoint3d().copy(definingPoint)
    this._leaderEndPoint = new AcGePoint3d().copy(leaderEndPoint)

    this.dimensionText = dimText
    // TODO: Set it to the current default dimStyle within the AutoCAD editor if dimStyle is null
    this.dimensionStyleName = dimStyle
  }

  /**
   * Gets or sets the ordinate point to be measured.
   *
   * This is the point (in WCS coordinates) that defines the location being measured.
   * The dimension measures the X or Y distance between this point and the dimension's
   * origin point, depending on the orientation of the ordinate dimension.
   *
   * @returns The defining point of the ordinate dimension
   */
  get definingPoint() {
    return this._definingPoint
  }
  set definingPoint(value: AcGePoint3d) {
    this._definingPoint.copy(value)
  }

  /**
   * Gets or sets the leader end point.
   *
   * This point is used as the dimension leader's endpoint and is used in the text
   * position calculations. It determines where the leader line ends and where the
   * dimension text is positioned relative to the leader.
   *
   * @returns The leader end point of the ordinate dimension
   */
  get leaderEndPoint() {
    return this._leaderEndPoint
  }
  set leaderEndPoint(value: AcGePoint3d) {
    this._leaderEndPoint.copy(value)
  }

  /**
   * Gets the geometric extents (bounding box) of this dimension entity.
   *
   * The geometric extents define the minimum bounding box that completely contains
   * the dimension entity, including all its components like the leader line and text.
   *
   * @returns A 3D bounding box containing the dimension entity
   * @inheritdoc
   */
  get geometricExtents() {
    // TODO: Finish it
    return new AcGeBox3d()
  }

  /**
   * Gets the number of arrow lines for this dimension.
   *
   * Ordinate dimensions typically don't use arrows since they are coordinate-based
   * measurements rather than distance measurements between two points.
   *
   * @returns The number of arrow lines (always 0 for ordinate dimensions)
   * @inheritdoc
   */
  protected get arrowLineCount() {
    return 0
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbOrdinateDimension')
    filer.writePoint3d(13, this.definingPoint)
    filer.writePoint3d(14, this.leaderEndPoint)
    return this
  }
}
