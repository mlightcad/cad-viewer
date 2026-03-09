import * as THREE from 'three'

import { AcTrLayoutView } from './AcTrLayoutView'
import { AcTrScene } from './AcTrScene'

/**
 * Manages multiple layout views and coordinates active layout switching.
 *
 * This class serves as a central coordinator for all layout views in the CAD viewer.
 * It handles:
 * - Managing a collection of layout views indexed by their block table record IDs
 * - Tracking and switching the active layout
 * - Coordinating rendering operations across layout views
 * - Managing view lifecycle (resize, enable/disable)
 *
 * The layout view manager ensures that only one layout is active at a time while
 * maintaining the state of all layouts for quick switching. It provides a unified
 * interface for layout operations regardless of which specific layout is active.
 *
 * @example
 * ```typescript
 * const manager = new AcTrLayoutViewManager();
 * manager.add(layoutView);
 * manager.activeLayoutBtrId = 'layout1';
 * manager.render(scene);
 * ```
 */
export class AcTrLayoutViewManager {
  /** The block table record ID of the currently active layout */
  private _activeLayoutBtrId: string
  /** Map of layout views indexed by their block table record IDs */
  private _layoutViews: Map<string, AcTrLayoutView>

  /**
   * Creates a new layout view manager instance.
   * Initializes with no active layout and an empty collection of views.
   */
  constructor() {
    this._activeLayoutBtrId = ''
    this._layoutViews = new Map()
  }

  /**
   * The block table record id associated with the active layout.
   * Setting this property switches the active layout and enables/disables
   * the appropriate layout views.
   */
  get activeLayoutBtrId() {
    return this._activeLayoutBtrId
  }
  set activeLayoutBtrId(value: string) {
    this._activeLayoutBtrId = value
    this._layoutViews.forEach(layoutView => {
      layoutView.enabled = layoutView.layoutBtrId == value
    })
  }

  /**
   * The active layout view.
   * Returns the layout view corresponding to the currently active layout,
   * or undefined if no layout is active or the active layout doesn't exist.
   */
  get activeLayoutView() {
    return this._layoutViews.get(this._activeLayoutBtrId)
  }

  /**
   * Return true if the layout view manager contains one layout view associated with the specified block
   * table record id. Otherwise it returns false.
   *
   * @param layoutBtrId - Input the block table record id associated with the layout view
   * @returns Return true if the layout view manager contains one layout view associated with the specified
   * block table record id. Otherwise it returns false.
   */
  has(layoutBtrId: string) {
    return this._layoutViews.has(layoutBtrId)
  }

  /**
   * Get the layout view by the block table record id associated with the layout.
   *
   * @param layoutBtrId - Input the id of the block table record associated the layout
   * @returns Return the layout view by the block table record id associated with the layout,
   * or undefined if not found
   */
  getAt(layoutBtrId: string) {
    return this._layoutViews.get(layoutBtrId)
  }

  /**
   * Resize all of layout views managed by layout view manager.
   * This is typically called when the viewport or container size changes
   * and all layouts need to update their dimensions.
   *
   * @param width - Input new width of the layout view in pixels
   * @param height - Input new height of the layout view in pixels
   */
  resize(width: number, height: number) {
    this._layoutViews.forEach(layoutView => {
      layoutView.resize(width, height)
    })
  }

  /**
   * Adds a layout view to the manager.
   * The layout view is indexed by its block table record ID for fast lookup.
   *
   * @param layoutView - The layout view to add to the manager
   */
  add(layoutView: AcTrLayoutView) {
    this._layoutViews.set(layoutView.layoutBtrId, layoutView)
  }

  /**
   * Render the specified scene in the current layout view.
   * Only renders the currently active layout view, if one is set.
   *
   * @param scene - Input the scene to render
   */
  render(scene: AcTrScene, overlayScene?: THREE.Scene) {
    this.activeLayoutView?.render(scene, overlayScene)
  }
}
