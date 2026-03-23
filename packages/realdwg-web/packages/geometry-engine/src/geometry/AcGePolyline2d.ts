import { AcGeBox2d, AcGeMatrix2d, AcGePoint2d, AcGePoint3d } from '../math'
import { AcGeCircArc2d } from './AcGeCircArc2d'
import { AcGeCurve2d } from './AcGeCurve2d'

/**
 * The class represents one vertex of the polyline geometry.
 */
export interface AcGePolyline2dVertex {
  x: number
  y: number
  /**
   * The bulge factor used to indicate how much of an arc segment is present at this vertex.
   * The bulge factor is the tangent of one fourth the included angle for an arc segment, made
   * negative if the arc goes clockwise from the start point to the endpoint. A bulge of 0 indicates a
   * straight segment, and a bulge of 1 is a semicircle. Get more details from the following links.
   * - https://ezdxf.readthedocs.io/en/stable/dxfentities/lwpolyline.html
   * - https://www.afralisp.net/archive/lisp/Bulges1.htm
   */
  bulge?: number
}

/**
 * The class represents the polyline geometry.
 */
export class AcGePolyline2d<
  T extends AcGePolyline2dVertex = AcGePolyline2dVertex
> extends AcGeCurve2d {
  private _closed: boolean
  private _vertices: Array<T>

  constructor(vertices: Array<T> | null = null, closed: boolean = false) {
    super()
    this._vertices = vertices ? vertices : new Array<T>()
    this._closed = closed
  }

  /**
   * Vertices in the polyline.
   *
   * Notes:
   * This property is exposed so that it is easier to iterate each vertex in this
   * polyline. Please do not add or remove vertex through this property.
   */
  get vertices(): Array<T> {
    return this._vertices
  }

  /**
   * The number of vertices in the polyline
   */
  get numberOfVertices(): number {
    return this._vertices.length
  }

  /**
   * @inheritdoc
   */
  get closed(): boolean {
    return this._closed
  }

  /**
   * Start point of this polyline
   */
  get startPoint(): AcGePoint2d {
    if (this.numberOfVertices > 0) {
      const vertex = this._vertices[0]
      return new AcGePoint2d(vertex.x, vertex.y)
    }
    throw new Error('Start point does not exist in an empty polyline.')
  }

  /**
   * End point of this polyline
   */
  get endPoint(): AcGePoint2d {
    const length = this.numberOfVertices
    if (length > 0) {
      if (this.closed) {
        const vertex = this._vertices[0]
        return new AcGePoint2d(vertex.x, vertex.y)
      } else {
        const vertex = this._vertices[length - 1]
        return new AcGePoint2d(vertex.x, vertex.y)
      }
    }
    throw new Error('End point does not exist in an empty polyline.')
  }

  /**
   * @inheritdoc
   */
  get length() {
    let length = 0
    const vertexArraylength = this._vertices.length
    for (let index = 0; index < vertexArraylength; ++index) {
      const vertex = this._vertices[index]
      let nextVertex: AcGePolyline2dVertex | null = null
      if (index < vertexArraylength - 1) {
        nextVertex = this._vertices[index + 1]
      } else if (index == vertexArraylength - 1 && this.closed) {
        nextVertex = this._vertices[0]
      }
      if (nextVertex) {
        if (vertex.bulge) {
          const arc = new AcGeCircArc2d(vertex, nextVertex, vertex.bulge)
          length += arc.length
        } else {
          length += new AcGePoint2d(vertex.x, vertex.y).distanceTo(nextVertex)
        }
      }
    }
    return length
  }

  /**
   * Set the polyline to be closed (that is, there is a segment drawn from the last vertex to the first)
   * if 'value' is true. Set the polyline to be open (no segment between the last and first vertices) if
   * 'value' is false.
   */
  set closed(value: boolean) {
    this._closed = value
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * This function adds a vertex to the polyline. If index is 0, the vertex will become the first
   * vertex of the polyline. If index is the value returned by this.numberOfVertices, then the vertex
   * will become the last vertex of the polyline. Otherwise the vertex will be added just before the
   * index vertex.
   *
   * @param index Input index (0 based) before which to insert the vertex
   * @param vertex Input vertex location point
   */
  addVertexAt(index: number, vertex: T) {
    if (index <= 0) {
      this._vertices.unshift(vertex)
    } else {
      this._vertices.splice(index, 0, vertex)
    }
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * This function removes a vertex from the polyline at the specified index.
   *
   * @param index Input index (0 based) of the vertex to remove
   * @throws Error if the index is out of bounds
   */
  removeVertexAt(index: number) {
    if (index < 0 || index >= this._vertices.length) {
      throw new Error(
        `Index ${index} is out of bounds. Valid range is 0 to ${this._vertices.length - 1}.`
      )
    }
    this._vertices.splice(index, 1)
    this._boundingBoxNeedsUpdate = true
  }

  /**
   * This function resets the polyline by optionally retaining some vertices.
   * If reuse is true, the numVerts number of vertices are left intact and all vertices
   * beyond that number are deleted. If reuse is false, numVerts is ignored and all
   * existing vertex information will be deleted.
   *
   * @param reuse Input boolean indicating whether or not to retain some vertices
   * @param numVerts Input number of vertices to retain (only used when reuse is true)
   */
  reset(reuse: boolean, numVerts?: number) {
    if (reuse) {
      if (numVerts !== undefined && numVerts >= 0) {
        // Keep only the first numVerts vertices
        if (numVerts < this._vertices.length) {
          this._vertices = this._vertices.slice(0, numVerts)
          this._boundingBoxNeedsUpdate = true
        }
        // If numVerts >= current length, no change needed
      }
      // If numVerts is undefined, keep all vertices (no change)
    } else {
      // Delete all vertices
      this._vertices = new Array<T>()
      this._boundingBoxNeedsUpdate = true
    }
  }

  /**
   * Get the 2d location of the vertex index in the polyline's own object coordinate system (OCS).
   *
   * @param index Input index (0 based) of the vertex
   */
  getPointAt(index: number): AcGePoint2d {
    const vertex = this._vertices[index]
    return new AcGePoint2d(vertex.x, vertex.y)
  }

  /**
   * @inheritdoc
   */
  calculateBoundingBox(): AcGeBox2d {
    const points = this.getPoints(100)
    return new AcGeBox2d().setFromPoints(points)
  }

  /**
   * @inheritdoc
   */
  transform(_matrix: AcGeMatrix2d) {
    // TODO: implement it
    this._boundingBoxNeedsUpdate = true
    return this
  }

  /**
   * Return an array of points to draw this polyline.
   * @param numPoints Input the nubmer of points returned for arc segmentation
   * @param elevation Input z value of points returned
   * @returns Return an array of point
   */
  getPoints3d(numPoints: number, elevation: number) {
    const points: AcGePoint3d[] = []
    const tmp = this.getPoints(numPoints)
    tmp.forEach(point =>
      points.push(new AcGePoint3d().set(point.x, point.y, elevation))
    )
    return points
  }

  /**
   * Return an array of points to draw this polyline.
   * @param numPoints Input the nubmer of points returned for arc segmentation
   * @returns Return an array of point
   */
  getPoints(numPoints: number): AcGePoint2d[] {
    const points: AcGePoint2d[] = []
    const length = this._vertices.length
    for (let index = 0; index < length; ++index) {
      const vertex = this._vertices[index]
      if (vertex.bulge) {
        let nextVertex: AcGePolyline2dVertex | null = null
        if (index < length - 1) {
          nextVertex = this._vertices[index + 1]
        } else if (index == length - 1 && this.closed) {
          nextVertex = this._vertices[0]
        }
        // In theory, nextVertex should be always not null
        if (nextVertex) {
          const arc = new AcGeCircArc2d(vertex, nextVertex, vertex.bulge)
          const arcPoints = arc.getPoints(numPoints)
          const length = arcPoints.length
          for (let i = 0; i < length; ++i) {
            const point = arcPoints[i]
            points.push(new AcGePoint2d(point.x, point.y))
          }
        }
      } else {
        points.push(new AcGePoint2d(vertex.x, vertex.y))
        if (index == length - 1 && this.closed) {
          points.push(points[0])
        }
      }
    }
    return points
  }
}
