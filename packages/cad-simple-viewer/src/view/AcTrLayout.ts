import { AcDbObjectId, AcGeBox2d, AcGeBox3d } from '@mlightcad/data-model'
import {
  AcTrEntity,
  AcTrGroup,
  disposePreviewSubset
} from '@mlightcad/three-renderer'
import * as THREE from 'three'

import { AcEdLayerInfo, AcEdSpatialQueryResultItem } from '../editor'
import { unionSpatialQueryItems } from '../editor/view/AcEdSpatialQueryResult'
import { AcTrHierarchicalSpatialIndex } from '../spatialIndex'
import type { AcTrSpatialSearchOptions } from '../spatialIndex/AcTrSpatialIndex'
import { AcTrLayer, AcTrLayerStats } from './AcTrLayer'

/**
 * Interface representing statistics for a layout.
 * Provides detailed information about the layout's content including
 * layer statistics and memory usage breakdown.
 */
export interface AcTrLayoutStats {
  /** Statistics for each layer in the layout */
  layers: AcTrLayerStats[]
  /** Summary statistics for the entire layout */
  summary: {
    /** Total number of entities across all layers */
    entityCount: number
    /** Memory usage breakdown by object type */
    totalSize: {
      /** Memory used by line geometries (bytes) */
      line: number
      /** Memory used by mesh geometries (bytes) */
      mesh: number
      /** Memory used by point geometries (bytes) */
      point: number
      /** Memory used by unbatched geometries (bytes) */
      unbatched: number
      /** Total geometry memory usage (bytes) */
      geometry: number
      /** Memory used by entity mappings (bytes) */
      mapping: number
      /** Number of unbatched objects */
      unbatchedCount: number
      /** Unbatched object count by type */
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
 * This class represents objects contained in one AutoCAD layout (model space or paper space).
 *
 * A layout manages the organization and rendering of CAD entities within a specific coordinate space.
 * It provides functionality for:
 * - Managing entities organized by layers
 * - Spatial indexing for efficient entity queries
 * - Bounding box management for view operations
 * - Entity selection and highlighting
 * - Memory usage tracking and statistics
 *
 * Layouts use a spatial index (R-tree) for fast entity lookup operations and maintain
 * a hierarchical structure where entities are grouped by layers for efficient rendering
 * and visibility management.
 *
 * @example
 * ```typescript
 * const layout = new AcTrLayout();
 * layout.addEntity(entity);
 * const entities = layout.search(boundingBox);
 * layout.select(['entity1', 'entity2']);
 * ```
 */
export class AcTrLayout {
  /** The group that contains all entities in this layout */
  private _group: THREE.Group
  /** Spatial index tree for efficient entity queries */
  private _spatialIndex: AcTrHierarchicalSpatialIndex
  /** Cached layout bounds derived from packed batch vertex buffers */
  private _cachedBox: THREE.Box3
  /** When true, {@link box} is recomputed from batch geometry on next read */
  private _boxDirty: boolean
  /** Entity ids excluded from layout bounds (e.g. RAY/XLINE) */
  private _extentExcludedObjectIds: Set<AcDbObjectId>
  /** Map of layers indexed by layer name */
  private _layers: Map<string, AcTrLayer>
  /** The flag indicating whether the layout is loaded/activated */
  private _isLoaded: boolean

  /**
   * Creates a new layout instance.
   * Initializes the layout with empty collections and a spatial index.
   */
  constructor() {
    this._group = new THREE.Group()
    this._spatialIndex = new AcTrHierarchicalSpatialIndex()
    this._cachedBox = new THREE.Box3()
    this._boxDirty = true
    this._extentExcludedObjectIds = new Set()
    this._layers = new Map()
    this._isLoaded = false
  }

  /**
   * The internal THREE.js object to use by scene. This is internally used only. Try to avoid using it.
   * @internal
   */
  get internalObject() {
    return this._group
  }

  /**
   * Gets the map of layers in this layout.
   *
   * @returns Map of layer names to layer objects
   */
  get layers() {
    return this._layers
  }

  /**
   * Gets the bounding box that contains all entities in this layout.
   *
   * Derived from packed batch vertex buffers (same source as GPU draw data),
   * not from accumulated {@link AcTrEntity.wcsBbox} metadata.
   *
   * @returns The layout's bounding box
   */
  get box() {
    if (this._boxDirty) {
      this.recomputeBox()
    }
    return this._cachedBox
  }

  /**
   * Recomputes {@link box} from batch geometry across all visible layers.
   */
  computeBatchBoundingBox(target = new THREE.Box3()) {
    if (this._boxDirty) {
      this.recomputeBox()
    }
    return target.copy(this._cachedBox)
  }

  private recomputeBox() {
    this._cachedBox.makeEmpty()
    const scratch = new THREE.Box3()
    this._layers.forEach(layer => {
      layer.computeBatchBoundingBox(scratch, this._extentExcludedObjectIds)
      if (!scratch.isEmpty()) {
        this._cachedBox.union(scratch)
      }
    })
    this._boxDirty = false
  }

  private invalidateBox() {
    this._boxDirty = true
  }

  /**
   * The flag indicating whether the layout is loaded/activated.
   *
   * @returns The flag indicating whether the layout is loaded/activated.
   */
  get isLoaded() {
    return this._isLoaded
  }

  /**
   * Sets the flag indicating whether the layout is loaded/activated.
   *
   * @param value - The flag indicating whether the layout is loaded/activated.
   */
  set isLoaded(value: boolean) {
    this._isLoaded = value
  }

  /**
   * The visibility of this layout.
   * When set to false, the entire layout and all its contents are hidden.
   */
  get visible() {
    return this._group.visible
  }
  set visible(value: boolean) {
    this._group.visible = value
  }

  /**
   * The number of entities stored in this layout.
   * Calculates the total by summing entities across all layers.
   */
  get entityCount() {
    let count = 0
    this._layers.forEach(layer => (count += layer.entityCount))
    return count
  }

  /**
   * The statistics of this layout.
   * Provides detailed information about memory usage and entity counts.
   */
  get stats() {
    const layers: AcTrLayerStats[] = []
    let totalGeometrySize = 0
    let totalMappingSize = 0
    let lineTotalSize = 0
    let meshTotalSize = 0
    let pointTotalSize = 0
    let unbatchedTotalSize = 0
    let unbatchedTotalCount = 0
    const unbatchedByType = {
      line: 0,
      mesh: 0,
      point: 0,
      other: 0
    }
    this._layers.forEach(layer => {
      const stats = layer.stats
      layers.push(stats)
      lineTotalSize +=
        stats.line.indexed.geometrySize + stats.line.nonIndexed.geometrySize
      meshTotalSize +=
        stats.mesh.indexed.geometrySize + stats.mesh.nonIndexed.geometrySize
      pointTotalSize +=
        stats.point.indexed.geometrySize + stats.point.nonIndexed.geometrySize
      unbatchedTotalSize += stats.unbatched.geometrySize
      unbatchedTotalCount += stats.unbatched.count
      unbatchedByType.line += stats.unbatched.byType.line
      unbatchedByType.mesh += stats.unbatched.byType.mesh
      unbatchedByType.point += stats.unbatched.byType.point
      unbatchedByType.other += stats.unbatched.byType.other
      totalGeometrySize += stats.summary.totalGeometrySize
      totalMappingSize += stats.summary.totalMappingSize
    })
    return {
      layers,
      summary: {
        entityCount: this.entityCount,
        totalSize: {
          line: lineTotalSize,
          mesh: meshTotalSize,
          point: pointTotalSize,
          unbatched: unbatchedTotalSize,
          geometry: totalGeometrySize,
          mapping: totalMappingSize,
          unbatchedCount: unbatchedTotalCount,
          unbatchedByType
        }
      }
    } as AcTrLayoutStats
  }

  /**
   * Clears all entities from the layout.
   * Removes all layers, resets the bounding box, and clears the spatial index.
   *
   * @returns This layout instance for method chaining
   */
  clear() {
    this._layers.forEach(layer => {
      layer.clear()
    })
    this._layers.clear()
    this._cachedBox.makeEmpty()
    this._boxDirty = true
    this._extentExcludedObjectIds.clear()
    this._spatialIndex.clear()
    return this
  }

  /**
   * Re-render points with latest point style settings.
   * Updates the visual representation of all point entities across all layers.
   *
   * @param displayMode - Input display mode of points
   */
  rerenderPoints(displayMode: number) {
    this._layers.forEach(layer => {
      layer.rerenderPoints(displayMode)
    })
  }

  /**
   * Return true if the object with the specified object id is intersected with the ray by using raycast.
   *
   * @param objectId - Input object id of object to check for intersection with the ray.
   * @param raycaster - Input raycaster to check intersection
   * @returns True if the object intersects with the ray, false otherwise
   */
  isIntersectWith(objectId: string, raycaster: THREE.Raycaster) {
    const layers = this.getLayersByObjectId(objectId)
    for (let index = 0; index < layers.length; ++index) {
      const layer = layers[index]
      if (layer && layer.isIntersectWith(objectId, raycaster)) return true
    }
    return false
  }

  hasVisibleEntity(objectId: AcDbObjectId) {
    return this.getLayersByObjectId(objectId).some(layer => layer.visible)
  }

  /**
   * Add one AutoCAD entity into this layout. If layer group referenced by the entity doesn't exist, create one
   * layer group and add this entity this group.
   *
   * @param entity - Input AutoCAD entity to be added into this layout.
   * @param extendBbox - Input the flag whether to extend the bounding box of the scene by union the bounding box
   * of the specified entity. Defaults to true.
   * @returns This layout instance for method chaining
   *
   * @throws {Error} When entity is missing required objectId or layerName
   */
  addEntity(entity: AcTrEntity, extendBbox: boolean = true) {
    if (!entity.objectId) {
      throw new Error('Object id is required to add one entity!')
    }
    if (!entity.layerName) {
      throw new Error('Layer name is required to add one entity!')
    }

    const layer = this._layers.get(entity.layerName)
    if (!layer) {
      throw new Error(`layer '${entity.layerName}' doesn't exist!`)
    }

    layer.addEntity(entity)

    if (!extendBbox) {
      this._extentExcludedObjectIds.add(entity.objectId)
    } else {
      this._extentExcludedObjectIds.delete(entity.objectId)
    }
    this.invalidateBox()

    this.registerEntitySpatialIndex(entity)

    return this
  }

  /**
   * Remove the specified entity from this layout.
   *
   * @param objectId - Input the object id of the entity to remove
   * @returns Return true if remove the specified entity successfully. Otherwise, return false.
   */
  removeEntity(objectId: AcDbObjectId) {
    let result = false
    for (const [_, layer] of this._layers) {
      if (layer.removeEntity(objectId)) {
        result = true
      }
    }
    if (result) {
      this._spatialIndex.removeById(objectId)
      this._extentExcludedObjectIds.delete(objectId)
      this.invalidateBox()
    }
    return result
  }

  /**
   * Update the specified entity in this layout.
   *
   * @param entity - Input the entity to update
   * @returns Return true if update the specified entity successfully. Otherwise, return false.
   */
  updateEntity(entity: AcTrEntity) {
    for (const [_, layer] of this._layers) {
      if (layer.updateEntity(entity)) {
        this._spatialIndex.removeById(entity.objectId)
        this.registerEntitySpatialIndex(entity)
        this.invalidateBox()
        return true
      }
    }
    return false
  }

  /**
   * Returns true when any layer in this layout contains the entity.
   */
  hasEntity(objectId: AcDbObjectId) {
    for (const [_, layer] of this._layers) {
      if (layer.hasEntity(objectId)) {
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
    for (const [_, layer] of this._layers) {
      if (layer.setEntityVisible(objectId, visible)) {
        updated = true
      }
    }
    if (updated) {
      this.invalidateBox()
    }
    return updated
  }

  /**
   * Returns the current scene visibility for one entity.
   */
  getEntityVisible(objectId: AcDbObjectId) {
    for (const [_, layer] of this._layers) {
      const visible = layer.getEntityVisible(objectId)
      if (visible !== undefined) {
        return visible
      }
    }
    return undefined
  }

  /**
   * Returns true when every requested entity is present in this layout.
   *
   * @param entityIds - Database object ids required for preview creation
   */
  canCreateEntityPreview(entityIds: AcDbObjectId[]): boolean {
    if (entityIds.length === 0) {
      return false
    }
    const root = this.createEntityPreviewRoot(entityIds)
    if (!root) {
      return false
    }
    disposePreviewSubset(root)
    return true
  }

  /**
   * Builds one preview root group by extracting GPU-resident geometry from layer batches.
   *
   * @param entityIds - Database object ids to include in the preview overlay
   * @returns Preview root group, or `null` when any entity could not be extracted
   */
  createEntityPreviewRoot(entityIds: AcDbObjectId[]): THREE.Group | null {
    const idsByLayer = new Map<AcTrLayer, AcDbObjectId[]>()

    for (const id of entityIds) {
      const layers = this.getLayersByObjectId(id)
      if (layers.length === 0) {
        return null
      }
      for (const layer of layers) {
        let layerIds = idsByLayer.get(layer)
        if (!layerIds) {
          layerIds = []
          idsByLayer.set(layer, layerIds)
        }
        if (!layerIds.includes(id)) {
          layerIds.push(id)
        }
      }
    }

    const previewRoot = new THREE.Group()
    previewRoot.name = 'EntityPreviewRoot'
    for (const [layer, ids] of idsByLayer) {
      const subset = layer.createPreviewSubset(ids)
      if (!subset) {
        disposePreviewSubset(previewRoot)
        return null
      }
      previewRoot.add(subset)
    }

    if (previewRoot.children.length === 0) {
      return null
    }
    return previewRoot
  }

  /**
   * Gets the layer with the specified name from this layout
   * @param name - Layer name
   * @returns - The layer with the specified name in this layout
   */
  getLayer(name: string) {
    return this._layers.get(name)
  }

  /**
   * Adds layer into this layout. If the layer already exist, do nothing.
   *
   * @param name - Input layer name
   * @returns Return added layer or the existing layer in this layout if one layer
   * group already exists in this layout.
   */
  addLayer(info: AcEdLayerInfo) {
    const name = info.name
    let layer = this._layers.get(name)
    if (layer === undefined) {
      layer = new AcTrLayer(info)
      this._layers.set(name, layer)
      this._group.add(layer.internalObject)
    }
    return layer
  }

  /**
   * Updates layer information (such as visibility). If the layer doesn't exist, do nothing.
   * @param info - The layer information
   * @returns Returns the updated layer group.
   */
  updateLayer(info: AcEdLayerInfo) {
    const layer = this._layers.get(info.name)
    if (layer) {
      // TODO: Handle layer name changes
      const wasVisible = layer.visible
      layer.update(info)
      if (wasVisible !== layer.visible) {
        this.invalidateBox()
      }
    }
    return layer
  }

  /**
   * Hover the specified entities.
   * Applies hover highlighting to the entities with the given IDs.
   *
   * @param ids - Array of entity object IDs to hover
   */
  hover(ids: AcDbObjectId[]) {
    ids.forEach(id => {
      const layers = this.getLayersByObjectId(id)
      layers.forEach(layer => layer.hover([id]))
    })
  }

  /**
   * Unhover the specified entities.
   * Removes hover highlighting from the entities with the given IDs.
   *
   * @param ids - Array of entity object IDs to unhover
   */
  unhover(ids: AcDbObjectId[]) {
    ids.forEach(id => {
      const layers = this.getLayersByObjectId(id)
      layers.forEach(layer => layer.unhover([id]))
    })
  }

  /**
   * Select the specified entities.
   * Applies selection highlighting to the entities with the given IDs.
   *
   * @param ids - Array of entity object IDs to select
   */
  select(ids: AcDbObjectId[]) {
    ids.forEach(id => {
      const layers = this.getLayersByObjectId(id)
      layers.forEach(layer => layer.select([id]))
    })
  }

  /**
   * Unselect the specified entities.
   * Removes selection highlighting from the entities with the given IDs.
   *
   * @param ids - Array of entity object IDs to unselect
   */
  unselect(ids: AcDbObjectId[]) {
    ids.forEach(id => {
      const layers = this.getLayersByObjectId(id)
      layers.forEach(layer => layer.unselect([id]))
    })
  }

  /**
   * Search entities intersected or contained in the specified bounding box.
   * Uses the spatial index for efficient querying of entities within the given bounds.
   *
   * @param box - Input the query bounding box (2D or 3D)
   * @returns Return query results containing entity IDs and their bounds
   */
  search(box: AcGeBox2d | AcGeBox3d, options?: AcTrSpatialSearchOptions) {
    return this._spatialIndex.search(
      {
        minX: box.min.x,
        minY: box.min.y,
        maxX: box.max.x,
        maxY: box.max.y
      },
      options
    )
  }

  /**
   * Returns all layers that contain renderable entities associated with
   * the specified AutoCAD object ID.
   *
   * In AutoCAD, an INSERT entity may reference multiple child entities that
   * reside on different layers. During rendering, this engine groups entities
   * by layer and assigns each group the INSERT entity's object ID.
   *
   * As a result, a single object ID (typically from an INSERT entity) may
   * correspond to multiple layers, and this method returns all such layers.
   *
   * @param objectId - The AutoCAD object ID to search for (e.g. an INSERT entity ID)
   * @returns An array of layers containing entities associated with the given object ID;
   *          returns an empty array if no matching layers are found
   */
  private getLayersByObjectId(objectId: AcDbObjectId) {
    const layers = []
    for (const [_, layer] of this._layers) {
      if (layer.hasEntity(objectId)) {
        layers.push(layer)
      }
    }
    return layers
  }

  /**
   * Gets optional child bounding boxes used to build a child-level spatial index
   * for one render entity.
   *
   * Some rendering paths (for example INSERT decomposition across layers) cannot
   * provide a single `AcTrGroup` hierarchy for child indexing. In these cases,
   * precomputed child query items are attached to `entity.userData` and consumed
   * here so snapping and fine-grained spatial queries can still resolve
   * sub-entities correctly.
   *
   * @param entity - The render entity that may carry `spatialIndexChildBoxes` in
   *                 its `userData`.
   * @returns The child query boxes when available and non-empty; otherwise
   *          `undefined`.
   */
  private getSpatialIndexChildBoxes(entity: AcTrEntity) {
    const boxes = (
      entity.userData as {
        spatialIndexChildBoxes?: AcEdSpatialQueryResultItem[]
      }
    ).spatialIndexChildBoxes

    if (!boxes || boxes.length === 0) {
      return undefined
    }

    return boxes
  }

  /**
   * Registers one render entity in the layout spatial index.
   *
   * Inserts a root bounding box for coarse queries and, when child geometry is
   * available, builds a child-level index so snapping and fine-grained spatial
   * queries can resolve sub-entities (for example block references).
   *
   * Root bounds are chosen in this order:
   * 1. Union of {@link getSpatialIndexChildBoxes} when precomputed child boxes
   *    are attached to `entity.userData`.
   * 2. Union of `AcTrGroup.wcsChildBoxes` when the entity is a block group.
   * 3. The entity's own `wcsBbox` as a fallback.
   *
   * Child indexing uses `ensureChildIndex` for userData child boxes (typical of
   * INSERT paths split across layers) or `createChildIndex` for a single
   * `AcTrGroup` hierarchy.
   *
   * @param entity - The render entity to index. Called from
   *                 {@link addEntity} and {@link updateEntity} after layer
   *                 membership is updated.
   */
  private registerEntitySpatialIndex(entity: AcTrEntity) {
    const spatialIndexChildBoxes = this.getSpatialIndexChildBoxes(entity)

    let rootBox: {
      minX: number
      minY: number
      maxX: number
      maxY: number
      id: AcDbObjectId
    }

    if (spatialIndexChildBoxes && spatialIndexChildBoxes.length > 0) {
      const union = unionSpatialQueryItems(spatialIndexChildBoxes)
      rootBox = {
        minX: union.minX,
        minY: union.minY,
        maxX: union.maxX,
        maxY: union.maxY,
        id: entity.objectId
      }
    } else if (
      entity instanceof AcTrGroup &&
      entity.wcsChildBoxes.length > 0
    ) {
      const union = unionSpatialQueryItems(
        entity.wcsChildBoxes.map(box => ({
          minX: box.minX,
          minY: box.minY,
          maxX: box.maxX,
          maxY: box.maxY,
          id: box.id
        }))
      )
      rootBox = {
        minX: union.minX,
        minY: union.minY,
        maxX: union.maxX,
        maxY: union.maxY,
        id: entity.objectId
      }
    } else {
      rootBox = {
        minX: entity.wcsBbox.min.x,
        minY: entity.wcsBbox.min.y,
        maxX: entity.wcsBbox.max.x,
        maxY: entity.wcsBbox.max.y,
        id: entity.objectId
      }
    }

    this._spatialIndex.insert({
      minX: rootBox.minX,
      minY: rootBox.minY,
      maxX: rootBox.maxX,
      maxY: rootBox.maxY,
      id: entity.objectId
    })

    if (
      spatialIndexChildBoxes &&
      spatialIndexChildBoxes.length > 0
    ) {
      entity.wcsBbox.min.set(rootBox.minX, rootBox.minY, entity.wcsBbox.min.z)
      entity.wcsBbox.max.set(rootBox.maxX, rootBox.maxY, entity.wcsBbox.max.z)
    }

    // Some INSERT rendering paths split one block reference into multiple layer
    // groups (AcTrEntity instead of AcTrGroup). Keep child-box index via userData
    // so object snap can still resolve gsMark to sub-entities.
    if (spatialIndexChildBoxes) {
      this._spatialIndex.ensureChildIndex(
        entity.objectId,
        spatialIndexChildBoxes
      )
    } else if (entity instanceof AcTrGroup) {
      // If it is one block group, build spatial index for entities in this block.
      this._spatialIndex.createChildIndex(entity)
    }
  }
}
