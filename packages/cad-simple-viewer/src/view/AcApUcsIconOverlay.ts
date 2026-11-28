import {
  AcCmColor,
  AcDbDatabase,
  acdbHostApplicationServices,
  AcGePoint2d,
  AcGePoint3d
} from '@mlightcad/data-model'

import { isModelSpaceDatabase } from '../editor/global/AcEdUiColor.js'
import { ML_UI_Z_CANVAS_HTML_OVERLAY } from '../editor/global/AcEdUiLayout.js'
import type { AcEdBaseView } from '../editor/view/AcEdBaseView.js'
import { type AcApUcsFrame, AcApUcsService } from '../service/AcApUcsService.js'
import { acCmColorToCssHex } from '../util/AcApCssColor.js'

/** Default triad colors when Apply Single Color is off. */
const DEFAULT_X_COLOR = '#e53935'
const DEFAULT_Y_COLOR = '#43a047'
const DEFAULT_W_COLOR = '#90caf9'
/**
 * AutoCAD hover/selection tint for a selectable UCS icon (greenish-gold).
 * Recolor — do not use per-stroke SVG filters: axis-aligned `<line>`s have a
 * zero height/width object bbox, so the filter clips the stroke away.
 */
const HIGHLIGHT_COLOR = '#c9c43a'

const STYLE_ID = 'ml-ucs-icon-styles'

export type AcApUcsIconVisualState = 'normal' | 'hover' | 'selected'

/** Screen-space geometry of the displayed UCS icon for hit-testing / grips. */
export interface AcApUcsIconScreenGeometry {
  /** Top-left of the icon element in canvas coordinates. */
  left: number
  top: number
  size: number
  /** Origin of the triad inside the icon (canvas coords). */
  origin: AcGePoint2d
  /** X-axis tip in canvas coords. */
  xTip: AcGePoint2d
  /** Y-axis tip in canvas coords. */
  yTip: AcGePoint2d
}

/**
 * DOM overlay that draws the AutoCAD-style UCS triad (X red / Y green, W for World).
 */
export class AcApUcsIconOverlay {
  private readonly _el: HTMLDivElement
  private readonly _svg: SVGSVGElement
  private readonly _xLine: SVGLineElement
  private readonly _yLine: SVGLineElement
  private readonly _xLabel: SVGTextElement
  private readonly _yLabel: SVGTextElement
  private readonly _wLabel: SVGTextElement
  private _disposed = false
  private _visualState: AcApUcsIconVisualState = 'normal'
  private _geometry: AcApUcsIconScreenGeometry | null = null
  /**
   * Signature of the last state written to the DOM. `update` runs on every
   * animation frame; rewriting identical SVG attributes still invalidates
   * style/layout/paint each frame and kept an idle, empty drawing burning CPU.
   */
  private _lastState: string | null = null

  constructor(private readonly _host: HTMLElement) {
    AcApUcsIconOverlay.ensureStyles()
    const hostPosition = getComputedStyle(this._host).position
    if (hostPosition === 'static') {
      this._host.style.position = 'relative'
    }

    this._el = document.createElement('div')
    this._el.className = 'ml-ucs-icon'
    this._el.style.cssText = [
      'position:absolute',
      'pointer-events:none',
      // Same band as CSS2D capsules — below the floating command line.
      `z-index:${ML_UI_Z_CANVAS_HTML_OVERLAY}`,
      // Axis labels sit past the tip; keep overflow visible.
      'overflow:visible',
      'display:none'
    ].join(';')

    this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    // Hits go to the root div so empty space inside the triad box is selectable.
    this._svg.style.pointerEvents = 'none'
    this._svg.style.overflow = 'visible'
    this._xLine = this.createLine(DEFAULT_X_COLOR)
    this._yLine = this.createLine(DEFAULT_Y_COLOR)
    this._xLabel = this.createLabel('X', DEFAULT_X_COLOR)
    this._yLabel = this.createLabel('Y', DEFAULT_Y_COLOR)
    this._wLabel = this.createLabel('W', DEFAULT_W_COLOR)
    this._wLabel.style.fontWeight = '700'

    this._svg.append(
      this._xLine,
      this._yLine,
      this._xLabel,
      this._yLabel,
      this._wLabel
    )
    this._el.appendChild(this._svg)
    this._host.appendChild(this._el)
  }

  /** Root DOM node of the icon (used for selectable pointer hit-testing). */
  get element(): HTMLDivElement {
    return this._el
  }

  /** Last computed screen geometry, or `null` when the icon is hidden. */
  get geometry(): AcApUcsIconScreenGeometry | null {
    return this._geometry
  }

  get visualState(): AcApUcsIconVisualState {
    return this._visualState
  }

  setVisualState(state: AcApUcsIconVisualState): void {
    if (this._visualState === state) return
    this._visualState = state
    this._el.classList.toggle('ml-ucs-icon--hover', state === 'hover')
    this._el.classList.toggle('ml-ucs-icon--selected', state === 'selected')
    // Recolor immediately so hover does not wait for the next animation frame.
    this.applyStrokeColors(AcApUcsService.getIconAppearance())
    // Force the next `update` to rewrite DOM (visual state is in `_lastState`).
    this._lastState = null
  }

  /**
   * When selectable, the icon root receives pointer events for the whole
   * triad bounding box. The SVG keeps `pointer-events: none` so empty space
   * inside the box does not fall through to the WebGL canvas.
   */
  setPointerEventsEnabled(enabled: boolean): void {
    this._el.style.pointerEvents = enabled ? 'auto' : 'none'
    this._el.style.cursor = enabled ? 'pointer' : ''
    this._svg.style.pointerEvents = 'none'
  }

  /**
   * Hit-test the displayed icon in canvas coordinates.
   * Uses the icon bounding box (selection / clickable area).
   */
  hitTest(canvasX: number, canvasY: number, thresholdPx = 6): boolean {
    const g = this._geometry
    if (!g) return false
    return (
      canvasX >= g.left - thresholdPx &&
      canvasX <= g.left + g.size + thresholdPx &&
      canvasY >= g.top - thresholdPx &&
      canvasY <= g.top + g.size + thresholdPx
    )
  }

  /**
   * Hit-test near the X or Y axis strokes (not the whole triad box).
   * Used for hover highlighting so empty space inside the container does not
   * light up the icon.
   */
  hitTestAxes(canvasX: number, canvasY: number, thresholdPx = 8): boolean {
    const g = this._geometry
    if (!g) return false
    return (
      distanceToSegment(canvasX, canvasY, g.origin, g.xTip) <= thresholdPx ||
      distanceToSegment(canvasX, canvasY, g.origin, g.yTip) <= thresholdPx
    )
  }

  update(view: AcEdBaseView): void {
    if (this._disposed) return
    const database = this.resolveViewDatabase(view)
    const icon = AcApUcsService.getIconSettings(database)
    if (!icon.on) {
      this.hide()
      return
    }

    // Without an active layout camera, worldToScreen is only an orientation
    // fallback — hide rather than flash a misplaced icon during open.
    if (!this.hasLayoutCamera(view)) {
      this.hide()
      return
    }

    const appearance = AcApUcsService.getIconAppearance()
    // `size` is the AutoCAD icon extent (axis length in CSS px). The SVG box is
    // larger and origin-centered so any screen-axis orientation keeps tips and
    // X/Y/W labels inside the element.
    const size = this.resolveIconSize(view, appearance.sizePercent)
    const axisLen = size
    const labelReach = axisLen + size * 0.22
    const wReach = size * 0.3
    const halfExtent = Math.ceil(
      Math.max(labelReach, wReach) + appearance.lineWidth + 2
    )
    const box = halfExtent * 2
    const ox = halfExtent
    const oy = halfExtent
    const strokeWidth = String(appearance.lineWidth)
    const colors = this.resolveDisplayColors(appearance, database)

    const frame = AcApUcsService.getDisplayFrame(database)
    const isWorld = AcApUcsService.isWorldFrame(frame)

    const originScreen = this.resolveScreenPosition(view, frame, icon.atOrigin)
    if (
      !originScreen ||
      !Number.isFinite(originScreen.x) ||
      !Number.isFinite(originScreen.y)
    ) {
      this.hide()
      return
    }

    const { x: xDir, y: yDir } = this.screenAxisDirections(view, frame)
    let left = originScreen.x - ox
    let top = originScreen.y - oy
    if (!Number.isFinite(left) || !Number.isFinite(top)) {
      left = 16 - ox
      top = Math.max(16, view.height - 16) - oy
    }

    const xTip = {
      x: ox + xDir.x * axisLen,
      y: oy + xDir.y * axisLen
    }
    const yTip = {
      x: ox + yDir.x * axisLen,
      y: oy + yDir.y * axisLen
    }

    // Geometry is canvas-local (matches trySelect / worldToScreen). Keep it
    // fresh every frame so grips/hit-tests never see a stale null after an
    // early DOM return. `size` here is the hit/box side (not the visual scale).
    this._geometry = {
      left,
      top,
      size: box,
      origin: new AcGePoint2d(left + ox, top + oy),
      xTip: new AcGePoint2d(left + xTip.x, top + xTip.y),
      yTip: new AcGePoint2d(left + yTip.x, top + yTip.y)
    }

    const state = [
      isWorld ? 1 : 0,
      appearance.applySingleColor ? 1 : 0,
      appearance.sizePercent,
      appearance.lineWidth,
      colors.x,
      colors.y,
      colors.w,
      xDir.x,
      xDir.y,
      yDir.x,
      yDir.y,
      left,
      top,
      box,
      this._visualState
    ]
      .map(v => (typeof v === 'number' ? v.toFixed(2) : String(v)))
      .join(',')
    if (state === this._lastState) return
    this._lastState = state

    this._svg.setAttribute('width', String(box))
    this._svg.setAttribute('height', String(box))
    this._svg.setAttribute('viewBox', `0 0 ${box} ${box}`)
    this._el.style.width = `${box}px`
    this._el.style.height = `${box}px`

    this._wLabel.style.display = isWorld ? '' : 'none'
    this._wLabel.style.fontSize = `${Math.max(9, size * 0.2)}px`
    this._xLabel.style.fontSize = `${Math.max(10, size * 0.22)}px`
    this._yLabel.style.fontSize = `${Math.max(10, size * 0.22)}px`

    this.applyStroke(this._xLine, colors.x, strokeWidth)
    this.applyStroke(this._yLine, colors.y, strokeWidth)
    this._xLabel.setAttribute('fill', colors.x)
    this._yLabel.setAttribute('fill', colors.y)
    this._wLabel.setAttribute('fill', colors.w)

    this.setLine(this._xLine, ox, oy, xTip.x, xTip.y)
    this.setLine(this._yLine, ox, oy, yTip.x, yTip.y)
    this.setLabel(
      this._xLabel,
      ox + xDir.x * (axisLen + size * 0.11),
      oy + xDir.y * (axisLen + size * 0.11)
    )
    this.setLabel(
      this._yLabel,
      ox + yDir.x * (axisLen + size * 0.11),
      oy + yDir.y * (axisLen + size * 0.11)
    )
    this.setLabel(this._wLabel, ox - size * 0.04, oy + size * 0.22)

    // DOM node is parented to the view container (may be offset from canvas).
    const containerOrigin = view.canvasToContainer({ x: left, y: top })
    this._el.style.display = 'block'
    this._el.style.left = `${containerOrigin.x}px`
    this._el.style.top = `${containerOrigin.y}px`
  }

  private hide() {
    if (this._lastState === 'hidden') return
    this._lastState = 'hidden'
    this._el.style.display = 'none'
    this._geometry = null
  }

  dispose(): void {
    this._disposed = true
    this._geometry = null
    this._el.remove()
  }

  /**
   * Maps AutoCAD’s size control (5–95, default 50) to axis length in CSS px.
   *
   * Autodesk documents the control as a “percentage of viewport size”, but a
   * literal `edge * percent / 100` (50% of the viewport) is far larger than the
   * on-screen triad. Empirically AutoCAD’s default 50 draws axes at about
   * **5% of the shorter viewport edge** (`edge * sizePercent / 1000`) —
   * ≈50 px on a 1000 px view. That value is the axis length itself (not half).
   */
  private resolveIconSize(view: AcEdBaseView, sizePercent: number): number {
    const edge = Math.max(24, Math.min(view.width, view.height))
    const px = Math.round((edge * sizePercent) / 1000)
    return Math.max(20, Math.min(160, px))
  }

  private resolveColors(
    appearance: ReturnType<typeof AcApUcsService.getIconAppearance>,
    database?: AcDbDatabase
  ): {
    x: string
    y: string
    w: string
  } {
    if (!appearance.applySingleColor) {
      return { x: DEFAULT_X_COLOR, y: DEFAULT_Y_COLOR, w: DEFAULT_W_COLOR }
    }
    // View construction can run before DocManager sets workingDatabase; the
    // host getter throws when unset — never read it unguarded here.
    const db = database ?? tryWorkingDatabase()
    const isModel = db ? isModelSpaceDatabase(db) : true
    const index = isModel
      ? appearance.modelColorIndex
      : appearance.layoutColorIndex
    const color = new AcCmColor()
    color.colorIndex = index
    const hex = acCmColorToCssHex(color)
    return { x: hex, y: hex, w: hex }
  }

  /**
   * Colors actually painted for the current visual state.
   * Hover/selected use AutoCAD’s greenish-gold highlight on every axis/label.
   */
  private resolveDisplayColors(
    appearance: ReturnType<typeof AcApUcsService.getIconAppearance>,
    database?: AcDbDatabase
  ): { x: string; y: string; w: string } {
    if (this._visualState === 'hover' || this._visualState === 'selected') {
      return {
        x: HIGHLIGHT_COLOR,
        y: HIGHLIGHT_COLOR,
        w: HIGHLIGHT_COLOR
      }
    }
    return this.resolveColors(appearance, database)
  }

  /** Apply stroke/fill for the current visual state without repositioning. */
  private applyStrokeColors(
    appearance: ReturnType<typeof AcApUcsService.getIconAppearance>
  ): void {
    const colors = this.resolveDisplayColors(appearance)
    const strokeWidth = String(appearance.lineWidth)
    this.applyStroke(this._xLine, colors.x, strokeWidth)
    this.applyStroke(this._yLine, colors.y, strokeWidth)
    this._xLabel.setAttribute('fill', colors.x)
    this._yLabel.setAttribute('fill', colors.y)
    this._wLabel.setAttribute('fill', colors.w)
  }

  private hasLayoutCamera(view: AcEdBaseView): boolean {
    return (
      'activeLayoutView' in view &&
      (view as { activeLayoutView?: unknown }).activeLayoutView != null
    )
  }

  private resolveScreenPosition(
    view: AcEdBaseView,
    frame: AcApUcsFrame,
    atOrigin: boolean
  ): AcGePoint2d | null {
    const corner = () => new AcGePoint2d(16, Math.max(16, view.height - 16))
    if (!atOrigin) return corner()

    const screen = view.worldToScreen(
      new AcGePoint2d(frame.origin.x, frame.origin.y)
    )
    const margin = 8
    if (
      !Number.isFinite(screen.x) ||
      !Number.isFinite(screen.y) ||
      screen.x < margin ||
      screen.y < margin ||
      screen.x > view.width - margin ||
      screen.y > view.height - margin
    ) {
      // Origin not visible — fall back to lower-left like AutoCAD.
      return corner()
    }
    return screen
  }

  /**
   * Screen-space X/Y directions for the triad.
   *
   * Samples a view-scale length in WCS (not a unit vector) so large drawings
   * do not collapse both axes into floating-point noise. If the projected
   * axes are nearly parallel, rebuilds Y as screen-perpendicular to X.
   */
  private screenAxisDirections(
    view: AcEdBaseView,
    frame: AcApUcsFrame
  ): { x: { x: number; y: number }; y: { x: number; y: number } } {
    const sample = this.axisSampleLengthWcs(view)
    const xDir = this.rawScreenAxisDirection(view, frame, 'x', sample)
    let yDir = this.rawScreenAxisDirection(view, frame, 'y', sample)
    const cross = xDir.x * yDir.y - xDir.y * yDir.x
    if (Math.abs(cross) < 0.2) {
      // Screen Y grows downward; right-handed WCS (+Z toward viewer) maps
      // WCS +Y to screen up, i.e. perpendicular (xDir.y, -xDir.x).
      yDir = { x: xDir.y, y: -xDir.x }
    }
    return { x: xDir, y: yDir }
  }

  /** WCS length that projects to roughly 50 CSS pixels in the current view. */
  private axisSampleLengthWcs(view: AcEdBaseView): number {
    const midY = view.height * 0.5
    const a = view.screenToWorld({ x: 0, y: midY })
    const b = view.screenToWorld({ x: 100, y: midY })
    const wcsPerPx = Math.hypot(b.x - a.x, b.y - a.y) / 100
    if (!Number.isFinite(wcsPerPx) || wcsPerPx <= 0) return 1
    return Math.max(wcsPerPx * 50, 1e-6)
  }

  private rawScreenAxisDirection(
    view: AcEdBaseView,
    frame: AcApUcsFrame,
    axis: 'x' | 'y',
    sampleLen: number
  ): { x: number; y: number } {
    const origin = frame.origin
    const dir = axis === 'x' ? frame.xAxis : frame.yAxis
    const tip = new AcGePoint3d(
      origin.x + dir.x * sampleLen,
      origin.y + dir.y * sampleLen,
      (origin.z ?? 0) + (dir.z ?? 0) * sampleLen
    )
    const o = view.worldToScreen(new AcGePoint2d(origin.x, origin.y))
    const t = view.worldToScreen(new AcGePoint2d(tip.x, tip.y))
    const dx = t.x - o.x
    const dy = t.y - o.y
    const len = Math.hypot(dx, dy)
    if (!Number.isFinite(len) || len < 1e-6) {
      return axis === 'x' ? { x: 1, y: 0 } : { x: 0, y: -1 }
    }
    return { x: dx / len, y: dy / len }
  }

  private createLine(color: string): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('stroke', color)
    line.setAttribute('stroke-width', '2')
    line.setAttribute('stroke-linecap', 'round')
    return line
  }

  private createLabel(text: string, color: string): SVGTextElement {
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.textContent = text
    label.setAttribute('fill', color)
    label.setAttribute('font-size', '12')
    label.setAttribute('font-family', 'sans-serif')
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('dominant-baseline', 'middle')
    return label
  }

  private applyStroke(
    line: SVGLineElement,
    color: string,
    strokeWidth: string
  ) {
    line.setAttribute('stroke', color)
    line.setAttribute('stroke-width', strokeWidth)
  }

  private setLine(
    line: SVGLineElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
  }

  private setLabel(label: SVGTextElement, x: number, y: number) {
    label.setAttribute('x', String(x))
    label.setAttribute('y', String(y))
  }

  /**
   * Database bound to this canvas when the view exposes a renderer context;
   * otherwise the host working database (may be unset during early open).
   */
  private resolveViewDatabase(view: AcEdBaseView): AcDbDatabase | undefined {
    const viewWithRenderer = view as AcEdBaseView & {
      renderer?: { context?: { database?: AcDbDatabase } }
    }
    return (
      viewWithRenderer.renderer?.context?.database ??
      tryWorkingDatabase() ??
      undefined
    )
  }

  private static ensureStyles() {
    // Hover/selected use AutoCAD greenish-gold recolor (see HIGHLIGHT_COLOR),
    // not CSS/SVG filters — filters on axis-aligned strokes clip to a zero
    // bbox. Marker stylesheet kept for idempotency / class hooks.
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = ''
    document.head.appendChild(style)
  }
}

/** Returns the working database, or null when none is set (getter throws). */
function tryWorkingDatabase(): AcDbDatabase | null {
  try {
    return acdbHostApplicationServices().workingDatabase
  } catch {
    return null
  }
}

/** Distance from a point to a finite line segment in 2D canvas space. */
function distanceToSegment(
  px: number,
  py: number,
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-12) {
    return Math.hypot(px - a.x, py - a.y)
  }
  const t = Math.max(
    0,
    Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lenSq)
  )
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy))
}
