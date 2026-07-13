import {
  AcGeBox2d,
  AcGePoint2d,
  AcGePoint2dLike,
  AcGiViewport
} from '@mlightcad/data-model'
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
   * Returns `true` when the given viewport represents the **default
   * paper-space viewport** (`*Paper_Space`) — an AutoCAD-internal viewport
   * that exists in every paper-space layout and does not correspond to a
   * user-created viewport.
   *
   * The legacy heuristic was "`number === 1`", but `number` is **not a
   * reliable signal at all** on files parsed by libredwg-web: it reassigns
   * `viewportId` by sorting all VIEWPORT entities on objectId and indexing
   * from 1. This breaks the numeric assumption in **both** directions:
   *
   * - **The default gets `number ≠ 1`** — when the template default's
   *   handle sorts after a real viewport it lands on `2` (or higher). The
   *   old `number === 1` check missed it, so it rendered as a 12×9
   *   (drawing-unit) rectangle that stretched the layout's bounding box,
   *   ruined `zoomToFitDrawing`, and squeezed the real viewports into a
   *   sliver of the canvas.
   * - **A real viewport gets `number === 1`** — when a genuine user
   *   viewport's handle sorts first it receives `number = 1`. The old
   *   shortcut then **false-positived** it and skipped rendering its
   *   content entirely, leaving a large empty area where AutoCAD shows the
   *   viewport's model content (e.g. a large site-plan viewport whose paper
   *   box spans most of the sheet).
   *
   * Because `number` misfires both ways, we rely **solely** on the
   * structural fingerprint: the default viewport "looks at itself" in
   * paper space, so its `centerPoint` (paper WCS) coincides with its
   * `viewCenter` (model DCS). The genuine template default is the
   * `(0,0)-(12,9)` viewport with `centerPoint == viewCenter == (6,4.5)`,
   * while every real viewport pans the model view to a `viewCenter`
   * tens-to-hundreds of units away from its paper `centerPoint`.
   *
   * @param viewport the viewport read from `AcDbViewport.toGiViewport()`
   *                 (or the database entity, which exposes the same
   *                 `centerPoint`/`viewCenter`/`number` properties).
   */
  static isDefaultPaperSpaceViewport(viewport: {
    number: number
    centerPoint: { x: number; y: number }
    viewCenter: { x: number; y: number }
  }): boolean {
    // Tolerance ~1µ in drawing units — generous enough to absorb
    // floating-point round-tripping through the parser, tight enough
    // that no real user viewport (even one panned to (0,0) of model
    // space) collides with the paper rectangle's center by accident.
    const eps = 1e-6
    return (
      Math.abs(viewport.centerPoint.x - viewport.viewCenter.x) < eps &&
      Math.abs(viewport.centerPoint.y - viewport.viewCenter.y) < eps
    )
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
   * Returns true when the given point (in paper-space WCS) lies within the
   * viewport's rectangular border. Used by selection drill-through to
   * decide whether a click should resolve against the model-space content
   * shown through this viewport.
   */
  containsPaperPoint(paperPt: AcGePoint2dLike): boolean {
    const box = this._viewport.box
    return (
      paperPt.x >= box.min.x &&
      paperPt.x <= box.max.x &&
      paperPt.y >= box.min.y &&
      paperPt.y <= box.max.y
    )
  }

  /**
   * Returns true when the given paper-space point is within `tolerance` of
   * the viewport's border (any of the four edges). Used to distinguish the
   * "click on the viewport frame to select it" gesture from the "click
   * inside to drill into model space" gesture. Tolerance is in paper-space
   * WCS units — the caller is responsible for converting from screen
   * pixels (typically via `selectionBoxSize` already in WCS via
   * `pointToBox`).
   */
  isNearPaperBorder(paperPt: AcGePoint2dLike, tolerance: number): boolean {
    if (!this.containsPaperPoint(paperPt)) return false
    const box = this._viewport.box
    const distLeft = Math.abs(paperPt.x - box.min.x)
    const distRight = Math.abs(paperPt.x - box.max.x)
    const distBottom = Math.abs(paperPt.y - box.min.y)
    const distTop = Math.abs(paperPt.y - box.max.y)
    return Math.min(distLeft, distRight, distBottom, distTop) <= tolerance
  }

  /**
   * Transforms a point from paper-space WCS into the model-space DCS that
   * is visible through this viewport. The mapping is the affine transform
   * defined by:
   *   - `viewport.box`     — the rectangle the viewport occupies in paper
   *   - `viewport.viewBox` — the rectangle of model the viewport shows
   *
   * Note this intentionally ignores the viewport's twist angle (rotation
   * within the viewport): AutoCAD viewports may be rotated, but the
   * current renderer does not support that yet, and adding it here would
   * silently disagree with what the user sees on screen. When twist
   * support lands (`AcDbViewport.twistAngle`), update this transform and
   * the corresponding renderer in lockstep.
   */
  paperPointToModel(paperPt: AcGePoint2dLike): AcGePoint2d {
    const paperBox = this._viewport.box
    const modelBox = this._viewport.viewBox
    const paperW = paperBox.max.x - paperBox.min.x
    const paperH = paperBox.max.y - paperBox.min.y
    // Degenerate viewport (collapsed to a line/point) — return the model
    // view center as a safe fallback so callers don't divide by zero.
    if (paperW <= 0 || paperH <= 0) {
      return new AcGePoint2d(
        (modelBox.min.x + modelBox.max.x) / 2,
        (modelBox.min.y + modelBox.max.y) / 2
      )
    }
    const u = (paperPt.x - paperBox.min.x) / paperW
    const v = (paperPt.y - paperBox.min.y) / paperH
    return new AcGePoint2d(
      modelBox.min.x + u * (modelBox.max.x - modelBox.min.x),
      modelBox.min.y + v * (modelBox.max.y - modelBox.min.y)
    )
  }

  /**
   * Returns the paper→model scale factor for this viewport (greater than 1
   * means model is "larger" than what paper shows, i.e. the viewport zooms
   * out). Useful to convert a tolerance/hit-radius expressed in paper-space
   * WCS into the equivalent radius in model-space DCS for spatial-index
   * searches.
   */
  get paperToModelScale(): number {
    const paperBox = this._viewport.box
    const modelBox = this._viewport.viewBox
    const paperW = paperBox.max.x - paperBox.min.x
    if (paperW <= 0) return 1
    return (modelBox.max.x - modelBox.min.x) / paperW
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
