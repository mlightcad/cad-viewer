import { AcGeBox2d, AcGiViewport } from '@mlightcad/data-model'
import * as THREE from 'three'

import { AcTrRenderer } from '../renderer'
import { AcTrBaseView } from './AcTrBaseView'

/**
 * This class represents view to show viewport.
 */
export class AcTrViewportView extends AcTrBaseView {
  private _parentView: AcTrBaseView
  private _viewport: AcGiViewport

  /**
   * Calcuate the bounding box of this viewport in client window coordinate system
   */
  static calculateViewportWindowBox(
    parentView: AcTrBaseView,
    viewport: AcGiViewport
  ) {
    const wcsViewportBox = viewport.box
    const cwcsViewportBox = new AcGeBox2d()
    cwcsViewportBox.expandByPoint(parentView.worldToScreen(wcsViewportBox.min))
    cwcsViewportBox.expandByPoint(parentView.worldToScreen(wcsViewportBox.max))
    return cwcsViewportBox
  }

  /**
   * Construct one instance of this class.
   * @param parentView Input parent view of this viewport view. The parent view contains this viewport view.
   * @param viewport Input the viewport associated with this viewport view.
   * @param renderer Input renderer to draw this viewport view
   */
  constructor(
    parentView: AcTrBaseView,
    viewport: AcGiViewport,
    renderer: AcTrRenderer
  ) {
    const viewportWindowBox = AcTrViewportView.calculateViewportWindowBox(
      parentView,
      viewport
    )
    const viewportSize = viewportWindowBox.size
    super(renderer, viewportSize.width, viewportSize.height)
    this._parentView = parentView
    this._viewport = viewport.clone()
    this._frustum *= viewport.height / parentView.height
    this.zoomTo(this._viewport.viewBox)
    this.enabled = false
  }

  /**
   * The viewport associated with this viewport view.
   */
  get viewport() {
    return this._viewport
  }

  /**
   * Update camera of this viewport
   */
  update() {
    this.zoomTo(this._viewport.viewBox, 1.0)
  }

  /**
   * Render the specified scene in this viewport view
   * @param scene Input the scene to render
   */
  render(scene: THREE.Object3D) {
    const viewportWindowBox = AcTrViewportView.calculateViewportWindowBox(
      this._parentView,
      this._viewport
    )
    if (!viewportWindowBox.isEmpty()) {
      const vpW = viewportWindowBox.size.width
      const vpH = viewportWindowBox.size.height

      if (vpW !== this._width || vpH !== this._height) {
        this._width = vpW
        this._height = vpH
        this._frustum = vpH / 2
        this.zoomTo(this._viewport.viewBox, 1.0)
      }

      const y = this._parentView.height - viewportWindowBox.min.y - vpH
      this._renderer.setViewport(viewportWindowBox.min.x, y, vpW, vpH)
      this._renderer.internalRenderer.setScissor(
        viewportWindowBox.min.x,
        y,
        vpW,
        vpH
      )
      this._renderer.internalRenderer.setScissorTest(true)
      this._renderer.render(scene, this._camera)
      this._renderer.internalRenderer.setScissorTest(false)
    }
  }
}
