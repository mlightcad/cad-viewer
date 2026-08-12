import * as THREE from 'three'

import {
  AC_TR_HTML_CANVAS_CLASS,
  AcTrHtmlCanvasOverlay
} from './AcTrHtmlCanvasOverlay'
import { AC_TR_HTML_SELECTED_CLASS, AcTrHtmlElement } from './AcTrHtmlElement'
import { AcTrHtmlGroup } from './AcTrHtmlGroup'

const _position = /*@__PURE__*/ new THREE.Vector3()
const _quaternion = /*@__PURE__*/ new THREE.Quaternion()
const _scale = /*@__PURE__*/ new THREE.Vector3()

let selectionStylesInstalled = false

function ensureSelectionStyles(): void {
  if (selectionStylesInstalled || typeof document === 'undefined') return
  selectionStylesInstalled = true
  const style = document.createElement('style')
  style.dataset.mlHtmlSelection = '1'
  style.textContent = `
.ml-html-dot.${AC_TR_HTML_SELECTED_CLASS} {
  border-color: #ffd54f !important;
  box-shadow: 0 0 0 2px rgba(255, 213, 79, 0.55);
}
.ml-html-badge.${AC_TR_HTML_SELECTED_CLASS} {
  border: 1px solid rgba(255, 213, 79, 0.75);
  color: #ffd54f !important;
  box-shadow: 0 0 0 2px rgba(255, 213, 79, 0.35),
    var(--ml-ui-shadow, 0 1px 4px rgba(0,0,0,0.2));
}
.${AC_TR_HTML_CANVAS_CLASS}.${AC_TR_HTML_SELECTED_CLASS} {
  filter: drop-shadow(0 0 3px #ffd54f);
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
  private readonly scene: THREE.Scene
  private readonly htmlGroup: THREE.Group

  /** Mapping from leaf element ID → element */
  private readonly entries: Map<string, AcTrHtmlElement>
  /** Mapping from group ID → group */
  private readonly groups: Map<string, AcTrHtmlGroup>
  /** Mapping from standalone canvas overlay ID → overlay */
  private readonly canvases: Map<string, AcTrHtmlCanvasOverlay>
  /** Leaf ids that belong to a group (visibility driven by the group). */
  private readonly groupChildIds = new Set<string>()
  /** Currently selected group ids */
  private readonly selectedGroupIds = new Set<string>()
  /** Active layout BTR id used to filter layout-scoped overlays. */
  private _activeLayoutId?: string
  /** World matrix captured when each leaf transient was published. */
  private readonly _baselineMatrices = new Map<string, THREE.Matrix4>()
  private readonly _composedMatrix = new THREE.Matrix4()

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
   * Remove a leaf element, canvas overlay, or an entire group by ID.
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
   * Clear all items, or only items on a specific layer.
   *
   * Groups on the layer are removed first (with their children / canvases);
   * remaining loose leaf elements and standalone canvases are removed
   * afterwards.
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

  /** Check whether a leaf element, canvas overlay, or group exists. */
  has(id: string): boolean {
    return (
      this.entries.has(id) || this.groups.has(id) || this.canvases.has(id)
    )
  }

  /** Retrieve a leaf element by ID. */
  get(id: string): AcTrHtmlElement | undefined {
    return this.entries.get(id)
  }

  /** Retrieve a group by ID. */
  getGroup(id: string): AcTrHtmlGroup | undefined {
    return this.groups.get(id)
  }

  /** Retrieve a standalone canvas overlay by ID. */
  getCanvas(id: string): AcTrHtmlCanvasOverlay | undefined {
    return this.canvases.get(id)
  }

  /** Retrieve the DOM node for a leaf element. */
  getElement(id: string): HTMLElement | undefined {
    return this.entries.get(id)?.element
  }

  /**
   * Show or hide all items, or only items on a specific layer.
   */
  setVisible(visible: boolean, layer?: string): void {
    if (layer == null) {
      this.htmlGroup.visible = visible
      for (const canvas of this.canvases.values()) {
        canvas.setVisible(visible)
      }
      return
    }
    for (const entry of this.entries.values()) {
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
   * Select a group by id.
   * @param exclusive When `true` (default), clears any prior selection first.
   *   Pass `false` for additive multi-select.
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

  /** Clear selection from every selected group. */
  deselectAll(): void {
    if (this.selectedGroupIds.size === 0) return
    for (const id of this.selectedGroupIds) {
      this.groups.get(id)?.setSelected(false)
    }
    this.selectedGroupIds.clear()
  }

  /** Whether any group is currently selected. */
  hasSelection(): boolean {
    return this.selectedGroupIds.size > 0
  }

  /**
   * Remove every currently selected group.
   * @returns `true` when at least one group was removed.
   *
   * Selection is cleared via {@link removeGroup} (which calls
   * `setSelected(false)`) so `onSelectedChanged` still runs for domain
   * cleanup such as CAD entity unhighlight.
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
  }

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

  private removeElement(id: string): void {
    const entry = this.entries.get(id)
    if (!entry) return

    this.htmlGroup.remove(entry.object)
    entry.dispose()
    this.entries.delete(id)
    this._baselineMatrices.delete(id)
  }

  private addCanvas(canvas: AcTrHtmlCanvasOverlay): void {
    this.remove(canvas.id)
    this.canvases.set(canvas.id, canvas)
    this.applyItemLayoutVisibility(canvas)
  }

  private removeCanvas(id: string): void {
    const canvas = this.canvases.get(id)
    if (!canvas) return
    this.canvases.delete(id)
    canvas.dispose()
  }

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
