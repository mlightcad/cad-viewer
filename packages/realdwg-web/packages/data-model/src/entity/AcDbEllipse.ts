import {
  AcGeEllipseArc3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGePointLike,
  AcGeVector3dLike
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbOsnapMode } from '../misc'
import { AcDbCurve } from './AcDbCurve'
import { AcDbEntityProperties } from './AcDbEntityProperties'

/**
 * Represents an ellipse entity in AutoCAD.
 *
 * An ellipse is a 2D geometric object defined by its center point, major and minor axes,
 * and optional start and end angles. Ellipses are curved shapes that can be used to
 * create elliptical shapes in drawings. The ellipse is always drawn in the plane
 * defined by its normal vector.
 *
 * @example
 * ```typescript
 * // Create a full ellipse
 * const ellipse = new AcDbEllipse(
 *   new AcGePoint3d(0, 0, 0),
 *   AcGeVector3d.Z_AXIS,
 *   AcGeVector3d.X_AXIS,
 *   10, // major axis radius
 *   5,  // minor axis radius
 *   0,  // start angle
 *   2 * Math.PI // end angle (full ellipse)
 * );
 *
 * // Access ellipse properties
 * console.log(`Center: ${ellipse.center}`);
 * console.log(`Major radius: ${ellipse.majorAxisRadius}`);
 * console.log(`Minor radius: ${ellipse.minorAxisRadius}`);
 * ```
 */
export class AcDbEllipse extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Ellipse'

  /** The underlying geometric ellipse arc object */
  private _geo: AcGeEllipseArc3d

  /**
   * Creates a new ellipse entity.
   *
   * This constructor creates an ellipse using the specified center point, normal vector,
   * major axis, and radii. The center point must be in World Coordinate System (WCS) coordinates.
   *
   * @param center - The center point of the ellipse in WCS coordinates
   * @param normal - The normal vector defining the plane of the ellipse
   * @param majorAxis - The major axis vector in WCS coordinates
   * @param majorAxisRadius - The radius of the major axis (must be positive)
   * @param minorAxisRadius - The radius of the minor axis (must be positive)
   * @param startAngle - The starting angle in radians (0 to 2π)
   * @param endAngle - The ending angle in radians (0 to 2π)
   *
   * @example
   * ```typescript
   * // Create a full ellipse in the XY plane
   * const fullEllipse = new AcDbEllipse(
   *   new AcGePoint3d(0, 0, 0),
   *   AcGeVector3d.Z_AXIS,
   *   AcGeVector3d.X_AXIS,
   *   20, // major radius
   *   10, // minor radius
   *   0,
   *   2 * Math.PI
   * );
   *
   * // Create a quarter ellipse
   * const quarterEllipse = new AcDbEllipse(
   *   new AcGePoint3d(10, 20, 0),
   *   AcGeVector3d.Z_AXIS,
   *   AcGeVector3d.X_AXIS,
   *   15,
   *   8,
   *   0,
   *   Math.PI / 2
   * );
   * ```
   */
  constructor(
    center: AcGePointLike,
    normal: AcGeVector3dLike,
    majorAxis: AcGeVector3dLike,
    majorAxisRadius: number,
    minorAxisRadius: number,
    startAngle: number,
    endAngle: number
  ) {
    super()
    this._geo = new AcGeEllipseArc3d(
      center,
      normal,
      majorAxis,
      majorAxisRadius,
      minorAxisRadius,
      startAngle,
      endAngle
    )
  }

  /**
   * Gets the center point of this ellipse.
   *
   * @returns The center point as a 3D point
   *
   * @example
   * ```typescript
   * const centerPoint = ellipse.center;
   * console.log(`Ellipse center: ${centerPoint.x}, ${centerPoint.y}, ${centerPoint.z}`);
   * ```
   */
  get center(): AcGePoint3d {
    return this._geo.center
  }

  /**
   * Sets the center point of this ellipse.
   *
   * @param value - The new center point
   *
   * @example
   * ```typescript
   * ellipse.center = new AcGePoint3d(5, 5, 0);
   * ```
   */
  set center(value: AcGePoint3dLike) {
    this._geo.center = value
  }

  /**
   * Gets the major axis radius of this ellipse.
   *
   * @returns The major axis radius value
   *
   * @example
   * ```typescript
   * const majorRadius = ellipse.majorAxisRadius;
   * console.log(`Major radius: ${majorRadius}`);
   * ```
   */
  get majorAxisRadius(): number {
    return this._geo.majorAxisRadius
  }

  /**
   * Sets the major axis radius of this ellipse.
   *
   * @param value - The new major axis radius value (must be positive)
   *
   * @example
   * ```typescript
   * ellipse.majorAxisRadius = 25;
   * ```
   */
  set majorAxisRadius(value: number) {
    this._geo.majorAxisRadius = value
  }

  /**
   * Gets the minor axis radius of this ellipse.
   *
   * @returns The minor axis radius value
   *
   * @example
   * ```typescript
   * const minorRadius = ellipse.minorAxisRadius;
   * console.log(`Minor radius: ${minorRadius}`);
   * ```
   */
  get minorAxisRadius(): number {
    return this._geo.minorAxisRadius
  }

  /**
   * Sets the minor axis radius of this ellipse.
   *
   * @param value - The new minor axis radius value (must be positive)
   *
   * @example
   * ```typescript
   * ellipse.minorAxisRadius = 12;
   * ```
   */
  set minorAxisRadius(value: number) {
    this._geo.minorAxisRadius = value
  }

  /**
   * Gets the start angle of this ellipse.
   *
   * @returns The start angle in radians
   *
   * @example
   * ```typescript
   * const startAngle = ellipse.startAngle;
   * console.log(`ellipse start angle: ${startAngle} radians (${startAngle * 180 / Math.PI} degrees)`);
   * ```
   */
  get startAngle(): number {
    return this._geo.startAngle
  }

  /**
   * Sets the start angle of this ellipse.
   *
   * @param value - The new start angle in radians (0 to 2π)
   *
   * @example
   * ```typescript
   * ellipse.startAngle = Math.PI / 4; // 45 degrees
   * ```
   */
  set startAngle(value: number) {
    this._geo.startAngle = value
  }

  /**
   * Gets the end angle of this ellipse.
   *
   * @returns The end angle in radians
   *
   * @example
   * ```typescript
   * const endAngle = ellipse.endAngle;
   * console.log(`ellipse end angle: ${endAngle} radians (${endAngle * 180 / Math.PI} degrees)`);
   * ```
   */
  get endAngle(): number {
    return this._geo.endAngle
  }

  /**
   * Sets the end angle of this ellipse.
   *
   * @param value - The new end angle in radians (0 to 2π)
   *
   * @example
   * ```typescript
   * ellipse.endAngle = Math.PI; // 180 degrees
   * ```
   */
  set endAngle(value: number) {
    this._geo.endAngle = value
  }

  /**
   * Gets the normal vector of this ellipse.
   *
   * The normal vector defines the plane in which the ellipse lies.
   *
   * @returns The unit normal vector in WCS coordinates
   *
   * @example
   * ```typescript
   * const normal = ellipse.normal;
   * console.log(`Ellipse normal: ${normal.x}, ${normal.y}, ${normal.z}`);
   * ```
   */
  get normal() {
    return this._geo.normal
  }

  /**
   * Sets the normal vector of this ellipse.
   *
   * @param value - The new normal vector
   *
   * @example
   * ```typescript
   * ellipse.normal = AcGeVector3d.Y_AXIS;
   * ```
   */
  set normal(value: AcGeVector3dLike) {
    this._geo.normal = value
  }

  /**
   * Gets the geometric extents (bounding box) of this ellipse.
   *
   * @returns The bounding box that encompasses the entire ellipse
   *
   * @example
   * ```typescript
   * const extents = ellipse.geometricExtents;
   * console.log(`Ellipse bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents() {
    return this._geo.box
  }

  /**
   * Gets whether this ellipse is closed.
   *
   * An ellipse is considered closed if the start and end angles are the same
   * (forming a complete ellipse).
   *
   * @returns True if the ellipse is closed (forms a complete ellipse), false otherwise
   */
  get closed(): boolean {
    return this._geo.closed
  }

  /**
   * Gets the object snap points for this ellipse or ellipse arc.
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
    _pickPoint: AcGePoint3dLike,
    _lastPoint: AcGePoint3dLike,
    snapPoints: AcGePoint3dLike[]
  ) {
    switch (osnapMode) {
      case AcDbOsnapMode.EndPoint:
        if (!this.closed) {
          snapPoints.push(this._geo.startPoint)
          snapPoints.push(this._geo.endPoint)
        }
        break
      case AcDbOsnapMode.MidPoint:
        if (!this.closed) {
          snapPoints.push(this._geo.midPoint)
        }
        break
      case AcDbOsnapMode.Quadrant:
        if (this.closed) {
          snapPoints.push(this._geo.getPointAtAngle(0))
          snapPoints.push(this._geo.getPointAtAngle(Math.PI / 2))
          snapPoints.push(this._geo.getPointAtAngle(Math.PI))
          snapPoints.push(this._geo.getPointAtAngle((Math.PI / 2) * 3))
        }
        break
      default:
        break
    }
  }

  /**
   * Returns the full property definition for this ellipse entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable properties via {@link AcDbPropertyAccessor}
   * so the property palette can update the ellipse in real-time.
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
              name: 'majorAxisRadius',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.majorAxisRadius,
                set: (v: number) => {
                  this.center.x = v
                }
              }
            },
            {
              name: 'minorAxisRadius',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.minorAxisRadius,
                set: (v: number) => {
                  this.minorAxisRadius = v
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
              name: 'length',
              type: 'float',
              editable: false,
              accessor: {
                get: () => this._geo.length
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
   * Draws this ellipse using the specified renderer.
   *
   * This method renders the ellipse as an elliptical arc using the ellipse's
   * current style properties.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered ellipse entity, or undefined if drawing failed
   */
  subWorldDraw(renderer: AcGiRenderer) {
    return renderer.ellipticalArc(this._geo)
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbEllipse')
    filer.writePoint3d(10, this.center)
    filer.writePoint3d(11, {
      x: this.majorAxisRadius,
      y: 0,
      z: 0
    })
    filer.writeVector3d(210, this.normal)
    filer.writeDouble(40, this.minorAxisRadius / this.majorAxisRadius)
    filer.writeDouble(41, this.startAngle)
    filer.writeDouble(42, this.endAngle)
    return this
  }
}
