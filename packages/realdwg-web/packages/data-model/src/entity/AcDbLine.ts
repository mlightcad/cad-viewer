import {
  AcGeBox3d,
  AcGeLine3d,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbOsnapMode } from '../misc/AcDbOsnapMode'
import { AcDbCurve } from './AcDbCurve'
import { AcDbEntityProperties } from './AcDbEntityProperties'

/**
 * Represents a line entity in AutoCAD.
 *
 * A line is a 3D geometric object defined by its start point and end point.
 * Lines are fundamental drawing entities that can be used to create straight
 * line segments in 2D or 3D space.
 *
 * @example
 * ```typescript
 * // Create a line from point (0,0,0) to point (10,10,0)
 * const line = new AcDbLine(
 *   new AcGePoint3d(0, 0, 0),
 *   new AcGePoint3d(10, 10, 0)
 * );
 *
 * // Access line properties
 * console.log(`Start point: ${line.startPoint}`);
 * console.log(`End point: ${line.endPoint}`);
 * console.log(`Mid point: ${line.midPoint}`);
 * ```
 */
export class AcDbLine extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Line'

  /** The underlying geometric line object */
  private _geo: AcGeLine3d

  /**
   * Creates a new line entity.
   *
   * This constructor initializes the line object with the specified start and end points.
   * Both points must be in World Coordinate System (WCS) coordinates.
   *
   * @param start - The starting point of the line in WCS coordinates
   * @param end - The ending point of the line in WCS coordinates
   *
   * @example
   * ```typescript
   * const line = new AcDbLine(
   *   new AcGePoint3d(0, 0, 0),
   *   new AcGePoint3d(100, 50, 0)
   * );
   * ```
   */
  constructor(start: AcGePoint3dLike, end: AcGePoint3dLike) {
    super()
    this._geo = new AcGeLine3d(start, end)
  }

  /**
   * Gets the starting point of this line.
   *
   * @returns The starting point as a 3D point
   *
   * @example
   * ```typescript
   * const startPoint = line.startPoint;
   * console.log(`Line starts at: ${startPoint.x}, ${startPoint.y}, ${startPoint.z}`);
   * ```
   */
  get startPoint(): AcGePoint3d {
    return this._geo.startPoint
  }

  /**
   * Sets the starting point of this line.
   *
   * @param value - The new starting point
   *
   * @example
   * ```typescript
   * line.startPoint = new AcGePoint3d(5, 5, 0);
   * ```
   */
  set startPoint(value: AcGePoint3dLike) {
    this._geo.startPoint = value
  }

  /**
   * Gets the ending point of this line.
   *
   * @returns The ending point as a 3D point
   *
   * @example
   * ```typescript
   * const endPoint = line.endPoint;
   * console.log(`Line ends at: ${endPoint.x}, ${endPoint.y}, ${endPoint.z}`);
   * ```
   */
  get endPoint(): AcGePoint3d {
    return this._geo.endPoint
  }

  /**
   * Sets the ending point of this line.
   *
   * @param value - The new ending point
   *
   * @example
   * ```typescript
   * line.endPoint = new AcGePoint3d(15, 15, 0);
   * ```
   */
  set endPoint(value: AcGePoint3dLike) {
    this._geo.endPoint = value
  }

  /**
   * Gets the middle point of this line.
   *
   * The middle point is calculated as the midpoint between the start and end points.
   *
   * @returns The middle point as a 3D point
   *
   * @example
   * ```typescript
   * const midPoint = line.midPoint;
   * console.log(`Line midpoint: ${midPoint.x}, ${midPoint.y}, ${midPoint.z}`);
   * ```
   */
  get midPoint(): AcGePoint3d {
    return this._geo.midPoint
  }

  /**
   * Gets the geometric extents (bounding box) of this line.
   *
   * @returns The bounding box that encompasses the entire line
   *
   * @example
   * ```typescript
   * const extents = line.geometricExtents;
   * console.log(`Line bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents(): AcGeBox3d {
    return this._geo.box
  }

  /**
   * Gets whether this line is closed.
   *
   * Lines are always open entities, so this always returns false.
   *
   * @returns Always false for lines
   */
  get closed(): boolean {
    return false
  }

  /**
   * Returns the full property definition for this line entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable start/end coordinates via
   * {@link AcDbPropertyAccessor} so the property palette can update
   * the line in real-time.
   *
   * Each property is an {@link AcDbEntityRuntimeProperty}.
   */
  get properties(): AcDbEntityProperties {
    return {
      type: this.type,
      groups: [
        this.getGeneralProperties(),
        {
          groupName: 'geometry',
          properties: [
            {
              name: 'startX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.startPoint.x,
                set: (v: number) => {
                  this.startPoint.x = v
                }
              }
            },
            {
              name: 'startY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.startPoint.y,
                set: (v: number) => {
                  this.startPoint.y = v
                }
              }
            },
            {
              name: 'startZ',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.startPoint.z,
                set: (v: number) => {
                  this.startPoint.z = v
                }
              }
            },
            {
              name: 'endX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.endPoint.x,
                set: (v: number) => {
                  this.endPoint.x = v
                }
              }
            },
            {
              name: 'endY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.endPoint.y,
                set: (v: number) => {
                  this.endPoint.y = v
                }
              }
            },
            {
              name: 'endZ',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.endPoint.z,
                set: (v: number) => {
                  this.endPoint.z = v
                }
              }
            },
            {
              name: 'length',
              type: 'float',
              editable: false,
              accessor: {
                get: () => this._geo.length
              }
            }
          ]
        }
      ]
    }
  }

  /**
   * Gets the grip points for this line.
   *
   * Grip points are control points that can be used to modify the line.
   * For a line, the grip points are the midpoint, start point, and end point.
   *
   * @returns Array of grip points (midpoint, start point, end point)
   *
   * @example
   * ```typescript
   * const gripPoints = line.subGetGripPoints();
   * // gripPoints contains: [midPoint, startPoint, endPoint]
   * ```
   */
  subGetGripPoints() {
    const gripPoints = new Array<AcGePoint3d>()
    gripPoints.push(this.midPoint)
    gripPoints.push(this.startPoint)
    gripPoints.push(this.endPoint)
    return gripPoints
  }

  /**
   * Gets the object snap points for this line.
   *
   * Object snap points are precise points that can be used for positioning
   * when drawing or editing. This method provides snap points based on the
   * specified snap mode.
   *
   * @param osnapMode - The object snap mode
   * @param pickPoint - The point where the user picked
   * @param _lastPoint - The last point
   * @param snapPoints - Array to populate with snap points
   */
  subGetOsnapPoints(
    osnapMode: AcDbOsnapMode,
    pickPoint: AcGePoint3dLike,
    _lastPoint: AcGePoint3dLike,
    snapPoints: AcGePoint3dLike[]
  ) {
    const startPoint = this.startPoint
    const endPoint = this.endPoint

    switch (osnapMode) {
      case AcDbOsnapMode.EndPoint:
        snapPoints.push(startPoint)
        snapPoints.push(endPoint)
        break
      case AcDbOsnapMode.MidPoint:
        snapPoints.push(this.midPoint)
        break
      case AcDbOsnapMode.Nearest:
        // Nearest snap: project the pick point onto the line and return that point
        {
          const projectedPoint = this._geo.project(pickPoint)
          snapPoints.push(projectedPoint)
        }
        break
      case AcDbOsnapMode.Perpendicular:
        // Perpendicular snap: find a perpendicular point from the pick point to the line
        {
          const perpPoint = this._geo.perpPoint(pickPoint)
          snapPoints.push(perpPoint)
        }
        break
      case AcDbOsnapMode.Tangent:
        // N/A for tangent snap
        break
      default:
        break
    }
  }

  /**
   * Transforms this line by the specified matrix.
   *
   * This method applies a geometric transformation to the line, updating
   * both the start and end points according to the transformation matrix.
   *
   * @param matrix - The transformation matrix to apply
   * @returns This line after transformation
   *
   * @example
   * ```typescript
   * const translationMatrix = AcGeMatrix3d.translation(10, 0, 0);
   * line.transformBy(translationMatrix);
   * // Line is now translated 10 units in the X direction
   * ```
   */
  transformBy(matrix: AcGeMatrix3d) {
    this._geo.transform(matrix)
    return this
  }

  /**
   * Draws this line using the specified renderer.
   *
   * This method renders the line as a series of connected line segments
   * using the line's current style properties.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered line entity, or undefined if drawing failed
   */
  subWorldDraw(renderer: AcGiRenderer) {
    const start = this.startPoint
    const end = this.endPoint
    const points = [
      new AcGePoint3d(start.x, start.y, 0),
      new AcGePoint3d(end.x, end.y, 0)
    ]
    return renderer.lines(points)
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbLine')
    filer.writePoint3d(10, this.startPoint)
    filer.writePoint3d(11, this.endPoint)
    return this
  }
}
