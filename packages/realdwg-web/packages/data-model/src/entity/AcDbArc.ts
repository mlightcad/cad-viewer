import {
  AcGeCircArc3d,
  AcGeMathUtil,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeVector3d,
  AcGeVector3dLike
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbOsnapMode } from '../misc'
import { AcDbCurve } from './AcDbCurve'
import { AcDbEntityProperties } from './AcDbEntityProperties'

/**
 * Represents an arc entity in AutoCAD.
 *
 * An arc is a 2D geometric object defined by its center point, radius, start angle,
 * and end angle. Arcs are portions of circles that can be used to create curved
 * line segments in drawings. The arc is always drawn in the plane defined by its normal vector.
 *
 * @example
 * ```typescript
 * // Create a 90-degree arc from 0 to π/2 radians
 * const arc = new AcDbArc(
 *   new AcGePoint3d(0, 0, 0),
 *   10,
 *   0,
 *   Math.PI / 2
 * );
 *
 * // Access arc properties
 * console.log(`Center: ${arc.center}`);
 * console.log(`Radius: ${arc.radius}`);
 * console.log(`Start angle: ${arc.startAngle}`);
 * console.log(`End angle: ${arc.endAngle}`);
 * ```
 */
export class AcDbArc extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Arc'

  /** The underlying geometric circular arc object */
  private _geo: AcGeCircArc3d

  /**
   * Creates a new arc entity.
   *
   * This constructor creates an arc using the specified center point, radius,
   * start angle, and end angle. The center point must be in World Coordinate
   * System (WCS) coordinates. Angles are specified in radians.
   *
   * @param center - The center point of the arc in WCS coordinates
   * @param radius - The radius of the arc (must be positive)
   * @param startAngle - The starting angle in radians (0 to 2π)
   * @param endAngle - The ending angle in radians (0 to 2π)
   * @param normal - The normal vector defining the plane of the circle (defaults to Z-axis)
   *
   * @example
   * ```typescript
   * // Create a quarter circle arc (0 to 90 degrees)
   * const quarterArc = new AcDbArc(
   *   new AcGePoint3d(0, 0, 0),
   *   15,
   *   0,
   *   Math.PI / 2
   * );
   *
   * // Create a semicircle arc (0 to 180 degrees)
   * const semicircle = new AcDbArc(
   *   new AcGePoint3d(10, 20, 0),
   *   25,
   *   0,
   *   Math.PI
   * );
   * ```
   */
  constructor(
    center: AcGePoint3dLike,
    radius: number,
    startAngle: number,
    endAngle: number,
    normal: AcGeVector3dLike = AcGeVector3d.Z_AXIS
  ) {
    super()
    this._geo = new AcGeCircArc3d(
      center,
      radius,
      startAngle,
      endAngle,
      normal,
      AcGeVector3d.X_AXIS
    )
  }

  /**
   * Gets the center point of this arc.
   *
   * @returns The center point as a 3D point
   *
   * @example
   * ```typescript
   * const centerPoint = arc.center;
   * console.log(`Arc center: ${centerPoint.x}, ${centerPoint.y}, ${centerPoint.z}`);
   * ```
   */
  get center(): AcGePoint3d {
    return this._geo.center
  }

  /**
   * Sets the center point of this arc.
   *
   * @param value - The new center point
   *
   * @example
   * ```typescript
   * arc.center = new AcGePoint3d(5, 5, 0);
   * ```
   */
  set center(value: AcGePoint3dLike) {
    this._geo.center = value
  }

  /**
   * Gets the radius of this arc.
   *
   * @returns The radius value
   *
   * @example
   * ```typescript
   * const radius = arc.radius;
   * console.log(`Arc radius: ${radius}`);
   * ```
   */
  get radius(): number {
    return this._geo.radius
  }

  /**
   * Sets the radius of this arc.
   *
   * @param value - The new radius value (must be positive)
   *
   * @example
   * ```typescript
   * arc.radius = 25;
   * ```
   */
  set radius(value: number) {
    this._geo.radius = value
  }

  /**
   * Gets the start angle of this arc.
   *
   * @returns The start angle in radians
   *
   * @example
   * ```typescript
   * const startAngle = arc.startAngle;
   * console.log(`Arc start angle: ${startAngle} radians (${startAngle * 180 / Math.PI} degrees)`);
   * ```
   */
  get startAngle(): number {
    return this._geo.startAngle
  }

  /**
   * Sets the start angle of this arc.
   *
   * @param value - The new start angle in radians (0 to 2π)
   *
   * @example
   * ```typescript
   * arc.startAngle = Math.PI / 4; // 45 degrees
   * ```
   */
  set startAngle(value: number) {
    this._geo.startAngle = value
  }

  /**
   * Gets the end angle of this arc.
   *
   * @returns The end angle in radians
   *
   * @example
   * ```typescript
   * const endAngle = arc.endAngle;
   * console.log(`Arc end angle: ${endAngle} radians (${endAngle * 180 / Math.PI} degrees)`);
   * ```
   */
  get endAngle(): number {
    return this._geo.endAngle
  }

  /**
   * Sets the end angle of this arc.
   *
   * @param value - The new end angle in radians (0 to 2π)
   *
   * @example
   * ```typescript
   * arc.endAngle = Math.PI; // 180 degrees
   * ```
   */
  set endAngle(value: number) {
    this._geo.endAngle = value
  }

  /**
   * Gets the arc's unit normal vector in WCS coordinates.
   *
   * @returns The arc's unit normal vector
   *
   * @example
   * ```typescript
   * const normal = arc.normal;
   * console.log(`Normal: ${normal.x}, ${normal.y}, ${normal.z}`);
   * ```
   */
  get normal(): AcGeVector3d {
    return this._geo.normal
  }

  /**
   * Sets the arc's unit normal vector in WCS coordinates.
   *
   * @param value - The new arc's unit normal vector
   *
   * @example
   * ```typescript
   * arc.normal = new AcGeVector3d(0, 0, 1);
   * ```
   */
  set normal(value: AcGeVector3dLike) {
    this._geo.normal = value
  }

  /**
   * Gets the start point of this arc.
   *
   * The start point is calculated based on the center, radius, and start angle.
   *
   * @returns The start point as a 3D point
   *
   * @example
   * ```typescript
   * const startPoint = arc.startPoint;
   * console.log(`Arc start point: ${startPoint.x}, ${startPoint.y}, ${startPoint.z}`);
   * ```
   */
  get startPoint(): AcGePoint3d {
    return this._geo.startPoint
  }

  /**
   * Gets the end point of this arc.
   *
   * The end point is calculated based on the center, radius, and end angle.
   *
   * @returns The end point as a 3D point
   *
   * @example
   * ```typescript
   * const endPoint = arc.endPoint;
   * console.log(`Arc end point: ${endPoint.x}, ${endPoint.y}, ${endPoint.z}`);
   * ```
   */
  get endPoint(): AcGePoint3d {
    return this._geo.endPoint
  }

  /**
   * The middle point of the circular arc
   */
  get midPoint(): AcGePoint3d {
    return this._geo.midPoint
  }

  /**
   * Gets the geometric extents (bounding box) of this arc.
   *
   * @returns The bounding box that encompasses the entire arc
   *
   * @example
   * ```typescript
   * const extents = arc.geometricExtents;
   * console.log(`Arc bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents() {
    return this._geo.box
  }

  /**
   * Gets whether this arc is closed.
   *
   * An arc is considered closed if the start and end angles are the same
   * (forming a complete circle).
   *
   * @returns True if the arc is closed (forms a complete circle), false otherwise
   */
  get closed(): boolean {
    return this._geo.closed
  }

  /**
   * Returns the full property definition for this arc entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable properties via {@link AcDbPropertyAccessor}
   * so the property palette can update the arc in real-time.
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
            // --- Cennter Point ---
            {
              name: 'centerX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.center.x,
                set: (v: number) => {
                  this.center.x = v
                }
              }
            },
            {
              name: 'centerY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.center.y,
                set: (v: number) => {
                  this.center.y = v
                }
              }
            },
            {
              name: 'centerZ',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.center.z,
                set: (v: number) => {
                  this.center.z = v
                }
              }
            },
            {
              name: 'radius',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.radius,
                set: (v: number) => {
                  this.radius = v
                }
              }
            },
            {
              name: 'startAngle',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.startAngle,
                set: (v: number) => {
                  this.startAngle = v
                }
              }
            },
            {
              name: 'endAngle',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.endAngle,
                set: (v: number) => {
                  this.endAngle = v
                }
              }
            },
            {
              name: 'normalX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.normal.x,
                set: (v: number) => {
                  this.normal.x = v
                }
              }
            },
            {
              name: 'normalY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.normal.y,
                set: (v: number) => {
                  this.normal.y = v
                }
              }
            },
            {
              name: 'normalZ',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.normal.z,
                set: (v: number) => {
                  this.normal.z = v
                }
              }
            },
            {
              name: 'arcLength',
              type: 'float',
              editable: false,
              accessor: {
                get: () => this._geo.length
              }
            },
            {
              name: 'totalAngle',
              type: 'float',
              editable: false,
              accessor: {
                get: () => AcGeMathUtil.radToDeg(Math.abs(this._geo.deltaAngle))
              }
            },
            {
              name: 'area',
              type: 'float',
              editable: false,
              accessor: {
                get: () => this._geo.area
              }
            }
          ]
        }
      ]
    }
  }

  /**
   * Gets the grip points for this arc.
   *
   * Grip points are control points that can be used to modify the arc.
   * For an arc, the grip points are the center point, start point, and end point.
   *
   * @returns Array of grip points (center, start point, end point)
   *
   * @example
   * ```typescript
   * const gripPoints = arc.subGetGripPoints();
   * // gripPoints contains: [center, startPoint, endPoint]
   * ```
   */
  subGetGripPoints() {
    const gripPoints = new Array<AcGePoint3d>()
    gripPoints.push(this.center)
    gripPoints.push(this.startPoint)
    gripPoints.push(this.endPoint)
    return gripPoints
  }

  /**
   * Gets the object snap points for this arc.
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
        {
          const projectedPoint = this._geo.nearestPoint(pickPoint)
          snapPoints.push(projectedPoint)
        }
        break
      case AcDbOsnapMode.Perpendicular:
        // N/A for perpendicular snap
        break
      case AcDbOsnapMode.Tangent: {
        const points = this._geo.tangentPoints(pickPoint)
        snapPoints.push(...points)
        break
      }
      default:
        break
    }
  }

  /**
   * Transforms this arc by the specified matrix.
   *
   * This method applies a geometric transformation to the arc, updating
   * the center point, radius, and angles according to the transformation matrix.
   *
   * @param matrix - The transformation matrix to apply
   * @returns This arc after transformation
   *
   * @example
   * ```typescript
   * const translationMatrix = AcGeMatrix3d.translation(10, 0, 0);
   * arc.transformBy(translationMatrix);
   * // Arc is now translated 10 units in the X direction
   * ```
   */
  transformBy(matrix: AcGeMatrix3d) {
    this._geo.transform(matrix)
    return this
  }

  /**
   * Draws this arc using the specified renderer.
   *
   * This method renders the arc as a circular arc using the arc's
   * current style properties.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered arc entity, or undefined if drawing failed
   *
   * @example
   * ```typescript
   * const renderedArc = arc.draw(renderer);
   * ```
   */
  subWorldDraw(renderer: AcGiRenderer) {
    return renderer.circularArc(this._geo)
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbArc')
    filer.writePoint3d(10, this.center)
    filer.writeDouble(40, this.radius)
    filer.writeAngle(50, this.startAngle)
    filer.writeAngle(51, this.endAngle)
    filer.writeVector3d(210, this.normal)
    return this
  }
}
