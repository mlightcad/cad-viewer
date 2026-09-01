import {
  AC_TR_HTML_DEFAULT_LAYER,
  AC_TR_HTML_SELECTED_CLASS
} from './AcTrHtmlElement'

/** CSS class applied to viewport-aligned HTML canvas overlays. */
export const AC_TR_HTML_CANVAS_CLASS = 'ml-html-canvas'

/**
 * Options for an {@link AcTrHtmlCanvasOverlay}.
 */
export interface AcTrHtmlCanvasOverlayOptions {
  /** Unique identifier for this overlay */
  id: string
  /** Parent DOM node that hosts the canvas (typically the view container). */
  container: HTMLElement
  /** Optional layer name for grouping (default: 'default') */
  layer?: string
  /**
   * Optional layout block-table-record id this overlay belongs to.
   * When the manager's active layout changes, overlays whose `layoutId`
   * does not match are hidden (and matching ones are shown).
   * Omit for overlays that should remain visible on every layout.
   */
  layoutId?: string
}

/**
 * Full-viewport HTML canvas overlay for screen-space drawings
 * (arcs, fills, etc.).
 *
 * Unlike {@link AcTrHtmlElement}, this is **not** CSS2D-anchored: callers
 * size/position the canvas and paint with `worldToScreen` coordinates, usually
 * redrawing on view changes. Lifecycle, layer, layout visibility, and
 * selection styling are shared with other HTML overlays.
 */
export class AcTrHtmlCanvasOverlay {
  readonly id: string
  readonly layer: string
  readonly layoutId?: string
  readonly canvas: HTMLCanvasElement

  private _selected = false
  private _visible = true

  constructor(options: AcTrHtmlCanvasOverlayOptions) {
    this.id = options.id
    this.layer = options.layer ?? AC_TR_HTML_DEFAULT_LAYER
    this.layoutId = options.layoutId

    const el = document.createElement('canvas')
    el.className = AC_TR_HTML_CANVAS_CLASS
    // Below CSS2D capsules (viewer sets CSS2D to ML_UI_Z_CANVAS_HTML_OVERLAY).
    el.style.cssText = 'position:absolute;pointer-events:none;z-index:1;'
    options.container.appendChild(el)
    this.canvas = el
  }

  /** Alias for {@link canvas} so callers can treat overlays uniformly. */
  get element(): HTMLCanvasElement {
    return this.canvas
  }

  /** Whether this overlay is currently drawn as selected. */
  get selected(): boolean {
    return this._selected
  }

  /** Whether this overlay is currently visible. */
  get visible(): boolean {
    return this._visible
  }

  /**
   * Toggle the selected visual state (CSS class on the canvas).
   */
  setSelected(selected: boolean): void {
    if (this._selected === selected) return
    this._selected = selected
    this.canvas.classList.toggle(AC_TR_HTML_SELECTED_CLASS, selected)
  }

  /**
   * Show or hide the canvas via CSS `display`.
   */
  setVisible(visible: boolean): void {
    if (this._visible === visible) return
    this._visible = visible
    this.canvas.style.display = visible ? '' : 'none'
  }

  /**
   * Detach and discard the canvas element.
   */
  dispose(): void {
    this.canvas.remove()
  }
}
