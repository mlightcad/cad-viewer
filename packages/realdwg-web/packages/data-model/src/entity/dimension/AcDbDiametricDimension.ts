import {
  AcGeBox3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/geometry-engine'
import {
  AcGiEntity,
  AcGiLineArrowStyle,
  AcGiRenderer
} from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../../base'
import { AcDbLine } from '../AcDbLine'
import { AcDbDimension } from './AcDbDimension'

/**
 * Represents a diametric dimension entity in AutoCAD.
 *
 * This dimension type measures the diameter of a circle or arc by defining two points
 * that lie on the curve and are diametrically opposite each other. Diametric dimensions
 * are essential for circular features in mechanical drawings, architectural plans, and
 * other technical documentation.
 *
 * The dimension behavior varies based on text placement:
 * - If the text is inside the curve being dimensioned, the dimension line will be drawn
 *   from the farChordPoint to the chordPoint, with a break for the annotation text.
 * - If the dimension text is outside the curve being dimensioned, the dimension line is
 *   drawn from the farChordPoint, through the chordPoint, and extends out the leaderLength
 *   distance past the chordPoint, where it will do a short horizontal dogleg (if appropriate)
 *   to the annotation text.
 */
export class AcDbDiametricDimension extends AcDbDimension {
  /** The entity type name */
  static override typeName: string = 'DiametricDimension'

  private _chordPoint: AcGePoint3d
  private _farChordPoint: AcGePoint3d
  private _extArcStartAngle: number
  private _extArcEndAngle: number
  private _leaderLength: number

  /**
   * Creates a new diametric dimension.
   *
   * @param chordPoint - The point (in WCS coordinates) on the curve being dimensioned
   *                     where the dimension line intersects and extends outside the curve
   *                     (if the text is outside the curve)
   * @param farChordPoint - The point (in WCS coordinates) on the curve being dimensioned
   *                        that is diametrically opposite the chordPoint. This defines the
   *                        other end of the diameter measurement
   * @param leaderLength - The distance from the chordPoint to where the dimension will
   *                       do a horizontal dogleg to the annotation text. This is only
   *                       used when the text is outside the curve
   * @param dimText - Optional custom dimension text to display instead of the calculated
   *                  diameter value. If null, the calculated diameter will be displayed
   * @param dimStyle - Optional name of the dimension style table record to use for
   *                   formatting. If null, the current default style will be used
   */
  constructor(
    chordPoint: AcGePoint3dLike,
    farChordPoint: AcGePoint3dLike,
    leaderLength: number = 0,
    dimText: string | null = null,
    dimStyle: string | null = null
  ) {
    super()
    this._chordPoint = new AcGePoint3d().copy(chordPoint)
    this._farChordPoint = new AcGePoint3d().copy(farChordPoint)
    this._extArcStartAngle = 0
    this._extArcEndAngle = 0
    this._leaderLength = leaderLength

    this.dimensionText = dimText
    // TODO: Set it to the current default dimStyle within the AutoCAD editor if dimStyle is null
    this.dimensionStyleName = dimStyle
  }

  /**
   * Gets or sets the chord point where the dimension line intersects the curve.
   *
   * This is the point (in WCS coordinates) where the dimension line intersects the curve
   * being dimensioned and extends outside the curve, if the text is outside the curve.
   * It represents one end of the diameter measurement.
   *
   * @returns The chord point of the dimension
   */
  get chordPoint() {
    return this._chordPoint
  }
  set chordPoint(value: AcGePoint3d) {
    this._chordPoint.copy(value)
  }

  /**
   * Gets or sets the far chord point of the curve being dimensioned.
   *
   * This is the point (in WCS coordinates) on the curve that is diametrically opposite
   * the point where the dimension line extends outside the curve. It represents the other
   * end of the diameter measurement.
   *
   * @returns The far chord point of the dimension
   */
  get farChordPoint() {
    return this._farChordPoint
  }
  set farChordPoint(value: AcGePoint3d) {
    this._farChordPoint.copy(value)
  }

  /**
   * Gets or sets the extension arc start angle.
   *
   * This angle defines the starting point of the extension arc that may be drawn
   * to connect the dimension line to the curve being dimensioned.
   *
   * @returns The extension arc start angle in radians
   */
  get extArcStartAngle() {
    return this._extArcStartAngle
  }
  set extArcStartAngle(value: number) {
    this._extArcStartAngle = value
  }

  /**
   * Gets or sets the extension arc end angle.
   *
   * This angle defines the ending point of the extension arc that may be drawn
   * to connect the dimension line to the curve being dimensioned.
   *
   * @returns The extension arc end angle in radians
   */
  get extArcEndAngle() {
    return this._extArcEndAngle
  }
  set extArcEndAngle(value: number) {
    this._extArcEndAngle = value
  }

  /**
   * Gets the leader length for the dimension.
   *
   * The leader length is the distance from the chordPoint dimension definition point,
   * out to where the dimension will do a horizontal dogleg to the annotation text
   * (or stop if no dogleg is necessary). This is only used when the text is outside
   * the curve being dimensioned.
   *
   * @returns The leader length in drawing units
   */
  get leaderLength() {
    return this._leaderLength
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

  /**
   * Draws the dimension lines with appropriate arrow styles.
   *
   * This method handles the rendering of dimension lines based on the number of
   * line segments. It applies different arrow styles to the first and last lines
   * when appropriate, and sorts the lines for proper visual representation.
   *
   * @param renderer - The graphics renderer used to draw the dimension lines
   * @param lines - Array of line entities that make up the dimension
   * @returns Array of rendered graphics entities
   * @protected
   */
  protected drawLines(renderer: AcGiRenderer, lines: AcDbLine[]) {
    const results: AcGiEntity[] = []
    const count = lines.length
    if (count == 1) {
      results.push(
        this.drawLine(renderer, lines[0], {
          firstArrow: this.firstArrowStyle
        })
      )
    } else if (count == 3) {
      this.sortLines(lines)
      results.push(
        this.drawLine(renderer, lines[0], {
          firstArrow: this.firstArrowStyle
        })
      )
      results.push(this.drawLine(renderer, lines[1]))
      results.push(
        this.drawLine(renderer, lines[2], {
          firstArrow: this.firstArrowStyle
        })
      )
    } else {
      lines.forEach(line => {
        results.push(this.drawLine(renderer, line))
      })
    }
    return results
  }

  /**
   * Draws a single line with optional arrow styling.
   *
   * @param renderer - The graphics renderer used to draw the line
   * @param line - The line entity to draw
   * @param lineArrowStyle - Optional arrow style configuration for the line
   * @returns The rendered graphics entity
   */
  private drawLine(
    renderer: AcGiRenderer,
    line: AcDbLine,
    lineArrowStyle?: AcGiLineArrowStyle
  ) {
    if (lineArrowStyle) {
      const points = [line.startPoint, line.endPoint]
      return renderer.lines(points)
    } else {
      return line.worldDraw(renderer)!
    }
  }

  /**
   * Sorts the dimension lines for proper visual representation.
   *
   * This method sorts the line segments based on their start and end points to ensure
   * they are drawn in the correct order for proper dimension visualization.
   *
   * @param lines - Array of line entities to sort
   */
  private sortLines(lines: AcDbLine[]) {
    // Function to compare positions of points
    const comparePoints = (a: AcGePoint3d, b: AcGePoint3d): number => {
      if (a.x !== b.x) return a.x - b.x
      if (a.y !== b.y) return a.y - b.y
      return a.z - b.z
    }

    // Sort segments based on the start points first, then end points
    lines.sort((segA, segB) => {
      const startCompare = comparePoints(segA.startPoint, segB.startPoint)
      if (startCompare !== 0) return startCompare
      return comparePoints(segA.endPoint, segB.endPoint)
    })
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbDiametricDimension')
    filer.writePoint3d(15, this.chordPoint)
    filer.writePoint3d(16, this.farChordPoint)
    filer.writeDouble(40, this.leaderLength)
    filer.writeAngle(52, this.extArcStartAngle)
    filer.writeAngle(53, this.extArcEndAngle)
    return this
  }
}
