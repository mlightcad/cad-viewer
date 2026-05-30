import {
  AcGeBox2d,
  AcGeMatrix3d,
  AcGePoint3d,
  AcGiEntity
} from '@mlightcad/data-model'

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

  constructor() {
    this._objectId = ''
    this._ownerId = ''
    this._layerName = ''
    this._visible = true
    this._userData = {}
    this._box = new AcGeBox2d()
    this._localSvg = ''
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
   * Final SVG fragment with accumulated transforms applied.
   */
  renderSvg(): string {
    if (!this._localSvg) {
      return ''
    }
    if (!this._matrix) {
      return this._localSvg
    }
    const transform = AcSvgMatrixUtil.toSvgTransform(this._matrix)
    return `<g transform="${transform}">\n${this._localSvg}\n</g>`
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
    AcSvgMatrixUtil.transformBox(this._box, matrix)
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

  fastDeepClone() {
    return this
  }

  addChild(_entity: AcGiEntity) {
    // Do nothing for now
  }

  bakeTransformToChildren() {
    // Do nothing for now
  }
}
