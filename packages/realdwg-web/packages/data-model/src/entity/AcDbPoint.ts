import {
  AcGeBox3d,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGePointLike
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbOsnapMode } from '../misc'
import { AcDbEntity } from './AcDbEntity'
import { AcDbEntityProperties } from './AcDbEntityProperties'

/**
 * Represents a point entity in AutoCAD.
 *
 * A point is a 0-dimensional geometric object defined by its position in 3D space.
 * Points are fundamental drawing entities that can be used to mark specific
 * locations in drawings or as reference points for other entities.
 *
 * @example
 * ```typescript
 * // Create a point at the origin
 * const point = new AcDbPoint();
 * point.position = new AcGePoint3d(0, 0, 0);
 *
 * // Create a point at a specific location
 * const point2 = new AcDbPoint();
 * point2.position = new AcGePoint3d(10, 20, 5);
 *
 * // Access point properties
 * console.log(`Point position: ${point.position}`);
 * ```
 */
export class AcDbPoint extends AcDbEntity {
  /** The entity type name */
  static override typeName: string = 'Point'

  /** The underlying geometric point object */
  private _geo: AcGePoint3d

  /**
   * Creates a new point entity.
   *
   * This constructor initializes a point object at the origin (0,0,0).
   * The position can be set after creation using the position property.
   *
   * @example
   * ```typescript
   * const point = new AcDbPoint();
   * point.position = new AcGePoint3d(5, 10, 0);
   * ```
   */
  constructor() {
    super()
    this._geo = new AcGePoint3d()
  }

  /**
   * Gets the position of this point in WCS coordinates.
   *
   * @returns The position as a 3D point
   *
   * @example
   * ```typescript
   * const position = point.position;
   * console.log(`Point at: ${position.x}, ${position.y}, ${position.z}`);
   * ```
   */
  get position(): AcGePoint3d {
    return this._geo
  }

  /**
   * Sets the position of this point in WCS coordinates.
   *
   * @param value - The new position
   *
   * @example
   * ```typescript
   * point.position = new AcGePoint3d(15, 25, 0);
   * ```
   */
  set position(value: AcGePointLike) {
    this._geo.set(value.x, value.y, value.z || 0)
  }

  /**
   * Gets the geometric extents (bounding box) of this point.
   *
   * For a point, the bounding box is a minimal box that contains just the point.
   *
   * @returns The bounding box that encompasses the point
   *
   * @example
   * ```typescript
   * const extents = point.geometricExtents;
   * console.log(`Point bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents(): AcGeBox3d {
    return new AcGeBox3d().expandByPoint(this._geo)
  }

  /**
   * Gets the object snap points for this point.
   *
   * Object snap points are precise points that can be used for positioning
   * when drawing or editing. This method provides snap points based on the
   * specified snap mode.
   *
   * @param osnapMode - The object snap mode
   * @param _pickPoint - The point where the user picked
   * @param _lastPoint - The last point
   * @param snapPoints - Array to populate with snap points
   */
  subGetOsnapPoints(
    osnapMode: AcDbOsnapMode,
    _pickPoint: AcGePoint3dLike,
    _lastPoint: AcGePoint3dLike,
    snapPoints: AcGePoint3dLike[]
  ) {
    if (AcDbOsnapMode.Node === osnapMode) {
      snapPoints.push(this._geo)
    }
  }

  /**
   * Returns the full property definition for this point entity, including
   * general group and geometry group.
   *
   * The geometry group exposes editable start/end coordinates via
   * {@link AcDbPropertyAccessor} so the property palette can update
   * the point in real-time.
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
              name: 'positionX',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.position.x,
                set: (v: number) => {
                  this.position.x = v
                }
              }
            },
            {
              name: 'positionY',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.position.y,
                set: (v: number) => {
                  this.position.y = v
                }
              }
            },
            {
              name: 'positionZ',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.position.z,
                set: (v: number) => {
                  this.position.z = v
                }
              }
            }
          ]
        }
      ]
    }
  }

  /**
   * Transforms this point by the specified matrix.
   *
   * This method applies a geometric transformation to the point, updating
   * its position according to the transformation matrix.
   *
   * @param matrix - The transformation matrix to apply
   * @returns This point after transformation
   *
   * @example
   * ```typescript
   * const translationMatrix = AcGeMatrix3d.translation(10, 0, 0);
   * point.transformBy(translationMatrix);
   * // Point is now translated 10 units in the X direction
   * ```
   */
  transformBy(matrix: AcGeMatrix3d) {
    this._geo.applyMatrix4(matrix)
    return this
  }

  /**
   * Draws this point using the specified renderer.
   *
   * This method renders the point using the point's current style properties,
   * including the display mode and size from the database.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered point entity, or undefined if drawing failed
   */
  subWorldDraw(renderer: AcGiRenderer) {
    return renderer.point(this._geo, {
      displayMode: this.database.pdmode,
      displaySize: this.database.pdsize
    })
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbPoint')
    filer.writePoint3d(10, this.position)
    return this
  }
}
