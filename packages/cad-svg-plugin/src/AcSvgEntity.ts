import {
  AcGeBox2d,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGiEntity
} from '@mlightcad/data-model'

import { isUsableSvgBox } from './AcSvgExtents'
import { AcSvgMatrixUtil } from './AcSvgMatrixUtil'

/**
 * Represent the display object of one drawing entity.
 */
export class AcSvgEntity implements AcGiEntity {
  private _objectId: string
  private _ownerId: string
  private _layerName: string
  private _visible: boolean
  private _userData: object
  protected _box: AcGeBox2d
  protected _localSvg: string
  private _matrix?: AcGeMatrix3d
  protected _basePoint?: AcGePoint3d
  /** Live children (INSERT ATTRIBs, group members). Kept for clone/addChild. */
  private _children: AcSvgEntity[]

  constructor() {
    this._objectId = ''
    this._ownerId = ''
    this._layerName = ''
    this._visible = true
    this._userData = {}
    this._box = new AcGeBox2d()
    this._localSvg = ''
    this._children = []
  }

  /**
   * The bounding box of this object in world coordinates (includes transforms).
   */
  get box() {
    return this._box
  }
  set box(value: AcGeBox2d) {
    this._box.copy(value)
  }

  get basePoint() {
    return this._basePoint
  }
  set basePoint(value: AcGePoint3d | undefined) {
    if (value == null) {
      this._basePoint = value
    } else {
      this._basePoint = this._basePoint
        ? this._basePoint.copy(value)
        : new AcGePoint3d(value)
    }
  }

  /**
   * SVG markup including any transforms applied via {@link applyMatrix}.
   */
  get svg() {
    return this.renderSvg()
  }
  set svg(value: string) {
    this._localSvg = value
  }

  /**
   * Local SVG markup without wrapping transforms.
   */
  getLocalSvg(): string {
    return this._localSvg
  }

  /**
   * Number of live child drawables (group members / ATTRIBs).
   *
   * Used by {@link AcDbRenderingCache} compaction heuristics.
   */
  get childCount() {
    return this._children.length
  }

  /**
   * Final SVG fragment with accumulated transforms and children applied.
   */
  renderSvg(): string {
    const parts: string[] = []
    if (this._localSvg) {
      parts.push(this._localSvg)
    }
    for (const child of this._children) {
      const svg = child.renderSvg()
      if (svg) {
        parts.push(svg)
      }
    }
    const inner = parts.join('\n')
    if (!inner) {
      return ''
    }
    if (!this._matrix) {
      return inner
    }
    const transform = AcSvgMatrixUtil.toSvgTransform(this._matrix)
    return `<g transform="${transform}">\n${inner}\n</g>`
  }

  get objectId() {
    return this._objectId
  }
  set objectId(value: string) {
    this._objectId = value
  }

  get ownerId() {
    return this._ownerId
  }
  set ownerId(value: string) {
    this._ownerId = value
  }

  get layerName() {
    return this._layerName
  }
  set layerName(value: string) {
    this._layerName = value
  }

  get visible() {
    return this._visible
  }
  set visible(value: boolean) {
    this._visible = value
  }

  get userData(): object {
    return this._userData
  }
  set userData(value: object) {
    this._userData = value
  }

  /**
   * @inheritdoc
   */
  applyMatrix(matrix: AcGeMatrix3d) {
    if (!this._matrix) {
      this._matrix = matrix.clone()
    } else {
      this._matrix = matrix.clone().multiply(this._matrix)
    }
    this.transformBoxesRecursive(matrix)
  }

  private transformBoxesRecursive(matrix: AcGeMatrix3d) {
    AcSvgMatrixUtil.transformBox(this._box, matrix)
    for (const child of this._children) {
      child.transformBoxesRecursive(matrix)
    }
  }

  recomputeBoundingBox() {
    // Bounding boxes are maintained during draw and applyMatrix.
  }

  highlight() {
    // Do nothing
  }

  unhighlight() {
    // Do nothing
  }

  /**
   * Clones this node for {@link AcDbRenderingCache} INSERT instancing.
   *
   * Must return a distinct object: the cache stores the template by reference,
   * then clones before `applyMatrix`. Returning `this` mutates the template and
   * accumulates transforms across INSERT instances.
   *
   * Local SVG markup strings are shared (immutable). Children are deep-cloned
   * so per-instance ATTRIBs / nested transforms stay independent.
   */
  fastDeepClone(): AcSvgEntity {
    const cloned = new AcSvgEntity()
    cloned._objectId = this._objectId
    cloned._ownerId = this._ownerId
    cloned._layerName = this._layerName
    cloned._visible = this._visible
    cloned._userData = this._userData
    cloned._localSvg = this._localSvg
    cloned._box.copy(this._box)
    if (this._matrix) {
      cloned._matrix = this._matrix.clone()
    }
    if (this._basePoint) {
      cloned._basePoint = this._basePoint.clone()
    }
    for (const child of this._children) {
      cloned._children.push(child.fastDeepClone())
    }
    return cloned
  }

  addChild(entity: AcGiEntity) {
    if (entity instanceof AcSvgEntity) {
      this._children.push(entity)
      if (isUsableSvgBox(entity.box)) {
        this._box.union(entity.box)
      }
    }
  }
}
