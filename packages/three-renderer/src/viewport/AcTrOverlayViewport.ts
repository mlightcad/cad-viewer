import { AcGeBox2d, AcGeVector2d } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrRenderer } from '../renderer/AcTrRenderer'
import { AcTrCamera } from './AcTrCamera'
import { type AcTrCssRect, acTrCssTopLeftRectToGl } from './AcTrCssRect'

/**
 * Screen-fixed overlay viewport: a CSS-pixel rectangle on the canvas that
 * shows an independent orthographic view of a world-space box.
 *
 * Used for paper-space CAD viewports (after mapping paper WCS → screen) and
 * for transient magnifiers. Unlike {@link AcTrViewportView}, the screen
 * rectangle is not derived from a paper-space entity.
 */
export class AcTrOverlayViewport {
  /** Shared WebGL renderer (same canvas as the main layout view). */
  private readonly _renderer: AcTrRenderer
  /** Orthographic camera fitted to {@link viewBox} inside {@link screenRect}. */
  private readonly _camera: AcTrCamera
  /** When false, {@link render} is a no-op. */
  private _visible = false
  /** On-canvas rectangle in CSS pixels (origin top-left). */
  private _screenRect: AcTrCssRect = { x: 0, y: 0, width: 1, height: 1 }
  /** World-space extents shown in {@link screenRect}. */
  private readonly _viewBox = new AcGeBox2d()
  /** CSS width used when fitting the camera to {@link viewBox}. */
  private _width = 1
  /** CSS height used when fitting the camera to {@link viewBox}. */
  private _height = 1

  /**
   * Creates an overlay viewport that draws into `renderer`'s canvas.
   *
   * @param renderer - Shared WebGL renderer (same canvas as the main view).
   */
  constructor(renderer: AcTrRenderer) {
    this._renderer = renderer
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 1000)
    camera.position.set(0, 0, 500)
    camera.up.set(0, 1, 0)
    camera.updateProjectionMatrix()
    this._camera = new AcTrCamera(camera)
  }

  /**
   * Whether this overlay is drawn during the layout's overlay pass.
   *
   * When false, {@link render} is a no-op.
   */
  get visible() {
    return this._visible
  }
  /**
   * @param value - When false, {@link render} is a no-op.
   */
  set visible(value: boolean) {
    this._visible = value
  }

  /**
   * CSS rectangle of this overlay (origin at the top-left of the canvas).
   */
  get screenRect(): Readonly<AcTrCssRect> {
    return this._screenRect
  }

  /**
   * World-space box shown in {@link screenRect}.
   */
  get viewBox(): AcGeBox2d {
    return this._viewBox
  }

  /**
   * Sets the on-canvas rectangle in CSS pixels (origin top-left).
   *
   * @param x - Left edge in CSS pixels.
   * @param y - Top edge in CSS pixels.
   * @param width - Width in CSS pixels.
   * @param height - Height in CSS pixels.
   */
  setScreenRect(x: number, y: number, width: number, height: number) {
    this._screenRect = { x, y, width, height }
    this._width = Math.max(width, 1)
    this._height = Math.max(height, 1)
    this.applyViewBox()
  }

  /**
   * Sets the world-space extents shown in the screen rectangle.
   *
   * @param box - World box mapped onto {@link screenRect}.
   */
  setViewBox(box: AcGeBox2d) {
    this._viewBox.min.copy(box.min)
    this._viewBox.max.copy(box.max)
    this.applyViewBox()
  }

  /**
   * Renders `scene` into {@link screenRect}, clearing that region first so
   * the overlay replaces the main view's pixels.
   *
   * @param scene - Scene graph to draw (typically the active layout).
   * @param canvasCssHeight - Canvas CSS height used to convert top-left → GL.
   */
  render(scene: THREE.Object3D, canvasCssHeight: number) {
    if (!this._visible || this._viewBox.isEmpty()) return
    if (this._screenRect.width < 1 || this._screenRect.height < 1) return
    this.renderRect(scene, this._screenRect, this._screenRect, canvasCssHeight, {
      clearColor: true
    })
  }

  /**
   * Draws `scene` with a camera fitted to `viewBox` filling `viewportRect`,
   * clipped to `scissorRect`. Does not clear color (for nested paper-space
   * model passes). Restores the overlay's own {@link viewBox} camera afterward.
   *
   * @param scene - Geometry to draw.
   * @param viewBox - World box mapped onto `viewportRect`.
   * @param viewportRect - CSS rectangle the view box fills.
   * @param scissorRect - CSS clip rectangle (usually intersection with loupe).
   * @param canvasCssHeight - Canvas CSS height.
   * @param twist - Optional DVIEW twist in radians (camera up / rotation).
   */
  renderNested(
    scene: THREE.Object3D,
    viewBox: AcGeBox2d,
    viewportRect: AcTrCssRect,
    scissorRect: AcTrCssRect,
    canvasCssHeight: number,
    twist?: number
  ) {
    if (scissorRect.width < 1 || scissorRect.height < 1) return
    this.fitCamera(viewBox, viewportRect.width, viewportRect.height, twist)
    this.renderRect(scene, viewportRect, scissorRect, canvasCssHeight, {
      clearColor: false
    })
    this.applyViewBox()
  }

  /**
   * Refits the overlay camera to the stored {@link viewBox} and screen size.
   */
  private applyViewBox() {
    if (this._viewBox.isEmpty()) return
    this.fitCamera(this._viewBox, this._width, this._height)
  }

  /**
   * Fits the orthographic camera so `box` fills a CSS rectangle of
   * `width` × `height`.
   *
   * @param box - World extents to show.
   * @param width - Target CSS width in pixels.
   * @param height - Target CSS height in pixels.
   * @param twist - Optional DVIEW twist in radians.
   */
  private fitCamera(
    box: AcGeBox2d,
    width: number,
    height: number,
    twist?: number
  ) {
    const size = new AcGeVector2d()
    box.getSize(size)
    const center = new AcGeVector2d()
    box.getCenter(center)

    const frustum = Math.max(height, 1) / 2
    const aspect = Math.max(width, 1) / Math.max(height, 1)
    const fitWidth = Math.max(Math.abs(size.x), Number.EPSILON)
    const fitHeight = Math.max(Math.abs(size.y), Number.EPSILON)
    const zoom = Math.min(
      (2 * aspect * frustum) / fitWidth,
      (2 * frustum) / fitHeight
    )

    const camera = this._camera.internalCamera
    camera.left = -aspect * frustum
    camera.right = aspect * frustum
    camera.top = frustum
    camera.bottom = -frustum
    camera.position.set(center.x, center.y, camera.position.z)
    camera.lookAt(center.x, center.y, 0)
    const angle = Number.isFinite(twist) ? (twist as number) : 0
    camera.up.set(-Math.sin(angle), Math.cos(angle), 0)
    camera.setRotationFromEuler(new THREE.Euler(0, 0, angle))
    camera.zoom = zoom
    camera.updateProjectionMatrix()
  }

  /**
   * Issues one scissor/viewport pass: optionally clear, then draw `scene`.
   *
   * @param scene - Geometry to draw.
   * @param viewportRect - CSS rectangle mapped to the camera frustum.
   * @param scissorRect - CSS clip rectangle.
   * @param canvasCssHeight - Canvas CSS height for GL conversion.
   * @param options.clearColor - When true, clear color+depth in the scissor;
   *   otherwise only depth is cleared.
   */
  private renderRect(
    scene: THREE.Object3D,
    viewportRect: AcTrCssRect,
    scissorRect: AcTrCssRect,
    canvasCssHeight: number,
    options: { clearColor: boolean }
  ) {
    const glViewport = acTrCssTopLeftRectToGl(viewportRect, canvasCssHeight)
    const glScissor = acTrCssTopLeftRectToGl(scissorRect, canvasCssHeight)
    const autoClear = this._renderer.autoClear
    this._renderer.autoClear = false
    const oldViewport = new THREE.Vector4()
    this._renderer.getViewport(oldViewport)

    this._renderer.setScissor(
      glScissor.x,
      glScissor.y,
      glScissor.width,
      glScissor.height
    )
    this._renderer.setScissorTest(true)
    this._renderer.setViewport(
      glViewport.x,
      glViewport.y,
      glViewport.width,
      glViewport.height
    )
    if (options.clearColor) {
      this._renderer.clear()
    } else {
      this._renderer.clearDepth()
    }
    this._renderer.render(scene, this._camera)
    this._renderer.setScissorTest(false)
    this._renderer.setViewport(
      oldViewport.x,
      oldViewport.y,
      oldViewport.z,
      oldViewport.w
    )
    this._renderer.autoClear = autoClear
  }
}
