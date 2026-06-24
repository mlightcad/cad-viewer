import { AcDbObjectId } from '@mlightcad/data-model'
import {
  AcTrBatchedGroup,
  AcTrBatchedGroupStats,
  AcTrEntity,
  AcTrPreviewSubsetOptions
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { AcEdLayerInfo } from '../editor'

/**
 * Statistics for a CAD layer including name and batched rendering metrics.
 *
 * Extends the standard batched group statistics with layer-specific information.
 */
export type AcTrLayerStats = AcTrBatchedGroupStats & {
  /** The name of the layer */
  name: string
  /** Statistics for non-batched objects in this layer */
  unbatched: {
    count: number
    geometrySize: number
    byType: {
      line: number
      mesh: number
      point: number
      other: number
    }
  }
}

/**
 * Represents a CAD layer for organizing and rendering entities in Three.js.
 *
 * This class manages a collection of CAD entities that belong to the same logical layer.
 * It provides:
 * - Entity organization and grouping
 * - Layer visibility control
 * - Efficient batched rendering through Three.js groups
 * - Performance monitoring and statistics
 *
 * ## Technical Notes
 * Unlike Three.js built-in layers (which only support 32 layers), this implementation
 * uses Three.js groups to represent AutoCAD layers, allowing unlimited layer support.
 * Each AutoCAD layer corresponds to one Three.js group containing all entities.
 *
 * ## Performance Benefits
 * - Batched rendering reduces draw calls
 * - Efficient visibility toggling for entire layers
 * - Optimized entity grouping for better GPU performance
 *
 * @example
 * ```typescript
 * // Create a new layer
 * const layer = new AcTrLayer('Dimensions');
 *
 * // Add entities to the layer
 * const line = new AcTrLine(startPoint, endPoint);
 * layer.add(line);
 *
 * // Control layer visibility
 * layer.visible = false; // Hide all entities in this layer
 *
 * // Get layer statistics
 * const stats = layer.stats;
 * console.log(`Layer ${stats.name} has ${stats.entityCount} entities`);
 * ```
 */
export class AcTrLayer {
  /**
   * Resolves whether a layer should be visible in the view.
   *
   * Non-plottable layer suppression is handled in {@link AcDbEntity.worldDraw};
   * only freeze/off state is reflected here.
   */
  static isLayerVisible(info: AcEdLayerInfo): boolean {
    return !(info.isFrozen || info.isOff)
  }

  /**
   * Layer name
   */
  private _name: string
  /**
   * This group contains all entities in this layer
   */
  private _group: AcTrBatchedGroup

  /**
   * Bounding box containing all entities in this layer
   */
  private _cachedBox: THREE.Box3
  private _boxDirty: boolean

  /**
   * Construct one instance of this class
   * @param layer - Layer information
   */
  constructor(layer: AcEdLayerInfo) {
    this._group = new AcTrBatchedGroup()
    this._name = layer.name
    this._cachedBox = new THREE.Box3()
    this._boxDirty = true
    this._group.visible = AcTrLayer.isLayerVisible(layer)
  }

  /**
   * Layer name
   */
  get name() {
    return this._name
  }
  set name(value: string) {
    this._name = value
  }

  /**
   * Gets the bounding box that contains all entities in this layer.
   *
   * Derived from packed batch vertex buffers, not entity metadata boxes.
   *
   * @returns The layer's bounding box
   */
  get box() {
    if (this._boxDirty) {
      this.computeBatchBoundingBox(this._cachedBox)
      this._boxDirty = false
    }
    return this._cachedBox
  }

  /**
   * Recomputes bounds from packed batch vertex buffers in this layer.
   */
  computeBatchBoundingBox(
    target = new THREE.Box3(),
    excludeObjectIds?: ReadonlySet<string>
  ) {
    if (!this.visible) {
      target.makeEmpty()
      return target
    }
    return this._group.computeBoundingBox(target, { excludeObjectIds })
  }

  get visible() {
    return this._group.visible
  }
  set visible(value: boolean) {
    this._group.visible = value
  }

  get internalObject() {
    return this._group
  }

  /**
   * The statistics of this layer
   */
  get stats() {
    const batchedGroupStats = this._group.stats
    return {
      name: this._name,
      ...batchedGroupStats
    } as AcTrLayerStats
  }

  /**
   * The number of entities stored in this layer
   */
  get entityCount() {
    return this._group.entityCount
  }

  /**
   * Update layer information of this layer
   * @param value - New layer information
   */
  update(value: AcEdLayerInfo) {
    const wasVisible = this.visible
    this._name = value.name
    this._group.visible = AcTrLayer.isLayerVisible(value)
    if (wasVisible !== this.visible) {
      this._boxDirty = true
    }
  }

  /**
   * Find entities associated with the specified material and replace their material with new material
   * @param oldId - Id of the old material
   * @param material - The new material associated with entities
   */
  updateMaterial(oldId: number, material: THREE.Material) {
    this._group.updateMaterial(oldId, material)
  }

  /**
   * Re-render points with latest point style settings
   * @param displayMode Input display mode of points
   */
  rerenderPoints(displayMode: number) {
    this._group.rerenderPoints(displayMode)
  }

  /**
   * Return true if this layer contains the entity with the specified object id. Otherwise, return false.
   * @param objectId Input the object id of one entity
   * @returns Return true if this layer contains the entity with the specified object id. Otherwise,
   * return false.
   */
  hasEntity(objectId: AcDbObjectId) {
    return this._group.hasEntity(objectId)
  }

  /**
   * Updates visibility for one entity without rebuilding batched geometry.
   */
  setEntityVisible(objectId: AcDbObjectId, visible: boolean) {
    return this._group.setEntityVisible(objectId, visible)
  }

  /**
   * Returns the current scene visibility for one entity.
   */
  getEntityVisible(objectId: AcDbObjectId) {
    return this._group.getEntityVisible(objectId)
  }

  /**
   * Builds a preview subset for entities stored in this layer group.
   *
   * @param entityIds - Database object ids to extract from this layer
   * @param options - Optional preview style and slot limits
   * @returns Preview subset group, or `null` when extraction failed
   */
  createPreviewSubset(entityIds: AcDbObjectId[], options?: AcTrPreviewSubsetOptions) {
    return this._group.createPreviewSubset(entityIds, options)
  }

  /**
   * Add one AutoCAD entity into this layer.
   * @param entity Input AutoCAD entity to be added into this layer.
   * @param extendBbox - Input the flag whether to extend the bounding box of the scene by union the bounding box
   * of the specified entity. Defaults to true.
   */
  addEntity(entity: AcTrEntity, _extendBbox: boolean = true) {
    this._group.addEntity(entity)
    this._boxDirty = true
  }

  /**
   * Return true if the object with the specified object id is intersected with the ray by using raycast.
   * @param objectId  Input object id of object to check for intersection with the ray.
   * @param raycaster Input raycaster to check intersection
   */
  isIntersectWith(objectId: string, raycaster: THREE.Raycaster) {
    return this._group.isIntersectWith(objectId, raycaster)
  }

  /**
   * Remove the specified entity from this layer.
   * @param objectId Input the object id of the entity to remove
   * @returns Return true if remove the specified entity successfully. Otherwise, return false.
   */
  removeEntity(objectId: AcDbObjectId): boolean {
    const removed = this._group.removeEntity(objectId)
    if (removed) {
      this._boxDirty = true
    }
    return removed
  }

  /**
   * Update the specified entity in this layer.
   * @param entity Input the entity to update
   * @returns Return true if update the specified entity successfully. Otherwise, return false.
   */
  updateEntity(entity: AcTrEntity): boolean {
    if (!entity.objectId) {
      return false
    }
    const isRemoved = this._group.removeEntity(entity.objectId)
    if (isRemoved) {
      this._group.addEntity(entity)
      this._boxDirty = true
      return true
    }
    if (entity.visible) {
      this._group.addEntity(entity)
      this._boxDirty = true
      return true
    }
    return false
  }

  /**
   * Clear all entities in this layer and release batched geometry resources.
   */
  clear() {
    this._group.clear()
    this._cachedBox.makeEmpty()
    this._boxDirty = true
    this._group.removeFromParent()
  }

  /**
   * Hover the specified entities
   */
  hover(ids: AcDbObjectId[]) {
    ids.forEach(id => {
      this._group.hover(id)
    })
  }

  /**
   * Unhover the specified entities
   */
  unhover(ids: AcDbObjectId[]) {
    ids.forEach(id => {
      this._group.unhover(id)
    })
  }

  /**
   * Select the specified entities
   */
  select(ids: AcDbObjectId[]) {
    ids.forEach(id => {
      this._group.select(id)
    })
  }

  /**
   * Unselect the specified entities
   */
  unselect(ids: AcDbObjectId[]) {
    ids.forEach(id => {
      this._group.unselect(id)
    })
  }
}
