import {
  AcGeBox3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGePolyline2d,
  AcGePolyline2dVertex
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbOsnapMode } from '../misc'
import { AcDbCurve } from './AcDbCurve'
import { AcDbEntityProperties } from './AcDbEntityProperties'

/**
 * Represents the curve/spline-fit type for one 2d polyline.
 */
export enum AcDbPoly2dType {
  /**
   * A standard polyline with no curve/spline fitting.
   */
  SimplePoly,
  /**
   * A polyline that has been curve fit.
   */
  FitCurvePoly,
  /**
   * A spline-fit polyline that has a Quadratic B-spline path.
   */
  QuadSplinePoly,
  /**
   * A spline-fit polyline that has a Cubic B-spline path.
   */
  CubicSplinePoly
}

/**
 * Represents a 2d polyline entity in AutoCAD. This is the older class used to
 * represent 2D polylines in the legacy (DXF/DWG R12 and before) format.
 *
 * Characteristics
 * - Represents 2D polyline entities, typically planar (all vertices lie in a single plane).
 * - Each vertex is an instance of AcDb2dVertex.
 * - Supports bulge values (for arcs between vertices).
 * - Can represent fit curves or spline-fit polylines (via the polyline type flag).
 * - Each vertex can have flags like curve-fit vertex, spline vertex, etc.
 * - Geometry is stored as a linked list of vertex entities (not a single compact structure).
 *
 * Typical use case
 * - Used mainly for backward compatibility and import/export of old drawings.
 */
export class AcDb2dPolyline extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = '2dPolyline'

  /** The curve/spline-fit type for this 2d polyline */
  private _polyType: AcDbPoly2dType
  /** The elevation (Z-coordinate) of the polyline plane */
  private _elevation: number
  /** The underlying geometric polyline object */
  private _geo: AcGePolyline2d<AcGePolyline2dVertex>

  /**
   * Creates a new empty 2d polyline entity.
   */
  constructor(
    type: AcDbPoly2dType,
    vertices: AcGePoint3dLike[],
    elevation = 0,
    closed = false,
    _startWidth = 0,
    _endWidth = 0,
    bulges: number[] | null = null
  ) {
    super()
    this._polyType = type
    this._elevation = elevation
    const hasBulge = bulges && bulges?.length === vertices.length
    const polylineVertices = vertices.map((vertex, index) => {
      return {
        x: vertex.x,
        y: vertex.y,
        bulge: hasBulge ? bulges[index] : undefined
      }
    })
    this._geo = new AcGePolyline2d(polylineVertices, closed)
  }

  /**
   * Gets the curve/spline-fit type for this 2d polyline.
   *
   * @returns The curve/spline-fit type for this 2d polyline.
   */
  get polyType(): AcDbPoly2dType {
    return this._polyType
  }

  /**
   * Sets the curve/spline-fit type for this 2d polyline.
   *
   * @param value - The curve/spline-fit type for this 2d polyline.
   */
  set polyType(value: AcDbPoly2dType) {
    this._polyType = value
  }

  /**
   * Gets the elevation of this polyline.
   *
   * The elevation is the distance of the polyline's plane from the WCS origin
   * along the Z-axis.
   *
   * @returns The elevation value
   *
   * @example
   * ```typescript
   * const elevation = polyline.elevation;
   * console.log(`Polyline elevation: ${elevation}`);
   * ```
   */
  get elevation(): number {
    return this._elevation
  }

  /**
   * Sets the elevation of this polyline.
   *
   * @param value - The new elevation value
   *
   * @example
   * ```typescript
   * polyline.elevation = 10;
   * ```
   */
  set elevation(value: number) {
    this._elevation = value
  }

  /**
   * Gets whether this polyline is closed.
   *
   * A closed polyline has a segment drawn from the last vertex to the first vertex,
   * forming a complete loop.
   *
   * @returns True if the polyline is closed, false otherwise
   *
   * @example
   * ```typescript
   * const isClosed = polyline.closed;
   * console.log(`Polyline is closed: ${isClosed}`);
   * ```
   */
  get closed(): boolean {
    return this._geo.closed
  }

  /**
   * Sets whether this polyline is closed.
   *
   * @param value - True to close the polyline, false to open it
   *
   * @example
   * ```typescript
   * polyline.closed = true; // Close the polyline
   * ```
   */
  set closed(value: boolean) {
    this._geo.closed = value
  }

  get numberOfVertices() {
    return this._geo.numberOfVertices
  }

  getPointAt(index: number) {
    return this._geo.getPointAt(index)
  }

  /**
   * Gets the geometric extents (bounding box) of this polyline.
   *
   * @returns The bounding box that encompasses the entire polyline
   *
   * @example
   * ```typescript
   * const extents = polyline.geometricExtents;
   * console.log(`Polyline bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents(): AcGeBox3d {
    const box = this._geo.box
    return new AcGeBox3d(
      { x: box.min.x, y: box.min.y, z: this._elevation },
      { x: box.max.x, y: box.max.y, z: this._elevation }
    )
  }

  /**
   * Gets the grip points for this polyline.
   *
   * Grip points are control points that can be used to modify the polyline.
   * For a polyline, the grip points are all the vertices.
   *
   * @returns Array of grip points (all vertices)
   */
  subGetGripPoints() {
    const gripPoints = new Array<AcGePoint3d>()
    for (let i = 0; i < this._geo.numberOfVertices; ++i) {
      const temp = this._geo.getPointAt(i)
      gripPoints.push(new AcGePoint3d(temp.x, temp.y, 0))
    }
    return gripPoints
  }

  /**
   * Gets the object snap points for this polyline.
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
    switch (osnapMode) {
      case AcDbOsnapMode.EndPoint:
        {
          for (let i = 0; i < this._geo.numberOfVertices; ++i) {
            const temp = this._geo.getPointAt(i)
            snapPoints.push(new AcGePoint3d(temp.x, temp.y, 0))
          }
        }
        break
      default:
        break
    }
  }

  /**
   * Returns the full property definition for this polyline entity, including
   * general group and geometry group.
   *
   * The geometry group exposes properties via {@link AcDbPropertyAccessor} so
   * the property palette can update the polyline in real-time.
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
              name: 'vertices',
              type: 'array',
              editable: false,
              itemSchema: {
                properties: [
                  {
                    name: 'x',
                    type: 'float',
                    editable: true
                  },
                  {
                    name: 'y',
                    type: 'float',
                    editable: true
                  }
                ]
              },
              accessor: {
                get: () => this._geo.vertices
              }
            },
            {
              name: 'elevation',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.elevation,
                set: (v: number) => {
                  this.elevation = v
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
        },
        {
          groupName: 'others',
          properties: [
            {
              name: 'closed',
              type: 'float',
              editable: true,
              accessor: {
                get: () => this.closed,
                set: (v: boolean) => {
                  this.closed = v
                }
              }
            }
          ]
        }
      ]
    }
  }

  /**
   * Draws this polyline using the specified renderer.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered polyline entity, or undefined if drawing failed
   */
  subWorldDraw(renderer: AcGiRenderer) {
    const points: AcGePoint3d[] = []
    const tmp = this._geo.getPoints(100)
    tmp.forEach(point =>
      points.push(new AcGePoint3d().set(point.x, point.y, this.elevation))
    )
    return renderer.lines(points)
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDb2dPolyline')
    let flag = this.closed ? 1 : 0
    if (this.polyType === AcDbPoly2dType.FitCurvePoly) flag |= 2
    if (this.polyType === AcDbPoly2dType.QuadSplinePoly) flag |= 4
    if (this.polyType === AcDbPoly2dType.CubicSplinePoly) flag |= 8
    filer.writeInt16(66, this.numberOfVertices > 0 ? 1 : 0)
    filer.writeInt16(70, flag)
    filer.writeDouble(38, this.elevation)
    return this
  }
}
