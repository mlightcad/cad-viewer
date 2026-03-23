import {
  AcGeBox3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/geometry-engine'
import { AcGiLineArrowStyle } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../../base'
import { AcDbLine } from '../AcDbLine'
import { AcDbDimension } from './AcDbDimension'

/**
 * Represents a radial dimension entity in AutoCAD.
 *
 * A radial dimension measures the radius of a curve (typically a circle or arc).
 * This dimension type requires a center point and a point on the curve being dimensioned
 * in order to draw the dimension line from the center point through the point on the curve.
 *
 * The dimension utilizes a "leader length" value to determine how far the dimension line
 * extends out past the curve before doing a horizontal dogleg (if necessary) to the annotation text.
 *
 * @example
 * ```typescript
 * // Create a radial dimension
 * const radialDim = new AcDbRadialDimension(
 *   new AcGePoint3d(0, 0, 0),    // Center point
 *   new AcGePoint3d(5, 0, 0),    // Point on curve
 *   2.0,                         // Leader length
 *   "5.0",                       // Dimension text
 *   "Standard"                   // Dimension style
 * );
 *
 * // Access dimension properties
 * console.log(`Center: ${radialDim.center}`);
 * console.log(`Chord point: ${radialDim.chordPoint}`);
 * console.log(`Leader length: ${radialDim.leaderLength}`);
 * ```
 */
export class AcDbRadialDimension extends AcDbDimension {
  /** The entity type name */
  static override typeName: string = 'RadialDimension'

  /** The center point of the curve being dimensioned */
  private _center: AcGePoint3d
  /** The point where the dimension line intersects the curve being dimensioned */
  private _chordPoint: AcGePoint3d
  /** The extension arc start angle in radians */
  private _extArcStartAngle: number
  /** The extension arc end angle in radians */
  private _extArcEndAngle: number
  /** The leader length distance */
  private _leaderLength: number

  /**
   * Creates a new radial dimension entity.
   *
   * This constructor initializes a radial dimension using the specified center point,
   * chord point, and leader length. The dimension line behavior depends on whether
   * the text is inside or outside the curve being dimensioned.
   *
   * - If the text is inside the curve, the dimension line is drawn from the center
   *   to the chordPoint, with a break for the annotation text.
   * - If the text is outside the curve, the dimension line is drawn from the center,
   *   through the chordPoint and out the leaderLength distance past the chordPoint
   *   where it does a short horizontal dogleg (if appropriate) to the annotation text.
   *
   * @param center - Center point (in WCS coordinates) of curve being dimensioned
   * @param chordPoint - Point (in WCS coordinates) on the curve being dimensioned
   * @param leaderLength - Leader length distance
   * @param dimText - Text string to use as the dimension annotation (optional)
   * @param dimStyle - String name of dimension style table record to use (optional)
   *
   * @example
   * ```typescript
   * // Create a radial dimension with default text and style
   * const radialDim = new AcDbRadialDimension(
   *   new AcGePoint3d(0, 0, 0),
   *   new AcGePoint3d(5, 0, 0),
   *   2.0
   * );
   *
   * // Create a radial dimension with custom text and style
   * const radialDim2 = new AcDbRadialDimension(
   *   new AcGePoint3d(10, 10, 0),
   *   new AcGePoint3d(15, 10, 0),
   *   3.0,
   *   "5.0",
   *   "Architectural"
   * );
   * ```
   */
  constructor(
    center: AcGePoint3dLike,
    chordPoint: AcGePoint3dLike,
    leaderLength: number,
    dimText: string | null = null,
    dimStyle: string | null = null
  ) {
    super()
    this._center = new AcGePoint3d().copy(center)
    this._chordPoint = new AcGePoint3d().copy(chordPoint)
    this._leaderLength = leaderLength
    this._extArcStartAngle = 0
    this._extArcEndAngle = 0

    this.dimensionText = dimText
    // TODO: Set it to the current default dimStyle within the AutoCAD editor if dimStyle is null
    this.dimensionStyleName = dimStyle
  }

  /**
   * Gets the center point of the curve being dimensioned.
   *
   * This point is the primary definition point for this dimension type.
   *
   * @returns The center point in WCS coordinates
   *
   * @example
   * ```typescript
   * const center = radialDim.center;
   * console.log(`Center point: ${center.x}, ${center.y}, ${center.z}`);
   * ```
   */
  get center() {
    return this._center
  }

  /**
   * Sets the center point of the curve being dimensioned.
   *
   * @param value - The new center point
   *
   * @example
   * ```typescript
   * radialDim.center = new AcGePoint3d(0, 0, 0);
   * ```
   */
  set center(value: AcGePoint3d) {
    this._center.copy(value)
  }

  /**
   * Gets the point where the dimension line intersects the curve being dimensioned.
   *
   * @returns The chord point in WCS coordinates
   *
   * @example
   * ```typescript
   * const chordPoint = radialDim.chordPoint;
   * console.log(`Chord point: ${chordPoint.x}, ${chordPoint.y}, ${chordPoint.z}`);
   * ```
   */
  get chordPoint() {
    return this._chordPoint
  }

  /**
   * Sets the point where the dimension line intersects the curve being dimensioned.
   *
   * @param value - The new chord point
   *
   * @example
   * ```typescript
   * radialDim.chordPoint = new AcGePoint3d(5, 0, 0);
   * ```
   */
  set chordPoint(value: AcGePoint3d) {
    this._chordPoint.copy(value)
  }

  /**
   * Gets the extension arc start angle.
   *
   * @returns The extension arc start angle in radians
   *
   * @example
   * ```typescript
   * const startAngle = radialDim.extArcStartAngle;
   * console.log(`Extension arc start angle: ${startAngle} radians`);
   * ```
   */
  get extArcStartAngle() {
    return this._extArcStartAngle
  }

  /**
   * Sets the extension arc start angle.
   *
   * @param value - The new extension arc start angle in radians
   *
   * @example
   * ```typescript
   * radialDim.extArcStartAngle = 0;
   * ```
   */
  set extArcStartAngle(value: number) {
    this._extArcStartAngle = value
  }

  /**
   * Gets the extension arc end angle.
   *
   * @returns The extension arc end angle in radians
   *
   * @example
   * ```typescript
   * const endAngle = radialDim.extArcEndAngle;
   * console.log(`Extension arc end angle: ${endAngle} radians`);
   * ```
   */
  get extArcEndAngle() {
    return this._extArcEndAngle
  }

  /**
   * Sets the extension arc end angle.
   *
   * @param value - The new extension arc end angle in radians
   *
   * @example
   * ```typescript
   * radialDim.extArcEndAngle = Math.PI / 2;
   * ```
   */
  set extArcEndAngle(value: number) {
    this._extArcEndAngle = value
  }

  /**
   * Gets the leader length.
   *
   * The leader length is the distance from the chordPoint dimension definition point
   * out to where the dimension does a horizontal dogleg to the annotation text
   * (or stops if no dogleg is needed).
   *
   * @returns The leader length value
   *
   * @example
   * ```typescript
   * const leaderLength = radialDim.leaderLength;
   * console.log(`Leader length: ${leaderLength}`);
   * ```
   */
  get leaderLength() {
    return this._leaderLength
  }

  /**
   * Sets the leader length.
   *
   * @param value - The new leader length value
   *
   * @example
   * ```typescript
   * radialDim.leaderLength = 3.0;
   * ```
   */
  set leaderLenght(value: number) {
    this._leaderLength = value
  }

  /**
   * @inheritdoc
   */
  get geometricExtents() {
    // TODO: Finish it
    return new AcGeBox3d()
  }

  /**
   * @inheritdoc
   */
  protected getLineArrowStyle(_line: AcDbLine): AcGiLineArrowStyle | undefined {
    return {
      secondArrow: this.secondArrowStyle
    }
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbRadialDimension')
    filer.writePoint3d(15, this.center)
    filer.writePoint3d(13, this.chordPoint)
    filer.writeDouble(40, this.leaderLength)
    filer.writeAngle(52, this.extArcStartAngle)
    filer.writeAngle(53, this.extArcEndAngle)
    return this
  }
}
