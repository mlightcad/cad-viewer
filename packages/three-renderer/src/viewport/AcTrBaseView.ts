import {
  AcCmEventManager,
  AcGeBox2d,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGeVector2d
} from '@mlightcad/data-model'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { AcTrRenderer } from '../renderer'
import { AcTrCamera } from './AcTrCamera'

export interface AcDbEntityEventArgs {
  view: AcTrBaseView
}

/**
 * The base class for all kinds of views.
 */
export class AcTrBaseView {
  protected _frustum = 400
  protected _width: number
  protected _height: number
  protected _renderer: AcTrRenderer
  protected _camera: AcTrCamera
  protected _cameraControls: OrbitControls
  protected _raycaster: THREE.Raycaster

  public readonly events = {
    viewChanged: new AcCmEventManager<AcDbEntityEventArgs>()
  }

  /**
   * Construct one instance of this class
   * @param renderer Input renderer
   * @param width Input width of this view
   * @param height Input height of this view
   */
  constructor(renderer: AcTrRenderer, width: number, height: number) {
    this._renderer = renderer
    this._width = width
    this._height = height
    const camera = this.createCamera()
    this._camera = new AcTrCamera(camera)
    this._cameraControls = this.createCameraControls()

    this._cameraControls.addEventListener('change', () => {
      this.events.viewChanged.dispatch({ view: this })
    })
    this._raycaster = new THREE.Raycaster()
  }

  /**
   * Width of canvas (not width of window) in pixel
   */
  get width() {
    return this._width
  }
  set width(value: number) {
    this._width = value
  }

  /**
   * Height of canvas (not height of window) in pixel
   */
  get height() {
    return this._height
  }
  set height(value: number) {
    this._height = value
  }

  /**
   * The flag whether to enable camera controller
   */
  get enabled() {
    return this._cameraControls.enabled
  }
  set enabled(value: boolean) {
    this._cameraControls.enabled = value
  }

  /**
   * The center point of the current layout view
   */
  get center() {
    return this._camera.screenToWorld(
      { x: this._width / 2, y: this._height / 2 },
      this._width,
      this._height
    )
  }
  set center(value: AcGePoint2d) {
    this._camera.position.set(value.x, value.y, this._camera.position.z)
    this._camera.updateProjectionMatrix()
  }

  /**
   * Convert point cooridinate from the screen coordinate system to the world coordinate system.
   * The origin of the screen coordinate system is the left-top corner of the browser.
   * @param point Input point to convert
   * @returns Return point coordinate in the world coordinate system
   */
  screenToWorld(point: AcGePoint2dLike): AcGePoint2d {
    return this._camera.screenToWorld(point, this._width, this._height)
  }

  /**
   * Convert point cooridinate from the world coordinate system to the screen coordinate system.
   * The origin of the screen coordinate system is the left-top corner of the browser.
   * @param point Input point to convert
   * @returns Return point coordinate in the screen coordinate system
   */
  worldToScreen(point: AcGePoint2dLike): AcGePoint2d {
    return this._camera.worldToScreen(point, this._width, this._height)
  }

  /**
   * Convert one point in the world coorindate system to one bounding box by extending the point with the
   * specified margin in pixel unit.
   * @param margin Input the margin in pixel unit.
   * @returns Return one bounding box
   */
  pointToBox(point: AcGePoint2dLike, margin: number) {
    const cwcsCoord = this.worldToScreen(point)
    const p1 = this.screenToWorld({
      x: cwcsCoord.x + margin,
      y: cwcsCoord.y + margin
    })
    const p2 = this.screenToWorld({
      x: cwcsCoord.x - margin,
      y: cwcsCoord.y - margin
    })
    return new AcGeBox2d().setFromPoints([p1, p2])
  }

  /**
   * Reset ray of raycaster associated with this view by the provided parameters and return
   * the raycaster associated with this view.
   * @param point Input 2D coordinates of the mouse in the world coordinate system.
   * @param threshold Input line and point threshold to check for intersection with the ray.
   * @returns Return the raycaster associated with this view.
   */
  resetRaycaster(point: AcGePoint2dLike, threshold: number) {
    const ndcCoord = this._camera.wcs2Ndc(point, this._width, this._height)
    this._raycaster.setFromCamera(
      new THREE.Vector2(ndcCoord.x, ndcCoord.y),
      this._camera.internalCamera
    )
    this._raycaster.params.Line.threshold = threshold
    this._raycaster.params.Points.threshold = threshold

    return this._raycaster
  }

  zoomTo(box: AcGeBox2d, margin: number = 1.1) {
    const size = new AcGeVector2d()
    box.getSize(size)

    const center = new AcGeVector2d()
    box.getCenter(center)

    const width = size.x * margin
    const height = size.y * margin
    const widthRatio = this._width / width
    const heightRatio = this._height / height
    let scale = Math.min(widthRatio, heightRatio)

    this.flyTo(center, scale)
    this.updateCameraFrustum()
  }

  /**
   * Moves the current view to the specified 2D point at the given scale.
   *
   * @param point - Target location in world coordinates to fly the view to.
   * @param scale - The optional target zoom scale to apply after the transition.
   * If not specified, the scale will not change.
   */
  flyTo(point: AcGePoint2dLike, scale?: number) {
    const threeCenter = new THREE.Vector3(point.x, point.y, 0)
    this._camera.position.set(point.x, point.y, this._camera.position.z)

    this._camera.lookAt(threeCenter)
    this._camera.setRotationFromEuler(new THREE.Euler(0, 0, 0))

    this._cameraControls.target = threeCenter

    if (scale != null) this._camera.zoom = scale
    this._camera.updateProjectionMatrix()
  }

  protected updateCameraFrustum(width?: number, height?: number) {
    const aspect = (width ?? this._width) / (height ?? this._height)
    this._camera.left = -aspect * this._frustum
    this._camera.right = aspect * this._frustum
    this._camera.top = this._frustum
    this._camera.bottom = -this._frustum
    this._camera.updateProjectionMatrix()
    this._cameraControls.update()
  }

  private createCamera() {
    const cameraLen = 500
    const camera = new THREE.OrthographicCamera(
      -this._width / 2,
      this._width / 2,
      this._height / 2,
      -this._height / 2,
      0.1,
      1000
    )
    camera.position.set(0, 0, cameraLen)
    camera.up.set(0, 1, 0)
    camera.updateProjectionMatrix()
    return camera
  }

  private createCameraControls() {
    const cameraControls = new OrbitControls(
      this._camera.internalCamera,
      this._renderer.domElement
    )
    cameraControls.enableDamping = false
    cameraControls.autoRotate = false
    cameraControls.enableRotate = false
    cameraControls.zoomSpeed = 5
    cameraControls.mouseButtons = {
      MIDDLE: THREE.MOUSE.PAN
    }
    cameraControls.touches = {
      ONE: THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.DOLLY_PAN
    }
    cameraControls.update()
    return cameraControls
  }
}
