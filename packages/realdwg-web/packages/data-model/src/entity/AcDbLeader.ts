import {
  AcGeBox3d,
  AcGePoint3d,
  AcGePoint3dLike,
  AcGeSpline3d
} from '@mlightcad/geometry-engine'
import { AcGiRenderer } from '@mlightcad/graphic-interface'

import { AcDbDxfFiler } from '../base'
import { AcDbCurve } from './AcDbCurve'

/**
 * Defines the annotation type for leader entities.
 */
export enum AcDbLeaderAnnotationType {
  /** Multiline text annotation */
  MText = 0,
  /** Feature control frame annotation */
  Fcf = 1,
  /** Block reference annotation */
  BlockReference = 2,
  /** No annotation */
  NoAnnotation = 3
}

/**
 * Represents a leader entity in AutoCAD.
 *
 * A leader is a dimension-like entity that consists of a line or spline with an arrowhead
 * pointing to a specific object or location, and an annotation (text, block, or feature
 * control frame) at the other end. Leaders are controlled by dimension variable settings
 * and dimension styles.
 *
 * @example
 * ```typescript
 * // Create a leader entity
 * const leader = new AcDbLeader();
 * leader.appendVertex(new AcGePoint3d(0, 0, 0));
 * leader.appendVertex(new AcGePoint3d(5, 5, 0));
 * leader.appendVertex(new AcGePoint3d(10, 5, 0));
 * leader.hasArrowHead = true;
 * leader.hasHookLine = true;
 * leader.annoType = AcDbLeaderAnnotationType.MText;
 *
 * // Access leader properties
 * console.log(`Number of vertices: ${leader.numVertices}`);
 * console.log(`Has arrow head: ${leader.hasArrowHead}`);
 * console.log(`Has hook line: ${leader.hasHookLine}`);
 * ```
 */
export class AcDbLeader extends AcDbCurve {
  /** The entity type name */
  static override typeName: string = 'Leader'

  /** Whether this leader is spline-fit */
  private _isSplined: boolean
  /** The spline geometry if this leader is spline-fit */
  private _splineGeo?: AcGeSpline3d
  /** Whether this leader has been updated */
  private _updated: boolean
  /** Whether this leader has an arrowhead */
  private _hasArrowHead: boolean
  /** The vertices of the leader line */
  private _vertices: AcGePoint3d[]
  /** The dimension style applied to this leader */
  private _dimensionStyle: string
  /** Whether this leader has a hook line */
  private _hasHookLine: boolean
  /** The annotation type for this leader */
  private _annoType: AcDbLeaderAnnotationType

  /**
   * Creates a new leader entity.
   *
   * This constructor initializes a leader with default values.
   * The leader is not spline-fit, has no arrowhead, no hook line,
   * and no annotation type.
   *
   * @example
   * ```typescript
   * const leader = new AcDbLeader();
   * leader.appendVertex(new AcGePoint3d(0, 0, 0));
   * leader.appendVertex(new AcGePoint3d(5, 5, 0));
   * ```
   */
  constructor() {
    super()
    this._isSplined = false
    this._updated = false
    this._hasArrowHead = false
    this._vertices = []
    this._dimensionStyle = ''
    this._hasHookLine = false
    this._annoType = AcDbLeaderAnnotationType.NoAnnotation
  }

  /**
   * Gets whether this leader is spline-fit.
   *
   * @returns True if the leader is spline-fit, false otherwise
   *
   * @example
   * ```typescript
   * const isSplined = leader.isSplined;
   * console.log(`Leader is spline-fit: ${isSplined}`);
   * ```
   */
  get isSplined() {
    return this._isSplined
  }

  /**
   * Sets whether this leader is spline-fit.
   *
   * @param value - True to make the leader spline-fit, false otherwise
   *
   * @example
   * ```typescript
   * leader.isSplined = true;
   * ```
   */
  set isSplined(value: boolean) {
    this._isSplined = value
  }

  /**
   * Gets whether this leader has an arrowhead.
   *
   * @returns True if the leader has an arrowhead, false otherwise
   *
   * @example
   * ```typescript
   * const hasArrowHead = leader.hasArrowHead;
   * console.log(`Leader has arrowhead: ${hasArrowHead}`);
   * ```
   */
  get hasArrowHead() {
    return this._hasArrowHead
  }

  /**
   * Sets whether this leader has an arrowhead.
   *
   * @param value - True to enable arrowhead, false to disable
   *
   * @example
   * ```typescript
   * leader.hasArrowHead = true;
   * ```
   */
  set hasArrowHead(value: boolean) {
    this._hasArrowHead = value
  }

  /**
   * Gets whether this leader has a hook line.
   *
   * The "hookline" is the small horizontal line at the end of the leader line
   * just before the annotation.
   *
   * @returns True if the leader has a hook line, false otherwise
   *
   * @example
   * ```typescript
   * const hasHookLine = leader.hasHookLine;
   * console.log(`Leader has hook line: ${hasHookLine}`);
   * ```
   */
  get hasHookLine() {
    return this._hasHookLine
  }

  /**
   * Sets whether this leader has a hook line.
   *
   * @param value - True to enable hook line, false to disable
   *
   * @example
   * ```typescript
   * leader.hasHookLine = true;
   * ```
   */
  set hasHookLine(value: boolean) {
    this._hasHookLine = value
  }

  /**
   * Gets the number of vertices in the leader's vertex list.
   *
   * @returns The number of vertices
   *
   * @example
   * ```typescript
   * const numVertices = leader.numVertices;
   * console.log(`Number of vertices: ${numVertices}`);
   * ```
   */
  get numVertices(): number {
    return this._vertices.length
  }

  get vertices() {
    return this._vertices.map(point => point.clone())
  }

  /**
   * Gets the dimension style applied to this leader.
   *
   * @returns The dimension style name
   *
   * @example
   * ```typescript
   * const dimensionStyle = leader.dimensionStyle;
   * console.log(`Dimension style: ${dimensionStyle}`);
   * ```
   */
  get dimensionStyle() {
    return this._dimensionStyle
  }

  /**
   * Sets the dimension style applied to this leader.
   *
   * @param value - The new dimension style name
   *
   * @example
   * ```typescript
   * leader.dimensionStyle = "Standard";
   * ```
   */
  set dimensionStyle(value: string) {
    this._dimensionStyle = value
  }

  /**
   * Gets the leader's annotation type.
   *
   * @returns The annotation type
   *
   * @example
   * ```typescript
   * const annoType = leader.annoType;
   * console.log(`Annotation type: ${annoType}`);
   * ```
   */
  get annoType() {
    return this._annoType
  }

  /**
   * Sets the leader's annotation type.
   *
   * @param value - The new annotation type
   *
   * @example
   * ```typescript
   * leader.annoType = AcDbLeaderAnnotationType.MText;
   * ```
   */
  set annoType(value: AcDbLeaderAnnotationType) {
    this._annoType = value
  }

  /**
   * Appends vertex to the end of the vertex list for this leader. If vertex is not in the plane of the
   * leader, then it will be projected parallel the leader's normal onto the leader's plane and the
   * projection will be appended to the leader's vertex list. If the new vertex is too close to the one
   * next to it (that is, within 1.e-10 for X, Y, and Z), the new vertex will not be appended.
   * @param point Input point (in WCS coordinates) to add to the vertex list
   */
  appendVertex(point: AcGePoint3dLike) {
    this._vertices.push(new AcGePoint3d().copy(point))
    this._updated = true
  }

  /**
   * Reset the vertex at index to the point point projected (along the plane normal) onto the plane
   * containing the leader. It doesn't reset the vertex if that would cause one of the segments to
   * become zero length (within 1e-10).
   * @param index Input index number (0 based) of the vertex to change
   * @param point Input new point value (in WCS) to use
   */
  setVertexAt(index: number, point: AcGePoint3dLike) {
    if (index < 0 || index >= this._vertices.length) {
      // TODO: Project the point onto the plane containing the leader
      this._vertices[index].copy(point)
      this._updated = true
    }
    throw new Error('The vertex index is out of range!')
  }

  /**
   * Get the point that is the vertex at the location index (0 based) in this leader's vertex array.
   * @param index Input index number (0 based) of the vertex desired
   */
  vertexAt(index: number) {
    if (index < 0 || index >= this._vertices.length) {
      this._vertices[index]
    }
    throw new Error('The vertex index is out of range!')
  }

  /**
   * @inheritdoc
   */
  get geometricExtents() {
    if (this._isSplined && this.splineGeo) {
      return this.splineGeo.calculateBoundingBox()
    } else {
      const box = new AcGeBox3d()
      return box.setFromPoints(this._vertices)
    }
  }

  /**
   * @inheritdoc
   */
  get closed(): boolean {
    return false
  }
  set closed(_value: boolean) {
    // TODO: Not sure whether the leader really support setting value of property 'closed'
  }

  /**
   * @inheritdoc
   */
  subWorldDraw(renderer: AcGiRenderer) {
    if (this.isSplined && this.splineGeo) {
      const points = this.splineGeo.getPoints(100)
      return renderer.lines(points)
    } else {
      return renderer.lines(this._vertices)
    }
  }

  private get splineGeo() {
    this.createSplineIfNeeded()
    return this._splineGeo
  }

  private createSplineIfNeeded() {
    if (
      this.isSplined &&
      this.numVertices >= 2 &&
      (this._splineGeo == null || this._updated)
    ) {
      this._splineGeo = new AcGeSpline3d(this._vertices, 'Uniform')
      this._updated = false
    }
  }

  override dxfOutFields(filer: AcDbDxfFiler) {
    super.dxfOutFields(filer)
    filer.writeSubclassMarker('AcDbLeader')
    filer.writeString(3, this.dimensionStyle)
    filer.writeInt16(71, this.hasArrowHead ? 1 : 0)
    filer.writeInt16(72, this.annoType)
    filer.writeInt16(73, this.hasHookLine ? 1 : 0)
    filer.writeInt16(74, this.isSplined ? 1 : 0)
    filer.writeInt16(76, this.numVertices)
    for (const point of this.vertices) {
      filer.writePoint3d(10, point)
    }
    return this
  }
}
