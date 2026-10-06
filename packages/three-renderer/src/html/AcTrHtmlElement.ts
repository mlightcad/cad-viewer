import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

/** Default layer name when none is specified */
export const AC_TR_HTML_DEFAULT_LAYER = 'default'

/** CSS class toggled when an HTML transient is selected. */
export const AC_TR_HTML_SELECTED_CLASS = 'ml-html-selected'

/**
 * Shared construction options for HTML overlay elements.
 */
export interface AcTrHtmlElementOptions {
  /** Unique identifier for this element */
  id: string
  /** Anchor position in world coordinates */
  worldPosition: { x: number; y: number; z?: number }
  /** Optional layer name for grouping (default: 'default') */
  layer?: string
  /**
   * Optional layout block-table-record id this overlay belongs to.
   * When the manager's active layout changes, overlays whose `layoutId`
   * does not match are hidden (and matching ones are shown).
   * Omit for overlays that should remain visible on every layout.
   */
  layoutId?: string
  /**
   * When `true`, the DOM element scales with orthographic camera zoom
   * (relative to first paint). When `false`, screen size stays constant.
   * {@link AcTrHtmlBadge}, {@link AcTrHtmlCallout}, {@link AcTrHtmlDot},
   * {@link AcTrHtmlGrip}, and {@link AcTrHtmlStamp} default to `true`; other
   * overlay types default to `false`.
   */
  scaleWithView?: boolean
  /**
   * When `true`, the DOM element receives pointer events.
   * Prefer putting selectable children inside an {@link AcTrHtmlGroup}.
   * Defaults to `false`.
   */
  selectable?: boolean
}

/**
 * HTML overlay anchored to world coordinates via {@link CSS2DObject}.
 *
 * Can wrap an existing DOM node directly, or be subclassed
 * (e.g. {@link AcTrHtmlDot}, {@link AcTrHtmlBadge}) to build styled elements.
 * The manager owns lifecycle, layering, and view-synced transform hooks.
 */
export class AcTrHtmlElement {
  readonly id: string
  readonly object: CSS2DObject
  readonly layer: string
  readonly layoutId?: string
  /**
   * When `true`, the DOM element scales with orthographic camera zoom
   * (relative to first paint). When `false`, screen size stays constant.
   */
  scaleWithView: boolean
  /**
   * Orthographic camera zoom captured on the first CSS2D render of this entry.
   * Used only when {@link scaleWithView} is `true`.
   */
  baseZoom?: number

  private _selected = false

  constructor(element: HTMLElement, options: AcTrHtmlElementOptions) {
    this.id = options.id
    this.layer = options.layer ?? AC_TR_HTML_DEFAULT_LAYER
    this.layoutId = options.layoutId
    this.scaleWithView = options.scaleWithView === true

    this.object = new CSS2DObject(element)
    this.object.position.set(
      options.worldPosition.x,
      options.worldPosition.y,
      options.worldPosition.z ?? 0
    )
    this.object.updateMatrix()

    if (options.selectable) {
      element.style.pointerEvents = 'auto'
      element.style.cursor = 'pointer'
    }
  }

  /** The root HTML element wrapped by the CSS2DObject. */
  get element(): HTMLElement {
    return this.object.element
  }

  /** Whether this overlay is currently drawn as selected. */
  get selected(): boolean {
    return this._selected
  }

  /**
   * Toggle the selected visual state.
   */
  setSelected(selected: boolean): void {
    this._selected = selected
    this.element.classList.toggle(AC_TR_HTML_SELECTED_CLASS, selected)
  }

  /**
   * Update the world-space anchor position.
   *
   * Preserves {@link baseZoom} so WCS-sized overlays (live draw previews and
   * committed capsules) keep their world height while moving. Callers that
   * intentionally re-anchor view scale should clear {@link baseZoom} themselves.
   */
  setPosition(worldPosition: { x: number; y: number; z?: number }): void {
    this.object.position.set(
      worldPosition.x,
      worldPosition.y,
      worldPosition.z ?? 0
    )
    this.object.matrixAutoUpdate = true
    this.object.updateMatrix()
    this.object.updateMatrixWorld(true)
  }

  /**
   * Detach DOM and clear the CSS2D after-render hook.
   * The manager is responsible for removing the object from the scene graph.
   */
  dispose(): void {
    this.object.onAfterRender = () => {}
    this.element.remove()
  }
}
