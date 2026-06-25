import { AcDbObjectId, AcGeBox2d, AcGeBox3d, log } from '@mlightcad/data-model'
import {
  AcTrEntity,
  AcTrHtmlTransientManager,
  AcTrPreviewOverlayManager,
  AcTrTransientManager
} from '@mlightcad/three-renderer'
import { AcEdLayerInfo } from 'editor'
import * as THREE from 'three'

import type { AcTrSpatialSearchOptions } from '../spatialIndex/AcTrSpatialIndex'
import { AcTrLayer } from './AcTrLayer'
import { AcTrLayout, AcTrLayoutStats } from './AcTrLayout'

export interface AcTrSceneStats {
  layouts: AcTrLayoutStats[]
  summary: {
    layoutCount: number
    entityCount: number
    totalSize: {
      line: number
      mesh: number
      point: number
      unbatched: number
      geometry: number
      mapping: number
      unbatchedCount: number
      unbatchedByType: {
        line: number
        mesh: number
        point: number
        other: number
      }
    }
  }
}

/**
 * Three.js scene manager for CAD drawings with hierarchical organization.
 *
 * The scene manages the complete visual representation of a CAD drawing using
 * a hierarchical structure that mirrors CAD data organization:
 *
 * ```
 * Scene
 * └── Layout (AcTrLayout) - Paper space or model space
 *     └── Layer (AcTrLayer) - Drawing layers for organization
 *         └── Entity (AcTrEntity) - Individual CAD entities (lines, arcs, etc.)
 * ```
 *
 * ## Key Responsibilities
 * - **Layout Management**: Handles multiple layouts (model space and paper spaces)
 * - **Layer Organization**: Manages layer visibility and entity grouping
 * - **Entity Rendering**: Provides access to all renderable CAD entities
 * - **Spatial Queries**: Calculates bounding boxes and spatial relationships
 * - **Three.js Integration**: Maintains the underlying Three.js scene
 *
 * The scene automatically manages the active layout and provides efficient
 * access to entities for rendering, selection, and spatial operations.
 *
 * @example
 * ```typescript
 * const scene = new AcTrScene();
 *
 * // Set up model space
 * scene.modelSpaceBtrId = modelSpaceId;
 *
 * // Add entities to layers
 * const entity = new AcTrLine(...);
 * scene.addEntity(entity, layerName);
 *
 * // Get all visible entities for rendering
 * const entities = scene.getAllEntities();
 *
 * // Get scene bounds for zoom operations
 * const bounds = scene.box;
 * ```
 */
export class AcTrScene {
  /** The underlying Three.js scene object */
  private _scene: THREE.Scene
  /** Map of layout ID to layout object */
  private _layers: Map<string, AcEdLayerInfo>
  /** Map of layout ID to layout object */
  private _layouts: Map<AcDbObjectId, AcTrLayout>
  /** ID of the currently active layout */
  private _activeLayoutBtrId: AcDbObjectId
  /** ID of the model space layout */
  private _modelSpaceBtrId: AcDbObjectId
  /** Transient objects manager */
  private _transientManager: AcTrTransientManager
  /** HTML transient elements manager */
  private _htmlTransientManager: AcTrHtmlTransientManager
  /** Batched preview overlay manager */
  private _previewOverlayManager: AcTrPreviewOverlayManager

  /**
   * Creates a new CAD scene instance.
   *
   * Initializes the Three.js scene and layout management structures.
   */
  constructor() {
    this._scene = new THREE.Scene()
    this._transientManager = new AcTrTransientManager(this._scene)
    this._htmlTransientManager = new AcTrHtmlTransientManager(this._scene)
    this._previewOverlayManager = new AcTrPreviewOverlayManager(this._scene)
    this._layers = new Map()
    this._layouts = new Map()
    this._activeLayoutBtrId = ''
    this._modelSpaceBtrId = ''
  }

  /**
   * The HTML transient elements manager for this scene
   */
  get htmlTransientManager() {
    return this._htmlTransientManager
  }

  /**
   * The layers in this scene
   */
  get layers() {
    return this._layers
  }

  /**
   * The layouts in this scene
   */
  get layouts() {
    return this._layouts
  }

  /**
   * The bounding box of the visibile objects in this secene
   */
  get box() {
    const layout = this.activeLayout
    if (!layout) return undefined
    const box = layout.box
    return box.isEmpty() ? undefined : box
  }

  /**
   * The scene object of THREE.js. This is internally used only. Try to avoid using it.
   */
  get internalScene() {
    return this._scene
  }

  /**
   * The block table record id of the model space
   */
  get modelSpaceBtrId() {
    return this._modelSpaceBtrId
  }
  set modelSpaceBtrId(value: AcDbObjectId) {
    this._modelSpaceBtrId = value
    if (!this._layouts.has(value)) {
      throw new Error(
        `[AcTrScene] No layout assiciated with the specified block table record id '${value}'!`
      )
    }
  }

  /**
   * The block table record id associated with the current active layout
   */
  get activeLayoutBtrId() {
    return this._activeLayoutBtrId
  }
  set activeLayoutBtrId(value: string) {
    this._activeLayoutBtrId = value
    this._layouts.forEach((layout, key) => {
      layout.visible = value == key
    })
  }

  /**
   * Get active layout
   */
  get activeLayout() {
    if (this._activeLayoutBtrId && this._layouts.has(this._activeLayoutBtrId)) {
      return this._layouts.get(this._activeLayoutBtrId)!
    }
    return undefined
  }

  /**
   * Get the layout of the model space
   */
  get modelSpaceLayout() {
    if (this._modelSpaceBtrId && this._layouts.has(this._modelSpaceBtrId)) {
      return this._layouts.get(this._modelSpaceBtrId)!
    }
    return undefined
  }

  /**
   * The statistics of this scene
   */
  get stats(): AcTrSceneStats {
    const layouts: AcTrLayoutStats[] = []
    let entityCount = 0
    let lineSize = 0
    let meshSize = 0
    let pointSize = 0
    let unbatchedSize = 0
    let geometrySize = 0
    let mappingSize = 0
    let unbatchedCount = 0
    const unbatchedByType = {
      line: 0,
      mesh: 0,
      point: 0,
      other: 0
    }
    this._layouts.forEach(layout => layouts.push(layout.stats))
    layouts.forEach(layout => {
      entityCount += layout.summary.entityCount
      lineSize += layout.summary.totalSize.line
      meshSize += layout.summary.totalSize.mesh
      pointSize += layout.summary.totalSize.point
      unbatchedSize += layout.summary.totalSize.unbatched
      geometrySize += layout.summary.totalSize.geometry
      mappingSize += layout.summary.totalSize.mapping
      unbatchedCount += layout.summary.totalSize.unbatchedCount
      unbatchedByType.line += layout.summary.totalSize.unbatchedByType.line
      unbatchedByType.mesh += layout.summary.totalSize.unbatchedByType.mesh
      unbatchedByType.point += layout.summary.totalSize.unbatchedByType.point
      unbatchedByType.other += layout.summary.totalSize.unbatchedByType.other
    })
    return {
      layouts,
      summary: {
        layoutCount: layouts.length,
        entityCount,
        totalSize: {
          line: lineSize,
          mesh: meshSize,
          point: pointSize,
          unbatched: unbatchedSize,
          geometry: geometrySize,
          mapping: mappingSize,
          unbatchedCount,
          unbatchedByType
        }
      }
    }
  }

  /**
   * Add one empty layout with the specified block table record id as the its key.
   *
   * This method is idempotent: when a layout already exists for the given
   * `ownerId`, the existing instance is returned untouched and no new THREE
   * group is attached to the scene. Re-creating eagerly would leak the
   * previous `AcTrLayout.internalObject` as an orphan child of `_scene`
   * (still rendered every frame and still indexed by ray/spatial queries),
   * which manifested as "ghost" entities from previously-visited layouts
   * accumulating on layout switches.
   *
   * @param ownerId Input the block table record id associated with this layout
   * @returns Return the layout associated with `ownerId` — newly created when
   * absent, or the pre-existing instance when already registered.
   */
  addEmptyLayout(ownerId: AcDbObjectId) {
    const existing = this._layouts.get(ownerId)
    if (existing) return existing

    const layout = new AcTrLayout()
    this._layouts.set(ownerId, layout)
    this._scene.add(layout.internalObject)
    layout.visible = ownerId == this._activeLayoutBtrId

    this._layers.forEach(layer => {
      layout.addLayer(layer)
    })
    return layout
  }

  /**
   * Clear scene
   * @returns Return this scene
   */
  clear() {
    this._layouts.forEach(layout => {
      this._scene.remove(layout.internalObject)
      layout.clear()
    })
    this._layouts.clear()
    this._layers.clear()
    this._transientManager.clear()
    this._htmlTransientManager.clear()
    this._previewOverlayManager.clear()
    this._scene.clear()
    this._transientManager = new AcTrTransientManager(this._scene)
    this._htmlTransientManager = new AcTrHtmlTransientManager(this._scene)
    this._previewOverlayManager = new AcTrPreviewOverlayManager(this._scene)
    return this
  }

  /**
   * Hover the specified entities. Propagates the request to **every**
   * layout in the scene, not just the active one — entities picked
   * through a paper-space viewport (drill-through) live in the model
   * layout while the active layout at pick time is paper, so the
   * hover/select state must reach both. Layouts that don't own the
   * given entity ids no-op gracefully (`getLayersByObjectId` returns
   * an empty array there).
   */
  hover(ids: AcDbObjectId[]) {
    if (this._layouts.size === 0) return false
    this._layouts.forEach(layout => layout.hover(ids))
    return true
  }

  /**
   * Unhover the specified entities across all layouts. See {@link hover}
   * for rationale on propagation.
   */
  unhover(ids: AcDbObjectId[]) {
    if (this._layouts.size === 0) return false
    this._layouts.forEach(layout => layout.unhover(ids))
    return true
  }

  /**
   * Select the specified entities across all layouts.
   *
   * This is what makes drill-through selection visually consistent: a
   * click inside a paper-space viewport resolves to a model entity, but
   * the active layout at that moment is paper. Without propagating to
   * the model layout, the selection would be silently lost — the entity
   * goes into `selectionSet` but no highlight ever renders. The bug
   * manifested as "I click on a line in the viewport and nothing
   * visibly selects" (debug logs confirmed `firstPicked` was the
   * correct entity, but the highlight never appeared).
   *
   * Cross-layout propagation also restores symmetry of
   * `select`/`unselect`: a model entity highlighted via paper drill
   * must un-highlight when the user replaces the selection from any
   * layout, not just the one where it was originally picked.
   */
  select(ids: AcDbObjectId[]) {
    if (this._layouts.size === 0) return false
    this._layouts.forEach(layout => layout.select(ids))
    return true
  }

  /**
   * Unselect the specified entities across all layouts. See
   * {@link select} for rationale.
   */
  unselect(ids: AcDbObjectId[]) {
    if (this._layouts.size === 0) return false
    this._layouts.forEach(layout => layout.unselect(ids))
    return true
  }

  /**
   * Search entities intersected or contained in the specified bounding box.
   * @param box Input the query bounding box
   * @returns Return query results
   */
  search(box: AcGeBox2d | AcGeBox3d, options?: AcTrSpatialSearchOptions) {
    const activeLayout = this.activeLayout
    return activeLayout ? activeLayout.search(box, options) : []
  }

  addLayer(layer: AcEdLayerInfo) {
    const updatedLayers: AcTrLayer[] = []
    this._layers.set(layer.name, layer)
    this._layouts.forEach(layout => {
      const updatedLayer = layout.addLayer(layer)
      if (updatedLayer) updatedLayers.push(updatedLayer)
    })
    return updatedLayers
  }

  updateLayer(layer: AcEdLayerInfo) {
    const updatedLayers: AcTrLayer[] = []
    this._layers.set(layer.name, layer)
    this._layouts.forEach(layout => {
      const updatedLayer = layout.updateLayer(layer)
      if (updatedLayer) updatedLayers.push(updatedLayer)
    })
    return updatedLayers
  }

  /**
   * Add the specified transient entity into this scene
   * @param entity Input one transient entity
   */
  addTransientEntity(entity: AcTrEntity) {
    this._transientManager.update(entity)
  }

  /**
   * Remove the specified transient entity from this scene
   * @param objectId Input the object id of the transient entity to remove
   */
  removeTransientEntity(objectId: AcDbObjectId) {
    this._transientManager.remove(objectId)
  }

  /**
   * Applies world transforms to existing transient entities without reconverting
   * database entities on every cursor move.
   */
  updateTransientPreviewTransforms(
    transforms: ReadonlyArray<{ objectId: AcDbObjectId; matrix: THREE.Matrix4 }>
  ): boolean {
    return this._transientManager.applyTransforms(
      transforms.map(entry => ({
        id: entry.objectId,
        matrix: entry.matrix
      }))
    )
  }

  /**
   * Returns true when every requested entity exists in the active layout.
   *
   * @param entityIds - Database object ids required for preview creation
   */
  canCreatePreview(entityIds: AcDbObjectId[]): boolean {
    const layout = this.activeLayout
    if (!layout) {
      return false
    }
    return layout.canCreateEntityPreview(entityIds)
  }

  /**
   * Creates one batched preview overlay for command jigs.
   *
   * @param entityIds - Database object ids to include in the preview overlay
   * @returns Preview handle id, or `null` when preview creation failed
   */
  createPreview(entityIds: AcDbObjectId[]): string | null {
    const layout = this.activeLayout
    if (!layout) {
      return null
    }
    const root = layout.createEntityPreviewRoot(entityIds)
    if (!root) {
      return null
    }
    return this._previewOverlayManager.add(root).id
  }

  /**
   * Updates the transform of one batched preview overlay.
   *
   * @param handleId - Preview handle returned by {@link createPreview}
   * @param matrix - World transform copied onto the preview root
   * @returns `true` when the handle exists and the transform was applied
   */
  updatePreview(handleId: string, matrix: THREE.Matrix4): boolean {
    return this._previewOverlayManager.update(handleId, matrix)
  }

  /**
   * Removes one batched preview overlay.
   *
   * @param handleId - Preview handle returned by {@link createPreview}
   * @returns `true` when the handle existed and was removed
   */
  removePreview(handleId: string): boolean {
    return this._previewOverlayManager.remove(handleId)
  }

  /**
   * Add one persistent entity (stored in the drawing database) into this scene. If the layout
   * associated with this entity doesn't exist, then create one layout, add this layout into
   * this scene, and add the entity into the layout.
   * @param entity Input AutoCAD entity to be added into scene.
   * @param extendBbox Input the flag whether to extend the bounding box of this scene by union the bounding box
   * of the specified entity.
   * @returns Return this scene
   */
  addEntity(entity: AcTrEntity, extendBbox: boolean = true) {
    const ownerId = entity.ownerId
    if (ownerId) {
      let layout = this._layouts.get(ownerId)
      if (!layout) {
        layout = this.addEmptyLayout(ownerId)
      }
      layout.addEntity(entity, extendBbox)
    } else {
      log.warn('[AcTrSecene] The owner id of one entity cannot be empty!')
    }

    return this
  }

  /**
   * Remove the specified persistent entity (stored in the drawing database) from this scene.
   * @param objectId Input the object id of the entity to remove
   * @returns Return true if remove the specified entity successfully. Otherwise, return false.
   */
  removeEntity(objectId: AcDbObjectId) {
    for (const [_, layout] of this._layouts) {
      if (layout.removeEntity(objectId)) return true
    }
    return false
  }

  /**
   * Update the specified persistent entity (stored in the drawing database) in this scene.
   * @param objectId Input the entity to update
   * @returns Return true if update the specified entity successfully. Otherwise, return false.
   */
  updateEntity(entity: AcTrEntity) {
    for (const [_, layout] of this._layouts) {
      if (layout.updateEntity(entity)) return true
    }
    return false
  }

  /**
   * Returns true when the entity is present in any layout.
   */
  hasEntity(objectId: AcDbObjectId) {
    for (const [_, layout] of this._layouts) {
      if (layout.hasEntity(objectId)) {
        return true
      }
    }
    return false
  }

  /**
   * Updates entity visibility without rebuilding batched geometry.
   */
  setEntityVisible(objectId: AcDbObjectId, visible: boolean) {
    let updated = false
    for (const [_, layout] of this._layouts) {
      if (layout.setEntityVisible(objectId, visible)) {
        updated = true
      }
    }
    return updated
  }

  /**
   * Returns the current scene visibility for one entity.
   */
  getEntityVisible(objectId: AcDbObjectId) {
    for (const [_, layout] of this._layouts) {
      const visible = layout.getEntityVisible(objectId)
      if (visible !== undefined) {
        return visible
      }
    }
    return undefined
  }
}
