import {
  AcGeArea2d,
  AcGeBox3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGePointLike,
  AcGePolyline2d
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbOsnapMode } from '../misc'
import { AcDbCurve } from './AcDbCurve'

/**
 * Represents a trace entity in AutoCAD.
 *
 * A trace is a 3D geometric object that represents a filled four-sided polygon.
 * It is typically used to create trace-like shapes and can be visualized as a
 * "filled polyline" with four vertices, where each edge connects two consecutive points.
 *
 * This entity was more commonly used in earlier versions of AutoCAD, especially before
 * the introduction of more advanced entities like solid and hatches. Today, it's not
 * as commonly used since solid provides similar capabilities with more flexibility.
 *
 * @example
 * ```typescript
 * // Create a trace entity
 * const trace = new AcDbTrace();
 * trace.setPointAt(0, new AcGePoint3d(0, 0, 0));
 * trace.setPointAt(1, new AcGePoint3d(10, 0, 0));
 * trace.setPointAt(2, new AcGePoint3d(10, 5, 0));
 * trace.setPointAt(3, new AcGePoint3d(0, 5, 0));
 *
 * // Access trace properties
 * console.log(`Elevation: ${trace.elevation}`);
 * console.log(`Thickness: ${trace.thickness}`);
 * ```
 */
export class AcDbTrace extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Trace'

  /** The elevation (Z-coordinate) of the trace plane */
  private _elevation: number
  /** The four vertices of the trace */
  private _vertices: [AcGePoint3d, AcGePoint3d, AcGePoint3d, AcGePoint3d]
  /** The thickness (extrusion) of the trace */
  private _thickness: number

  /**
   * Creates a new trace entity.
   *
   * This constructor initializes a trace with default values.
   * All vertices are set to the origin, elevation is 0, and thickness is 1.
   *
   * @example
   * ```typescript
   * const trace = new AcDbTrace();
   * // Set the four vertices to create a rectangle
   * trace.setPointAt(0, new AcGePoint3d(0, 0, 0));
   * trace.setPointAt(1, new AcGePoint3d(10, 0, 0));
   * trace.setPointAt(2, new AcGePoint3d(10, 5, 0));
   * trace.setPointAt(3, new AcGePoint3d(0, 5, 0));
   * ```
   */
  constructor() {
    super()
    this._elevation = 0
    this._thickness = 1
    this._vertices = [
      new AcGePoint3d(),
      new AcGePoint3d(),
      new AcGePoint3d(),
      new AcGePoint3d()
    ]
  }

  /**
   * Gets the elevation of this trace.
   *
   * The elevation is the distance of the trace's plane from the WCS origin
   * along the Z-axis.
   *
   * @returns The elevation value
   *
   * @example
   * ```typescript
   * const elevation = trace.elevation;
   * console.log(`Trace elevation: ${elevation}`);
   * ```
   */
  get elevation(): number {
    return this._elevation
  }

  /**
   * Sets the elevation of this trace.
   *
   * @param value - The new elevation value
   *
   * @example
   * ```typescript
   * trace.elevation = 10;
   * ```
   */
  set elevation(value: number) {
    this._elevation = value
  }

  /**
   * Gets whether this trace is closed.
   *
   * Traces are always closed entities, so this always returns true.
   *
   * @returns Always true for traces
   */
  get closed(): boolean {
    return true
  }

  /**
   * Gets the thickness of this trace.
   *
   * The thickness is the trace's dimension along its normal vector direction
   * (sometimes called the extrusion direction).
   *
   * @returns The thickness value
   *
   * @example
   * ```typescript
   * const thickness = trace.thickness;
   * console.log(`Trace thickness: ${thickness}`);
   * ```
   */
  get thickness() {
    return this._thickness
  }

  /**
   * Sets the thickness of this trace.
   *
   * @param value - The new thickness value
   *
   * @example
   * ```typescript
   * trace.thickness = 2.0;
   * ```
   */
  set thickness(value: number) {
    this._thickness = value
  }

  /**
   * Gets the point at the specified index in this trace.
   *
   * The index can be 0, 1, 2, or 3, representing the four vertices of the trace.
   * If the index is out of range, it returns the first or last vertex accordingly.
   *
   * @param index - The index (0-3) of the vertex to get
   * @returns The point at the specified index in WCS coordinates
   *
   * @example
   * ```typescript
   * const point0 = trace.getPointAt(0);
   * const point1 = trace.getPointAt(1);
   * console.log(`Vertex 0: ${point0.x}, ${point0.y}, ${point0.z}`);
   * ```
   */
  getPointAt(index: number): AcGePoint3d {
    if (index < 0) return this._vertices[0]
    if (index > 3) return this._vertices[3]
    return this._vertices[index]
  }

  /**
   * Sets the point at the specified index in this trace.
   *
   * The index must be 0, 1, 2, or 3, representing the four vertices of the trace.
   * If the index is out of range, it sets the first or last vertex accordingly.
   *
   * @param index - The index (0-3) of the vertex to set
   * @param point - The new point in WCS coordinates
   *
   * @example
   * ```typescript
   * trace.setPointAt(0, new AcGePoint3d(0, 0, 0));
   * trace.setPointAt(1, new AcGePoint3d(10, 0, 0));
   * trace.setPointAt(2, new AcGePoint3d(10, 5, 0));
   * trace.setPointAt(3, new AcGePoint3d(0, 5, 0));
   * ```
   */
  setPointAt(index: number, point: AcGePointLike) {
    if (index < 0) this._vertices[0].copy(point)
    if (index > 3) return this._vertices[3].copy(point)
    this._vertices[index].copy(point)
  }

  /**
   * Gets the geometric extents (bounding box) of this trace.
   *
   * @returns The bounding box that encompasses the entire trace
   *
   * @example
   * ```typescript
   * const extents = trace.geometricExtents;
   * console.log(`Trace bounds: ${extents.minPoint} to ${extents.maxPoint}`);
   * ```
   */
  get geometricExtents(): AcGeBox3d {
    return new AcGeBox3d().setFromPoints(this._vertices)
  }

  /**
   * Gets the grip points for this trace.
   *
   * Grip points are control points that can be used to modify the trace.
   * For a trace, the grip points are all four vertices.
   *
   * @returns Array of grip points (all four vertices)
   *
   * @example
   * ```typescript
   * const gripPoints = trace.subGetGripPoints();
   * // gripPoints contains all four vertices of the trace
   * ```
   */
  subGetGripPoints() {
    const gripPoints = new Array<AcGePoint3d>()
    gripPoints.push(...this._vertices)
    return gripPoints
  }

  /**
   * Gets the object snap points for this trace.
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
        snapPoints.push(...this._vertices)
        break
      default:
        break
    }
  }

  /**
   * Draws this trace using the specified renderer.
   *
   * This method renders the trace as a filled area using the trace's
   * current style properties.
   *
   * @param renderer - The renderer to use for drawing
   * @returns The rendered trace entity, or undefined if drawing failed
   */
  subWorldDraw(renderer: AcGiRenderer) {
    const polyline = new AcGePolyline2d(this._vertices, true)
    const area = new AcGeArea2d()
    area.add(polyline)

    const traits = renderer.subEntityTraits
    traits.fillType = {
      solidFill: true,
      patternAngle: 0,
      definitionLines: []
    }
    return renderer.area(area)
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbTrace')
    filer.writeDouble(38, this.elevation)
    filer.writeDouble(39, this.thickness)
    filer.writePoint3d(10, this.getPointAt(0))
    filer.writePoint3d(11, this.getPointAt(1))
    filer.writePoint3d(12, this.getPointAt(2))
    filer.writePoint3d(13, this.getPointAt(3))
    return this
  }
}
