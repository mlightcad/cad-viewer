import {
  AcGeBox3d,
  AcGePoint2d,
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
 * Represents one vertex of a polyline entity in AutoCAD.
 *
 * A polyline vertex extends the basic vertex with additional properties
 * for width control and bulge (arc segments).
 */
interface AcDbPolylineVertex extends AcGePolyline2dVertex {
  /** The starting width at this vertex */
  startWidth?: number
  /** The ending width at this vertex */
  endWidth?: number
}

/**
 * Represents a polyline entity in AutoCAD.
 *
 * A polyline is a complex geometric object composed of connected line segments
 * and/or arc segments. Polylines can have:
 * - Straight line segments
 * - Bulge (arc segments) between vertices
 * - Constant and variable width
 * - Thickness
 * - Multiple vertices
 *
 * Polylines are commonly used for creating complex shapes, paths, and boundaries
 * in drawings.
 *
 * @example
 * ```typescript
 * // Create a polyline
 * const polyline = new AcDbPolyline();
 *
 * // Add vertices to create a rectangle
 * polyline.addVertexAt(0, new AcGePoint2d(0, 0));
 * polyline.addVertexAt(1, new AcGePoint2d(10, 0));
 * polyline.addVertexAt(2, new AcGePoint2d(10, 5));
 * polyline.addVertexAt(3, new AcGePoint2d(0, 5));
 * polyline.closed = true; // Close the polyline
 *
 * // Access polyline properties
 * console.log(`Number of vertices: ${polyline.numberOfVertices}`);
 * console.log(`Is closed: ${polyline.closed}`);
 * ```
 */
export class AcDbPolyline extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Polyline'

  /** The elevation (Z-coordinate) of the polyline plane */
  private _elevation: number
  /** The underlying geometric polyline object */
  private _geo: AcGePolyline2d<AcDbPolylineVertex>

  /**
   * Creates a new empty polyline entity.
   *
   * This constructor initializes an empty polyline with no vertices.
   * Vertices can be added using the addVertexAt method.
   *
   * @example
   * ```typescript
   * const polyline = new AcDbPolyline();
   * // Add vertices as needed
   * polyline.addVertexAt(0, new AcGePoint2d(0, 0));
   * ```
   */
  constructor() {
    super()
    this._elevation = 0
    this._geo = new AcGePolyline2d()
  }

  /**
   * Gets the number of vertices in this polyline.
   *
   * @returns The number of vertices
   *
   * @example
   * ```typescript
   * const vertexCount = polyline.numberOfVertices;
   * console.log(`Polyline has ${vertexCount} vertices`);
   * ```
   */
  get numberOfVertices(): number {
    return this._geo.numberOfVertices
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

  /**
   * Adds a vertex to this polyline at the specified index.
   *
   * This method inserts a vertex at the specified position. If the index is 0,
   * the vertex becomes the first vertex. If the index equals the number of vertices,
   * the vertex becomes the last vertex. Otherwise, the vertex is inserted before
   * the specified index.
   *
   * @param index - The index (0-based) before which to insert the vertex
   * @param pt - The vertex location point
   * @param bulge - The bulge value for the vertex (0 for straight line, >0 for arc)
   * @param startWidth - The starting width for the vertex (-1 for default)
   * @param endWidth - The ending width for the vertex (-1 for default)
   *
   * @example
   * ```typescript
   * // Add a straight line vertex
   * polyline.addVertexAt(0, new AcGePoint2d(0, 0));
   *
   * // Add a vertex with arc bulge
   * polyline.addVertexAt(1, new AcGePoint2d(5, 0), 0.5);
   *
   * // Add a vertex with custom width
   * polyline.addVertexAt(2, new AcGePoint2d(10, 0), 0, 2, 1);
   * ```
   */
  addVertexAt(
    index: number,
    pt: AcGePoint2d,
    bulge: number = 0,
    startWidth: number = -1,
    endWidth: number = -1
  ) {
    const newStartWidth = startWidth < 0 ? undefined : startWidth
    const newEndWidth = endWidth < 0 ? undefined : endWidth
    const vertex: AcDbPolylineVertex = {
      x: pt.x,
      y: pt.y,
      bulge: bulge,
      startWidth: newStartWidth,
      endWidth: newEndWidth
    }
    this._geo.addVertexAt(index, vertex)
  }

  /**
   * This function removes a vertex from the polyline at the specified index.
   *
   * @param index Input index (0 based) of the vertex to remove
   * @throws Error if the index is out of bounds
   */
  removeVertexAt(index: number) {
    this._geo.removeVertexAt(index)
  }

  /**
   * This function resets the polyline by optionally retaining some vertices.
   * If reuse is true, the numVerts number of vertices are left intact and all vertices
   * beyond that number are deleted. If reuse is false, numVerts is ignored and all
   * existing vertex information will be deleted.
   *
   * @param reuse Input Boolean indicating whether or not to retain some vertices
   * @param numVerts Input number of vertices to retain (only used when reuse is true)
   */
  reset(reuse: boolean, numVerts?: number) {
    this._geo.reset(reuse, numVerts)
  }

  /**
   * Gets the 2D location of a vertex at the specified index.
   *
   * The point is returned in the polyline's own object coordinate system (OCS).
   *
   * @param index - The index (0-based) of the vertex
   * @returns The 2D point location of the vertex
   *
   * @example
   * ```typescript
   * const point2d = polyline.getPoint2dAt(0);
   * console.log(`Vertex 0: ${point2d.x}, ${point2d.y}`);
   * ```
   */
  getPoint2dAt(index: number): AcGePoint2d {
    return this._geo.getPointAt(index)
  }

  /**
   * Gets the 3D location of a vertex at the specified index.
   *
   * The point is returned in World Coordinates, with the Z-coordinate
   * set to the polyline's elevation.
   *
   * @param index - The index (0-based) of the vertex
   * @returns The 3D point location of the vertex
   *
   * @example
   * ```typescript
   * const point3d = polyline.getPoint3dAt(0);
   * console.log(`Vertex 0: ${point3d.x}, ${point3d.y}, ${point3d.z}`);
   * ```
   */
  getPoint3dAt(index: number): AcGePoint3d {
    const vertex = this.getPoint2dAt(index)
    return new AcGePoint3d(vertex.x, vertex.y, this._elevation)
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
   *
   * @example
   * ```typescript
   * const gripPoints = polyline.subGetGripPoints();
   * // gripPoints contains all vertices of the polyline
   * ```
   */
  subGetGripPoints() {
    const gripPoints = new Array<AcGePoint3d>()
    for (let index = 0; index < this.numberOfVertices; ++index) {
      gripPoints.push(this.getPoint3dAt(index))
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
    const endPoints = new Array<AcGePoint3d>()
    for (let index = 0; index < this.numberOfVertices; ++index) {
      endPoints.push(this.getPoint3dAt(index))
    }

    switch (osnapMode) {
      case AcDbOsnapMode.EndPoint:
        snapPoints.push(...endPoints)
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
   * This method renders the polyline as a series of connected line segments
   * using the polyline's current style properties.
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
    filer.writeSubclassMarker('AcDbPolyline')
    filer.writeInt32(90, this.numberOfVertices)
    filer.writeInt16(70, this.closed ? 1 : 0)
    filer.writeDouble(38, this.elevation)
    for (let i = 0; i < this.numberOfVertices; ++i) {
      filer.writePoint2d(10, this.getPoint2dAt(i))
    }
    return this
  }
}
