import { AcGePoint2d, AcGePoint2dLike } from '@mlightcad/data-model'
import * as THREE from 'three'

export class AcTrCamera {
  /**
   * Half-depth of the default orthographic depth band: the camera sits at
   * `+DEFAULT_DEPTH_HALF` looking down -Z and sees WCS Z in
   * `[-DEFAULT_DEPTH_HALF, +DEFAULT_DEPTH_HALF)`.
   */
  static readonly DEFAULT_DEPTH_HALF = 500
  /** Near-plane distance of 2D view cameras. */
  static readonly NEAR = 0.1
  /**
   * Clearance kept between fitted geometry and the near/far planes, so
   * draw-order Z offsets stacked on top of the geometry are not clipped.
   */
  private static readonly DEPTH_MARGIN = 100

  private _camera: THREE.OrthographicCamera

  constructor(camera: THREE.OrthographicCamera) {
    this._camera = camera
  }

  /**
   * Moves the camera along Z and sets its near/far planes so WCS Z in
   * `[minZ, maxZ]` is inside the clip volume.
   *
   * The band only grows beyond the default one, so drawings near Z=0 keep
   * full depth precision for draw-order Z stacking. Non-finite bounds fall
   * back to the default band.
   *
   * @param minZ - Lowest WCS Z of the geometry to show.
   * @param maxZ - Highest WCS Z of the geometry to show.
   */
  fitDepthRange(minZ: number, maxZ: number) {
    const half = AcTrCamera.DEFAULT_DEPTH_HALF
    const margin = AcTrCamera.DEPTH_MARGIN
    const low = Number.isFinite(minZ) ? Math.min(minZ - margin, -half) : -half
    const high = Number.isFinite(maxZ) ? Math.max(maxZ + margin, half) : half
    const far = high - low
    const camera = this._camera
    if (camera.position.z === high && camera.far === far) return

    camera.position.z = high
    camera.near = AcTrCamera.NEAR
    camera.far = far
    camera.updateProjectionMatrix()
  }

  get position() {
    return this._camera.position
  }

  get left() {
    return this._camera.left
  }
  set left(value: number) {
    this._camera.left = value
  }

  get right() {
    return this._camera.right
  }
  set right(value: number) {
    this._camera.right = value
  }

  get top() {
    return this._camera.top
  }
  set top(value: number) {
    this._camera.top = value
  }

  get bottom() {
    return this._camera.bottom
  }
  set bottom(value: number) {
    this._camera.bottom = value
  }

  get zoom() {
    return this._camera.zoom
  }
  set zoom(value: number) {
    this._camera.zoom = value
  }

  /**
   * The internal THREE.js camera.
   */
  get internalCamera() {
    return this._camera
  }

  lookAt(vector: THREE.Vector3) {
    this._camera.lookAt(vector)
  }

  setRotationFromEuler(euler: THREE.Euler) {
    this._camera.setRotationFromEuler(euler)
  }

  updateProjectionMatrix() {
    this._camera.updateProjectionMatrix()
  }

  /**
   * Convert point cooridinate from the screen coordinate system to the world coordinate system.
   * The origin of the screen coordinate system is the left-top corner of the browser.
   * @param point Input point to convert
   * @param width Input width of the browser window
   * @param height Input height of the browser window
   * @returns Return point coordinate in the world coordinate system
   */
  screenToWorld(point: AcGePoint2dLike, width: number, height: number) {
    const cwcsPos = new THREE.Vector3(point.x, point.y, 0)
    cwcsPos.x = (point.x / width) * 2 - 1
    cwcsPos.y = -(point.y / height) * 2 + 1
    const wcsPos = cwcsPos.unproject(this._camera)
    return new AcGePoint2d(wcsPos.x, wcsPos.y)
  }
  /**
   * Convert point cooridinate from the world coordinate system to the screen coordinate system.
   * The origin of the screen coordinate system is the left-top corner of the browser.
   * @param point Input point to convert
   * @param width Input width of the browser window
   * @param height Input height of the browser window
   * @returns Return point coordinate in the screen coordinate system
   */
  worldToScreen(point: AcGePoint2dLike, width: number, height: number) {
    const wcsPos = new THREE.Vector3(point.x, point.y, 0)
    const cwcsPos = wcsPos.project(this._camera)
    return new AcGePoint2d(
      ((cwcsPos.x + 1) / 2) * width,
      ((-cwcsPos.y + 1) / 2) * height
    )
  }

  /**
   * Convert point cooridinate from the world coordinate system to the normalized device coordinate.
   * Bottom-left cooridinate in NDC (Normalized screen coordinate) is (-1, -1) and top-right is (1, 1).
   */
  public wcs2Ndc(point: AcGePoint2dLike, width: number, height: number) {
    const cwcsCoord = this.worldToScreen(point, width, height)
    return this.cwcs2Ndc(cwcsCoord, width, height)
  }

  /**
   * Convert point cooridinate from the client window coordinate system to the normalized device coordinate.
   * Bottom-left cooridinate in NDC (Normalized screen coordinate) is (-1, -1) and top-right is (1, 1).
   */
  public cwcs2Ndc(point: AcGePoint2dLike, width: number, height: number) {
    return new AcGePoint2d(
      (point.x / width) * 2 - 1,
      -(point.y / height) * 2 + 1
    )
  }
}
