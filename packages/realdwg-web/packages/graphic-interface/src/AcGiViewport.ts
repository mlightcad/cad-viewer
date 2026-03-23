import { AcGeBox2d, AcGePoint3d } from '@mlightcad/geometry-engine'

/**
 * This class ised used to pass back information to the user about the viewing characteristics of the
 * current viewport.
 */
export class AcGiViewport {
  private _centerPoint: AcGePoint3d
  private _height: number
  private _width: number
  private _viewCenter: AcGePoint3d
  private _viewHeight: number
  private _number: number
  private _id: string
  private _groupId: string

  constructor() {
    this._number = -1
    this._id = ''
    this._groupId = ''
    this._centerPoint = new AcGePoint3d()
    this._height = 0
    this._width = 0
    this._viewCenter = new AcGePoint3d()
    this._viewHeight = 0
  }

  /**
   * The viewport ID number. If the viewport is inactive, -1 is returned.
   */
  get number() {
    return this._number
  }
  set number(value: number) {
    this._number = value
  }

  /**
   * The id of the viewport.
   */
  get id() {
    return this._id
  }
  set id(value: string) {
    this._id = value
  }

  /**
   * The id of the group which this viewport belongs to.
   */
  get groupId() {
    return this._groupId
  }
  set groupId(value: string) {
    this._groupId = value
  }

  /**
   * The center point of the viewport entity in WCS coordinates (within Paper Space).
   */
  get centerPoint() {
    return this._centerPoint
  }
  set centerPoint(value: AcGePoint3d) {
    this._centerPoint.copy(value)
  }

  /**
   * The height of the viewport entity's window in drawing units.
   */
  get height() {
    return this._height
  }
  set height(value: number) {
    this._height = value
  }

  /**
   * The width of the viewport entity's window in drawing units. This is the width in Paper Space
   * of the viewport itself, not the width of the Model Space view within the viewport.
   */
  get width() {
    return this._width
  }
  set width(value: number) {
    this._width = value
  }

  /**
   * The bounding box (in world coordinate system coordinates) of the viewport.
   */
  get box() {
    const box = new AcGeBox2d()
    box.setFromCenterAndSize(this.centerPoint, {
      x: this.width,
      y: this.height
    })
    return box
  }

  /**
   * The view center (in display coordinate system coordinates) of the view in the viewport.
   */
  get viewCenter() {
    return this._viewCenter
  }
  set viewCenter(value: AcGePoint3d) {
    this._viewCenter.copy(value)
  }

  /**
   * The height (in display coordinate system coordinates) of the Model Space view within the viewport.
   * Zooming the view out within the viewport increases this value and zooming in decreases this value.
   */
  get viewHeight() {
    return this._viewHeight
  }
  set viewHeight(value: number) {
    this._viewHeight = value
  }

  /**
   * The width (in display coordinate system coordinates) of the Model Space view within the viewport.
   * This is one computed property based on 'viewHeight' and viewport ratio of width and height.
   */
  get viewWidth() {
    return this.viewHeight * (this.width / this.height)
  }

  /**
   * The bounding box (in display coordinate system coordinates) of the Model Space view within the viewport.
   */
  get viewBox() {
    const box = new AcGeBox2d()
    box.setFromCenterAndSize(this.viewCenter, {
      x: this.viewWidth,
      y: this.viewHeight
    })
    return box
  }

  /**
   * Clone this viewport
   * @returns Return the cloned instance of this viewport
   */
  clone() {
    const viewport = new AcGiViewport()
    viewport.id = this.id
    viewport.groupId = this.groupId
    viewport.number = this.number
    viewport.centerPoint.copy(this.centerPoint)
    viewport.height = this.height
    viewport.width = this.width
    viewport.viewCenter.copy(this.viewCenter)
    viewport.viewHeight = this.viewHeight
    return viewport
  }

  /**
   * Copy the property values of the passed viewport to this viewport.
   * @param viewport Input one viewport instance
   * @returns Return this viewport
   */
  copy(viewport: AcGiViewport) {
    this.id = viewport.id
    this.groupId = viewport.groupId
    this.number = viewport.number
    this.centerPoint.copy(viewport.centerPoint)
    this.height = viewport.height
    this.width = viewport.width
    this.viewCenter.copy(viewport.viewCenter)
    this.viewHeight = viewport.viewHeight
    return this
  }
}
