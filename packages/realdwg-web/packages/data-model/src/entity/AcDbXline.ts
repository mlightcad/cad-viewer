import {
  AcGeBox3d,
  AcGePoint3d,
  AcGeVector3d
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbCurve } from './AcDbCurve'
import { AcDbEntityProperties } from './AcDbEntityProperties'

/**
 * Represents an xline entity in AutoCAD.
 *
 * An xline is a 3D geometric object that extends infinitely in both directions from a base point.
 * Xlines are commonly used for construction lines, reference lines, and temporary geometry.
 * Unlike lines, xlines have no end points and extend to infinity in both directions.
 *
 * @example
 * ```typescript
 * // Create an xline from origin in the positive X direction
 * const xline = new AcDbXline();
 * xline.basePoint = new AcGePoint3d(0, 0, 0);
 * xline.unitDir = new AcGeVector3d(1, 0, 0);
 *
 * // Access xline properties
 * console.log(`Base point: ${xline.basePoint}`);
 * console.log(`Unit direction: ${xline.unitDir}`);
 * ```
 */
export class AcDbXline extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Xline'

  /** The base point of the xline */
  private _basePoint: AcGePoint3d
  /** The unit direction vector of the xline */
  private _unitDir: AcGeVector3d

  /**
   * Creates a new xline entity.
   *
   * This constructor initializes an xline with default values.
   * The base point is at the origin and the unit direction is undefined.
   *
   * @example
   * ```typescript
   * const xline = new AcDbXline();
   * xline.basePoint = new AcGePoint3d(5, 10, 0);
   * xline.unitDir = new AcGeVector3d(0, 1, 0); // Positive Y direction
   * ```
   */
  constructor() {
    super()
    this._basePoint = new AcGePoint3d()
    this._unitDir = new AcGeVector3d()
  }

  /**
   * Gets the base point of this xline.
   *
   * The base point is the center point from which the xline extends infinitely
   * in both directions.
   *
   * @returns The base point as a 3D point
   *
   * @example
   * ```typescript
   * const basePoint = xline.basePoint;
   * console.log(`Xline base point: ${basePoint.x}, ${basePoint.y}, ${basePoint.z}`);
   * ```
   */
  get basePoint() {
    return this._basePoint
  }

  /**
   * Sets the base point of this xline.
   *
   * @param value - The new base point
   *
   * @example
   * ```typescript
   * xline.basePoint = new AcGePoint3d(10, 20, 0);
   * ```
   */
  set basePoint(value: AcGePoint3d) {
    this._basePoint.copy(value)
  }

  /**
   * Gets the unit direction vector of this xline.
   *
   * The unit direction vector defines the direction in which the xline extends
   * infinitely in both directions from the base point.
   *
   * @returns The unit direction vector
   *
   * @example
   * ```typescript
   * const unitDir = xline.unitDir;
   * console.log(`Xline direction: ${unitDir.x}, ${unitDir.y}, ${unitDir.z}`);
   * ```
   */
  get unitDir() {
    return this._unitDir
  }

  /**
   * Sets the unit direction vector of this xline.
   *
   * @param value - The new unit direction vector
   *
   * @example
   * ```typescript
   * xline.unitDir = new AcGeVector3d(0, 0, 1); // Positive Z direction
   * ```
   */
  set unitDir(value: AcGePoint3d) {
    this._unitDir.copy(value)
  }

  /**
   * Gets whether this xline is closed.
   *
   * Xlines are always open entities, so this always returns false.
   *
   * @returns Always false for xlines
   */
  get closed(): boolean {
    return false
  }

  /**
   * Gets the geometric extents (bounding box) of this xline.
   *
   * Since xlines extend infinitely in both directions, this method returns a
   * bounding box that encompasses a finite portion of the xline for practical purposes.
   *
   * @returns The bounding box that encompasses a portion of the xline
   *
   * @example
   * ```typescript
   * const extents = xline.geometricExtents;
   * console.log(`Xline bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents(): AcGeBox3d {
    const extents = new AcGeBox3d()
    extents.expandByPoint(
      this._unitDir.clone().multiplyScalar(10).add(this._basePoint)
    )
    extents.expandByPoint(
      this._unitDir.clone().multiplyScalar(-10).add(this._basePoint)
    )
    return extents
  }

  /**
   * Returns the full property definition for this xline entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable start/end coordinates via
   * {@link AcDbPropertyAccessor} so the property palette can update
   * the xline in real-time.
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
              name: 'basePointX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.basePoint.x,
                set: (v: number) => {
                  this.basePoint.x = v
                }
              }
            },
            {
              name: 'basePointY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.basePoint.y,
                set: (v: number) => {
                  this.basePoint.y = v
                }
              }
            },
            {
              name: 'basePointZ',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.basePoint.z,
                set: (v: number) => {
                  this.basePoint.z = v
                }
              }
            },
            {
              name: 'unitDirX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.unitDir.x,
                set: (v: number) => {
                  this.unitDir.x = v
                }
              }
            },
            {
              name: 'unitDirY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.unitDir.y,
                set: (v: number) => {
                  this.unitDir.y = v
                }
              }
            },
            {
              name: 'unitDirZ',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.unitDir.z,
                set: (v: number) => {
                  this.unitDir.z = v
                }
              }
            }
          ]
        }
      ]
    }
  }

  /**
   * Gets the grip points for this xline.
   *
   * Grip points are control points that can be used to modify the xline.
   * For an xline, the grip point is the base point.
   *
   * @returns Array of grip points (base point)
   *
   * @example
   * ```typescript
   * const gripPoints = xline.subGetGripPoints();
   * // gripPoints contains: [basePoint]
   * ```
   */
  subGetGripPoints() {
    const gripPoints = new Array<AcGePoint3d>()
    gripPoints.push(this.basePoint)
    return gripPoints
  }

  /**
   * Draws this xline using the specified renderer.
   *
   * This method renders the xline as a line segment extending from the base point
   * in both directions along the unit vector. For practical purposes, the xline is
   * drawn with a finite length.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered xline entity, or undefined if drawing failed
   */
  subWorldDraw(renderer: AcGiRenderer) {
    const points: AcGePoint3d[] = []
    points.push(
      this._unitDir.clone().multiplyScalar(-1000000).add(this._basePoint)
    )
    points.push(
      this._unitDir.clone().multiplyScalar(1000000).add(this._basePoint)
    )
    return renderer.lines(points)
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbXline')
    filer.writePoint3d(10, this.basePoint)
    filer.writeVector3d(11, this.unitDir)
    return this
  }
}
