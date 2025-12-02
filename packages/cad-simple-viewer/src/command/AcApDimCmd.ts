import {
  AcDbAlignedDimension,
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbLine,
  AcGeLine3d,
  AcGePoint2dLike,
  AcGePoint3dLike,
  AcGeVector3d
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdPreviewJig,
  AcEdPromptPointOptions
} from '../editor'
import { AcApI18n } from '../i18n'

export class AcApDimJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _db: AcDbDatabase
  private _dim: AcDbAlignedDimension

  /**
   * Creates a new zoom-to-box jig.
   *
   * @param view - The view that will be zoomed
   */
  constructor(
    view: AcEdBaseView,
    db: AcDbDatabase,
    xline1Point: AcGePoint3dLike
  ) {
    super(view)
    this._db = db
    this._dim = new AcDbAlignedDimension(xline1Point, xline1Point, xline1Point)
    this._dim.rotation = 0
  }

  get entity(): AcDbAlignedDimension {
    return this._dim
  }

  update(point: AcGePoint3dLike) {
    this._dim.xLine2Point = point
    this._dim.rotation = this.calculateAngle(
      this._dim.xLine2Point,
      this._dim.xLine1Point
    )
    this._dim.dimLinePoint = this.calculateDimPoint(100)

    const blockName = '*UDIM'
    this.updateBlock(blockName)
    this._dim.dimBlockId = blockName
  }

  private updateBlock(blockName: string) {
    this._db.tables.blockTable.remove(blockName)

    // Create block and add the hatch entity in this block
    const block = new AcDbBlockTableRecord()
    block.name = blockName
    const lines = this.createLines()
    lines.forEach(line =>
      block.appendEntity(new AcDbLine(line.startPoint, line.endPoint))
    )
    this._db.tables.blockTable.add(block)

    return block
  }

  private calculateDimPoint(distance: number) {
    const angle = this._dim.rotation + Math.PI / 2
    const dimPoint = this.findPointOnLine(
      this._dim.xLine1Point,
      angle,
      distance
    )
    return { ...dimPoint, z: 0 }
  }

  private calculateAngle(p1: AcGePoint2dLike, p2: AcGePoint2dLike) {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.atan2(dy, dx)
  }

  /**
   * Adjust start point and end point of extension line
   * @param extensionLine Input extension line to adjust its start point and end point
   */
  private adjustExtensionLine(extensionLine: AcGeLine3d) {
    extensionLine.extend(10)
    extensionLine.extend(-10, true)
  }

  /**
   * Return one array which contains three lines of the alinged dimension.
   * - The first line in the array is dimension line.
   * - The second line and the third line in the array are extension lines.
   * @returns Return three lines of the alinged dimension
   */
  private createLines() {
    const lines: AcGeLine3d[] = []

    const extensionLine1 = this.createExtensionLine(this._dim.xLine1Point)
    const extensionLine2 = this.createExtensionLine(this._dim.xLine2Point)

    const intersectionPoint1 = this.findIntersectionPoint(
      extensionLine1,
      this._dim.dimLinePoint
    )
    const intersectionPoint2 = this.findIntersectionPoint(
      extensionLine2,
      this._dim.dimLinePoint
    )
    const dimensionLine = new AcGeLine3d(intersectionPoint1, intersectionPoint2)
    lines.push(dimensionLine)

    // Create the first extension line with extension
    extensionLine1.endPoint = intersectionPoint1
    this.adjustExtensionLine(extensionLine1)
    lines.push(extensionLine1)

    // Create the second extension line with extension
    extensionLine2.endPoint = intersectionPoint2
    this.adjustExtensionLine(extensionLine2)
    lines.push(extensionLine2)

    return lines
  }

  /**
   * Find the point `p2` on a line starting from `p1` at a specified angle
   * and at a distance `length` from `p1`.
   *
   * @param p1 - The start point of the line.
   * @param angle - The angle of the line in radians relative to the x-axis.
   * @param length - The distance from `p1` to `p2`.
   * @returns Return the point `p2`.
   */
  protected findPointOnLine(
    p1: AcGePoint2dLike,
    angle: number,
    length: number
  ): AcGePoint2dLike {
    // Calculate the new point p2
    const x = p1.x + length * Math.cos(angle)
    const y = p1.y + length * Math.sin(angle)
    return { x, y }
  }

  private createExtensionLine(point: AcGePoint3dLike) {
    const angle = this._dim.rotation + Math.PI / 2
    const anotherPoint = this.findPointOnLine(point, angle, 200)
    return new AcGeLine3d(point, { ...anotherPoint, z: point.z })
  }

  /**
   * Compute the intersection point between a line 'line1' and a line 'line2' that passes through
   * a given point 'p' and is perpendicular to line 'line1'.
   *
   * @param line The 'line1'.
   * @param p The point through which the perpendicular 'line2' passes.
   * @returns Returns the intersection point of 'line1' and 'line2'.
   */
  private findIntersectionPoint(line1: AcGeLine3d, p: AcGePoint3dLike) {
    const p1 = line1.startPoint
    const p2 = line1.endPoint

    // Direction of line1 (p1 - p2)
    const directionOfLine1 = new AcGeVector3d().subVectors(p2, p1).normalize()

    // Vector from point 'p1' to point 'p3'
    const vectorFromP1ToP3 = new AcGeVector3d().subVectors(p, p1)

    // Project vectorAP onto directionL to get the projection vector
    const projectionLength = vectorFromP1ToP3.dot(directionOfLine1)
    const projectionVector = new AcGeVector3d()
      .copy(directionOfLine1)
      .multiplyScalar(projectionLength)

    // Intersection point is the point on line L at the projection
    const intersection = new AcGeVector3d().addVectors(p1, projectionVector)

    return intersection
  }
}

/**
 * Example Command to create one aligned dimension.
 */
export class AcApDimCmd extends AcEdCommand {
  async execute(context: AcApContext) {
    const xLine1PointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.circle.center')
    )
    const xLine1Point =
      await AcApDocManager.instance.editor.getPoint(xLine1PointPrompt)

    const xLine2PointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.circle.center')
    )
    xLine2PointPrompt.jig = new AcApDimJig(
      context.view,
      context.doc.database,
      xLine1Point
    )
    await AcApDocManager.instance.editor.getPoint(xLine2PointPrompt)
  }
}
