import * as THREE from 'three'

import {
  AC_TR_HTML_CANVAS_CLASS,
  AcTrHtmlCanvasOverlay
} from './AcTrHtmlCanvasOverlay'
import { AC_TR_HTML_SELECTED_CLASS, AcTrHtmlElement } from './AcTrHtmlElement'
import { AcTrHtmlGroup } from './AcTrHtmlGroup'

/** Scratch vector reused when decomposing CSS2D object matrices. */
const _position = /*@__PURE__*/ new THREE.Vector3()
/** Scratch quaternion reused when decomposing CSS2D object matrices. */
const _quaternion = /*@__PURE__*/ new THREE.Quaternion()
/** Scratch scale vector reused when decomposing CSS2D object matrices. */
const _scale = /*@__PURE__*/ new THREE.Vector3()

/** Whether the shared HTML-selection stylesheet has been injected into `document.head`. */
let selectionStylesInstalled = false

/**
 * Injects the CSS used to highlight selected HTML overlays.
 *
 * Selection is a fluorescent glow only: stroke / fill / text colors stay
 * as drawn. Mirrors cad-html-plugin `AcExHtmlShell` markup/measure rules.
 *
 * No-op after the first call, and when `document` is unavailable (SSR / workers).
 */
function ensureSelectionStyles(): void {
  if (selectionStylesInstalled || typeof document === 'undefined') return
  selectionStylesInstalled = true
  const style = document.createElement('style')
  style.dataset.mlHtmlSelection = '1'
  style.textContent = `
.ml-html-dot.${AC_TR_HTML_SELECTED_CLASS} {
  box-shadow:
    0 0 0 2px rgba(255, 213, 79, 0.75),
    0 0 10px rgba(255, 213, 79, 0.95),
    0 0 18px rgba(255, 213, 79, 0.55);
}
.ml-html-badge.${AC_TR_HTML_SELECTED_CLASS},
.ml-html-callout.${AC_TR_HTML_SELECTED_CLASS},
.ml-html-stamp.${AC_TR_HTML_SELECTED_CLASS} .ml-html-stamp-badge,
.ml-html-stamp.${AC_TR_HTML_SELECTED_CLASS} img {
  outline: 2px solid rgba(255, 213, 79, 0.85);
  outline-offset: 1px;
  box-shadow:
    0 0 0 2px rgba(255, 213, 79, 0.4),
    0 0 12px rgba(255, 213, 79, 0.75),
    var(--ml-ui-shadow, 0 1px 4px rgba(0, 0, 0, 0.2));
}
.${AC_TR_HTML_CANVAS_CLASS}.${AC_TR_HTML_SELECTED_CLASS} {
  filter:
    drop-shadow(0 0 1.5px #ffd54f)
    drop-shadow(0 0 4px rgba(255, 213, 79, 0.95))
    drop-shadow(0 0 8px rgba(255, 213, 79, 0.55));
}
`
  document.head.appendChild(style)
}

/**
 * Manages transient HTML overlays anchored to world coordinates.
 *
 * Similar to {@link AcTrTransientManager} but for HTML overlays instead of
 * Three.js geometry. Uses Three.js CSS2DObject so positioning is handled
 * automatically by CSS2DRenderer — no manual viewChanged listeners needed.
 *
 * Accepts leaf {@link AcTrHtmlElement}s, {@link AcTrHtmlGroup}s, and
 * standalone {@link AcTrHtmlCanvasOverlay}s. Groups publish their CSS2D
 * children and optionally participate in click selection; group-owned
 * canvases follow the group's visibility / selection / dispose.
 *
 * Supports grouping by **layer** so callers can show/hide or clear specific
 * categories of overlays (e.g. measurements, annotations).
 */
export class AcTrHtmlTransientManager {
  /** Scene that owns the HTML overlay container. */
  private readonly scene: THREE.Scene
  /** Scene-graph group that holds every published CSS2D overlay. */
  private readonly htmlGroup: THREE.Group

  /** Mapping from leaf element ID to element. */
  private readonly entries: Map<string, AcTrHtmlElement>
  /** Mapping from group ID to group. */
  private readonly groups: Map<string, AcTrHtmlGroup>
  /** Mapping from standalone canvas overlay ID to overlay. */
  private readonly canvases: Map<string, AcTrHtmlCanvasOverlay>
  /** Leaf ids that belong to a group (visibility driven by the group). */
  private readonly groupChildIds = new Set<string>()
  /** Currently selected group ids. */
  private readonly selectedGroupIds = new Set<string>()
  /** Active layout BTR id used to filter layout-scoped overlays. */
  private _activeLayoutId?: string
  /**
   * When false, overlay HTML children do not receive pointer hits so CAD
   * command / OSNAP clicks pass through to the canvas.
   */
  private _hitTestEnabled = true
  /** World matrix captured when each leaf transient was published. */
  private readonly _baselineMatrices = new Map<string, THREE.Matrix4>()
  /** Scratch matrix used to compose world transforms in {@link applyTransforms}. */
  private readonly _composedMatrix = new THREE.Matrix4()

  /**
   * Creates the HTML overlay group and attaches it to the scene.
   *
   * @param scene - Scene that owns the HTML overlay container
   */
  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.htmlGroup = new THREE.Group()
    this.htmlGroup.name = 'Html_Transient_Group'
    this.scene.add(this.htmlGroup)

    this.entries = new Map()
    this.groups = new Map()
    this.canvases = new Map()
  }

  /** Layout BTR id currently used for overlay visibility filtering. */
  get activeLayoutId(): string | undefined {
    return this._activeLayoutId
  }

  /**
   * Set the active layout and update visibility of layout-scoped overlays.
   *
   * Overlays / groups with a matching {@link AcTrHtmlElement.layoutId} (or
   * no `layoutId`) stay visible; others are hidden. Selection on groups that
   * become hidden is cleared.
   *
   * @param layoutId - Layout block-table-record id to filter overlays against
   */
  setActiveLayoutId(layoutId: string): void {
    if (this._activeLayoutId === layoutId) return
    this._activeLayoutId = layoutId
    this.applyLayoutVisibility()
  }

  /**
   * Add a leaf HTML overlay, a group, or a standalone canvas overlay.
   *
   * If an item with the same id already exists, it is replaced.
   *
   * @param item - Overlay, group, or canvas to publish
   */
  add(item: AcTrHtmlElement | AcTrHtmlGroup | AcTrHtmlCanvasOverlay): void {
    if (item instanceof AcTrHtmlGroup) {
      this.addGroup(item)
    } else if (item instanceof AcTrHtmlCanvasOverlay) {
      this.addCanvas(item)
    } else {
      this.addElement(item)
    }
  }

  /**
   * Update the world position of an existing leaf element.
   *
   * @param id - Leaf element id
   * @param worldPosition - New world-space anchor; `z` defaults to `0`
   */
  updatePosition(
    id: string,
    worldPosition: { x: number; y: number; z?: number }
  ): void {
    const entry = this.entries.get(id)
    if (!entry) return

    entry.setPosition(worldPosition)
    this._baselineMatrices.set(id, entry.object.matrix.clone())
  }

  /**
   * Enable or disable view-synced scaling for an existing leaf element.
   *
   * @param id - Leaf element id
   * @param scaleWithView - When `true`, the DOM node scales with orthographic zoom
   */
  setScaleWithView(id: string, scaleWithView: boolean): void {
    const entry = this.entries.get(id)
    if (!entry) return
    entry.scaleWithView = scaleWithView
    entry.baseZoom = undefined
  }

  /**
   * Applies world transforms to existing leaf HTML transients without
   * recreating DOM.
   *
   * @param transforms - Per-leaf world matrices composed onto each published baseline
   * @returns `true` when at least one overlay matrix changed
   */
  applyTransforms(
    transforms: ReadonlyArray<{ id: string; matrix: THREE.Matrix4 }>
  ): boolean {
    let updated = false
    for (const { id, matrix } of transforms) {
      const entry = this.entries.get(id)
      if (!entry) {
        continue
      }
      const baseline = this._baselineMatrices.get(id)
      const composed = this._composedMatrix.copy(matrix)
      if (baseline) {
        composed.multiply(baseline)
      }
      if (entry.object.matrix.equals(composed)) {
        continue
      }
      entry.object.matrix.copy(composed)
      entry.object.matrixAutoUpdate = false
      entry.object.updateMatrixWorld(true)
      updated = true
    }
    return updated
  }

  /**
   * Remove a leaf HTML overlay, a group, or a standalone canvas overlay.
   *
   * Groups are disposed. Use {@link detach} to take a group off the scene
   * without destroying it (undo / redo).
   *
   * @param id - Leaf, group, or canvas id
   */
  remove(id: string): void {
    const group = this.groups.get(id)
    if (group) {
      this.removeGroup(group)
      return
    }
    if (this.canvases.has(id)) {
      this.removeCanvas(id)
      return
    }
    this.removeElement(id)
  }

  /**
   * Take a group off the scene without disposing it or its children.
   * CAD / canvas extras stay on the group and are hidden via `setVisible(false)`.
   *
   * @param id - Group id
   * @returns The detached group, or `undefined` when `id` is not a group
   */
  detach(id: string): AcTrHtmlGroup | undefined {
    const group = this.groups.get(id)
    if (!group) return undefined
    this.detachGroup(group)
    return group
  }

  /**
   * Detach every group on `layer` without disposing them.
   * Loose leaf elements / canvases on that layer are not touched.
   *
   * @param layer - Layer name whose groups should be unpublished
   * @returns Groups that were detached
   */
  detachLayer(layer: string): AcTrHtmlGroup[] {
    const detached: AcTrHtmlGroup[] = []
    for (const group of [...this.groups.values()]) {
      if (group.layer !== layer) continue
      this.detachGroup(group)
      detached.push(group)
    }
    return detached
  }

  /**
   * Publish a previously {@link detach}ed group back onto the scene.
   *
   * @param group - Group previously returned by {@link detach} or {@link detachLayer}
   */
  reattach(group: AcTrHtmlGroup): void {
    this.add(group)
    if (!group.visible) {
      const visible =
        group.layoutId == null ||
        this._activeLayoutId == null ||
        group.layoutId === this._activeLayoutId
      group.setVisible(visible)
    }
  }

  /**
   * Groups currently marked selected.
   *
   * @returns Selected groups that are still published
   */
  getSelectedGroups(): AcTrHtmlGroup[] {
    const groups: AcTrHtmlGroup[] = []
    for (const id of this.selectedGroupIds) {
      const group = this.groups.get(id)
      if (group) groups.push(group)
    }
    return groups
  }

  /**
   * Groups currently published on `layer`.
   *
   * @param layer - Layer name to match
   * @returns Published groups whose {@link AcTrHtmlGroup.layer} equals `layer`
   */
  groupsOnLayer(layer: string): AcTrHtmlGroup[] {
    const groups: AcTrHtmlGroup[] = []
    for (const group of this.groups.values()) {
      if (group.layer === layer) groups.push(group)
    }
    return groups
  }

  /**
   * Clear all items, or only items on a specific layer.
   *
   * Groups on the layer are removed first (with their children / canvases);
   * remaining loose leaf elements and standalone canvases are removed
   * afterwards.
   *
   * @param layer - When set, only items on this layer are removed
   */
  clear(layer?: string): void {
    for (const [id, group] of [...this.groups]) {
      if (layer == null || group.layer === layer) {
        this.remove(id)
      }
    }
    if (layer == null) {
      for (const id of [...this.entries.keys()]) {
        this.removeElement(id)
      }
      for (const id of [...this.canvases.keys()]) {
        this.removeCanvas(id)
      }
    } else {
      for (const [id, entry] of this.entries) {
        if (entry.layer === layer) {
          this.removeElement(id)
        }
      }
      for (const [id, canvas] of this.canvases) {
        if (canvas.layer === layer) {
          this.removeCanvas(id)
        }
      }
    }
  }

  /**
   * Check whether a leaf element, canvas overlay, or group exists.
   *
   * @param id - Leaf, group, or canvas id
   * @returns `true` when the id is currently published
   */
  has(id: string): boolean {
    return (
      this.entries.has(id) || this.groups.has(id) || this.canvases.has(id)
    )
  }

  /**
   * Retrieve a leaf element by ID.
   *
   * @param id - Leaf element id
   * @returns The published leaf, or `undefined` if it is not registered
   */
  get(id: string): AcTrHtmlElement | undefined {
    return this.entries.get(id)
  }

  /**
   * Retrieve a group by ID.
   *
   * @param id - Group id
   * @returns The published group, or `undefined` if it is not registered
   */
  getGroup(id: string): AcTrHtmlGroup | undefined {
    return this.groups.get(id)
  }

  /**
   * Retrieve a standalone canvas overlay by ID.
   *
   * @param id - Canvas overlay id
   * @returns The published canvas, or `undefined` if it is not registered
   */
  getCanvas(id: string): AcTrHtmlCanvasOverlay | undefined {
    return this.canvases.get(id)
  }

  /**
   * Retrieve the DOM node for a leaf element.
   *
   * @param id - Leaf element id
   * @returns The wrapped HTML element, or `undefined` if the leaf is not registered
   */
  getElement(id: string): HTMLElement | undefined {
    return this.entries.get(id)?.element
  }

  /**
   * Show or hide all items, or only items on a specific layer.
   *
   * Group children are skipped when iterating leaves; their visibility is
   * driven by the owning group.
   *
   * @param visible - Target visibility
   * @param layer - When set, only items on this layer are updated
   */
  setVisible(visible: boolean, layer?: string): void {
    if (layer == null) {
      this.htmlGroup.visible = visible
      for (const group of this.groups.values()) {
        group.setVisible(visible)
      }
      for (const entry of this.entries.values()) {
        if (this.groupChildIds.has(entry.id)) continue
        entry.object.visible = visible
      }
      for (const canvas of this.canvases.values()) {
        canvas.setVisible(visible)
      }
      return
    }

    for (const group of this.groups.values()) {
      if (group.layer === layer) {
        group.setVisible(visible)
      }
    }
    for (const entry of this.entries.values()) {
      if (this.groupChildIds.has(entry.id)) continue
      if (entry.layer === layer) {
        entry.object.visible = visible
      }
    }
    for (const canvas of this.canvases.values()) {
      if (canvas.layer === layer) {
        canvas.setVisible(visible)
      }
    }
  }

  /**
   * Enable or disable pointer hit-testing on published HTML overlays.
   *
   * Disabled while a CAD command is acquiring points so measurement / markup
   * endpoint DOM cannot swallow OSNAP clicks meant for the canvas.
   *
   * @param enabled - `true` to allow overlay grips/badges to receive pointers
   */
  setHitTestEnabled(enabled: boolean): void {
    this._hitTestEnabled = enabled
    this.syncHitTest()
  }

  /**
   * Re-apply {@link setHitTestEnabled} to every published CSS2D child.
   * Call after grip binding, which may set `pointer-events: auto`.
   */
  syncHitTest(): void {
    const pe = this._hitTestEnabled ? 'auto' : 'none'
    for (const group of this.groups.values()) {
      for (const child of group.children) {
        child.element.style.pointerEvents = pe
      }
    }
    for (const entry of this.entries.values()) {
      if (this.groupChildIds.has(entry.id)) continue
      entry.element.style.pointerEvents = pe
    }
  }

  /**
   * Select a group by id.
   *
   * @param id - Group id
   * @param exclusive - When `true` (default), clears any prior selection first.
   *   Pass `false` for additive multi-select.
   * @returns `true` when the group was newly selected
   */
  selectGroup(id: string, exclusive = true): boolean {
    const group = this.groups.get(id)
    if (!group) return false
    if (exclusive) {
      // Keep the target selected if it was already the only selection.
      for (const selectedId of [...this.selectedGroupIds]) {
        if (selectedId === id) continue
        this.groups.get(selectedId)?.setSelected(false)
        this.selectedGroupIds.delete(selectedId)
      }
    } else if (this.selectedGroupIds.has(id)) {
      return false
    }
    if (this.selectedGroupIds.has(id)) return false
    ensureSelectionStyles()
    this.selectedGroupIds.add(id)
    group.setSelected(true)
    return true
  }

  /**
   * Clear selection from one group.
   *
   * @param id - Group id
   * @returns `true` when the group was selected and is now deselected
   */
  deselectGroup(id: string): boolean {
    const group = this.groups.get(id)
    if (!group || !this.selectedGroupIds.has(id)) return false
    group.setSelected(false)
    this.selectedGroupIds.delete(id)
    return true
  }

  /** Clear selection from every selected group. */
  deselectAll(): void {
    if (this.selectedGroupIds.size === 0) return
    for (const id of this.selectedGroupIds) {
      this.groups.get(id)?.setSelected(false)
    }
    this.selectedGroupIds.clear()
  }

  /**
   * Whether any group is currently selected.
   *
   * @returns `true` when {@link selectedGroupIds} is non-empty
   */
  hasSelection(): boolean {
    return this.selectedGroupIds.size > 0
  }

  /**
   * Remove every currently selected group.
   *
   * Selection is cleared via {@link removeGroup} (which calls
   * `setSelected(false)`) so `onSelectedChanged` still runs for domain
   * cleanup such as CAD entity unhighlight.
   *
   * @returns `true` when at least one group was removed
   */
  deleteSelected(): boolean {
    if (this.selectedGroupIds.size === 0) return false
    const ids = [...this.selectedGroupIds]
    let removed = false
    for (const id of ids) {
      if (this.groups.has(id)) {
        this.remove(id)
        removed = true
      }
    }
    return removed
  }

  /**
   * Destroy the manager and remove all HTML overlays.
   */
  dispose(): void {
    this.clear()
    this.scene.remove(this.htmlGroup)
  }

  /**
   * Publish a group and its CSS2D children, replacing any item with the same id.
   *
   * @param group - Group to register
   */
  private addGroup(group: AcTrHtmlGroup): void {
    this.remove(group.id)
    this.groups.set(group.id, group)
    for (const child of group.children) {
      this.groupChildIds.add(child.id)
      this.addElement(child)
    }
    if (group.selectable) {
      ensureSelectionStyles()
    }
    group.bindSelection(g => {
      this.selectGroup(g.id)
    })
    this.applyItemLayoutVisibility(group)
    this.syncHitTest()
  }

  /**
   * Unpublish a group, dispose it, and remove its CSS2D children.
   *
   * @param group - Group currently registered in {@link groups}
   */
  private removeGroup(group: AcTrHtmlGroup): void {
    if (this.selectedGroupIds.has(group.id)) {
      group.setSelected(false)
      this.selectedGroupIds.delete(group.id)
    }
    this.groups.delete(group.id)
    for (const child of [...group.children]) {
      this.groupChildIds.delete(child.id)
      this.removeElement(child.id)
    }
    group.dispose()
  }

  /**
   * Unpublish a group without disposing HTML children, canvases, or `onDispose`.
   *
   * @param group - Group currently registered in {@link groups}
   */
  private detachGroup(group: AcTrHtmlGroup): void {
    if (this.selectedGroupIds.has(group.id)) {
      group.setSelected(false)
      this.selectedGroupIds.delete(group.id)
    }
    this.groups.delete(group.id)
    group.unbindSelection()
    group.setVisible(false)
    for (const child of [...group.children]) {
      this.groupChildIds.delete(child.id)
      this.unpublishElement(child.id)
    }
  }

  /**
   * Publish a leaf CSS2D overlay, replacing any leaf with the same id.
   *
   * @param element - Leaf overlay to attach to {@link htmlGroup}
   */
  private addElement(element: AcTrHtmlElement): void {
    this.removeElement(element.id)

    this.bindViewSyncedTransform(element)

    this.entries.set(element.id, element)
    this._baselineMatrices.set(element.id, element.object.matrix.clone())
    this.htmlGroup.add(element.object)

    if (!this.groupChildIds.has(element.id)) {
      this.applyItemLayoutVisibility(element)
    }
  }

  /**
   * Remove a leaf overlay from the scene and dispose its DOM node.
   *
   * @param id - Leaf element id
   */
  private removeElement(id: string): void {
    const entry = this.entries.get(id)
    if (!entry) return

    this.htmlGroup.remove(entry.object)
    entry.dispose()
    this.entries.delete(id)
    this._baselineMatrices.delete(id)
  }

  /**
   * Remove a leaf from the CSS2D scene without disposing the DOM node.
   *
   * @param id - Leaf element id
   */
  private unpublishElement(id: string): void {
    const entry = this.entries.get(id)
    if (!entry) return
    this.htmlGroup.remove(entry.object)
    this.entries.delete(id)
    this._baselineMatrices.delete(id)
  }

  /**
   * Register a standalone canvas overlay, replacing any item with the same id.
   *
   * @param canvas - Canvas overlay to register
   */
  private addCanvas(canvas: AcTrHtmlCanvasOverlay): void {
    this.remove(canvas.id)
    this.canvases.set(canvas.id, canvas)
    this.applyItemLayoutVisibility(canvas)
  }

  /**
   * Unregister and dispose a standalone canvas overlay.
   *
   * @param id - Canvas overlay id
   */
  private removeCanvas(id: string): void {
    const canvas = this.canvases.get(id)
    if (!canvas) return
    this.canvases.delete(id)
    canvas.dispose()
  }

  /**
   * Recompute visibility of every published overlay against {@link _activeLayoutId}.
   *
   * Groups whose layout no longer matches are also deselected.
   */
  private applyLayoutVisibility(): void {
    for (const id of [...this.selectedGroupIds]) {
      const group = this.groups.get(id)
      if (
        group?.layoutId != null &&
        this._activeLayoutId != null &&
        group.layoutId !== this._activeLayoutId
      ) {
        group.setSelected(false)
        this.selectedGroupIds.delete(id)
      }
    }

    for (const group of this.groups.values()) {
      this.applyItemLayoutVisibility(group)
    }
    for (const entry of this.entries.values()) {
      if (this.groupChildIds.has(entry.id)) continue
      this.applyItemLayoutVisibility(entry)
    }
    for (const canvas of this.canvases.values()) {
      this.applyItemLayoutVisibility(canvas)
    }
  }

  /**
   * Show or hide one overlay based on whether its `layoutId` matches the active layout.
   *
   * Items without a `layoutId`, or when no active layout is set, are left unchanged.
   *
   * @param item - Leaf, group, or canvas whose visibility should be updated
   */
  private applyItemLayoutVisibility(
    item: AcTrHtmlElement | AcTrHtmlGroup | AcTrHtmlCanvasOverlay
  ): void {
    if (item.layoutId == null || this._activeLayoutId == null) {
      return
    }
    const visible = item.layoutId === this._activeLayoutId
    if (item instanceof AcTrHtmlGroup) {
      item.setVisible(visible)
    } else if (item instanceof AcTrHtmlCanvasOverlay) {
      item.setVisible(visible)
    } else {
      item.object.visible = visible
    }
  }

  /**
   * After CSS2DRenderer writes its translation-only transform, append scale
   * from {@link applyTransforms} and, when {@link AcTrHtmlElement.scaleWithView}
   * is set, from orthographic camera zoom relative to first paint.
   *
   * @param entry - Leaf overlay whose `onAfterRender` hook should be installed
   */
  private bindViewSyncedTransform(entry: AcTrHtmlElement): void {
    const object = entry.object
    object.onAfterRender = (_renderer, _scene, camera) => {
      let viewScale = 1
      if (
        entry.scaleWithView &&
        (camera as THREE.OrthographicCamera).isOrthographicCamera === true
      ) {
        const zoom = (camera as THREE.OrthographicCamera).zoom
        if (entry.baseZoom == null || entry.baseZoom === 0) {
          entry.baseZoom = zoom
        }
        viewScale = zoom / entry.baseZoom
      }

      object.matrix.decompose(_position, _quaternion, _scale)
      const sx = _scale.x * viewScale
      const sy = _scale.y * viewScale
      if (sx === 1 && sy === 1) {
        return
      }

      // CSS2DRenderer replaces `transform` each frame; append scale only.
      object.element.style.transform += ` scale(${sx}, ${sy})`
    }
  }
}
