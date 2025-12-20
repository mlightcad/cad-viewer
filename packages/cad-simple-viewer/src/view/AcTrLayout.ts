import { AcDbObjectId, AcGeBox2d, AcGeBox3d } from '@mlightcad/data-model'
import { AcTrEntity, AcTrObject } from '@mlightcad/three-renderer'
import RBush from 'rbush'
import * as THREE from 'three'

import { AcEdLayerInfo, AcEdSpatialQueryResultItem } from '../editor'
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
      /** Total geometry memory usage (bytes) */
      geometry: number
      /** Memory used by entity mappings (bytes) */
      mapping: number
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
  private _indexTree: RBush<AcEdSpatialQueryResultItem>
  /** Bounding box containing all entities in this layout */
  private _box: THREE.Box3
  /** Map of layers indexed by layer name */
  private _layers: Map<string, AcTrLayer>
  /** Optional object for displaying snap points */
  private _snapPointsObject?: AcTrObject

  /**
   * Creates a new layout instance.
   * Initializes the layout with empty collections and a spatial index.
   */
  constructor() {
    this._group = new THREE.Group()
    this._indexTree = new RBush()
    this._box = new THREE.Box3()
    this._layers = new Map()
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
   * @returns The layout's bounding box
   */
  get box() {
    return this._box
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
    this._layers.forEach(layer => {
      const stats = layer.stats
      layers.push(stats)
      lineTotalSize +=
        stats.line.indexed.geometrySize + stats.line.nonIndexed.geometrySize
      meshTotalSize +=
        stats.mesh.indexed.geometrySize + stats.mesh.nonIndexed.geometrySize
      pointTotalSize +=
        stats.point.indexed.geometrySize + stats.point.nonIndexed.geometrySize
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
          geometry: totalGeometrySize,
          mapping: totalMappingSize
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
      this._group.remove(layer.internalObject)
    })
    this._layers.clear()
    this._box.makeEmpty()
    this._indexTree.clear()
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

    const box = entity.box
    // For infinitive line such as ray and xline, they are not used to extend box
    if (extendBbox) this._box.union(box)

    this._indexTree.insert({
      minX: box.min.x,
      minY: box.min.y,
      maxX: box.max.x,
      maxY: box.max.y,
      id: entity.objectId
    })

    return this
  }

  /**
   * Remove the specified entity from this layout.
   *
   * @param objectId - Input the object id of the entity to remove
   * @returns Return true if remove the specified entity successfully. Otherwise, return false.
   */
  removeEntity(objectId: AcDbObjectId) {
    for (const [_, layer] of this._layers) {
      if (layer.removeEntity(objectId)) return true
    }
    return false
  }

  /**
   * Update the specified entity in this layout.
   *
   * @param entity - Input the entity to update
   * @returns Return true if update the specified entity successfully. Otherwise, return false.
   */
  updateEntity(entity: AcTrEntity) {
    for (const [_, layer] of this._layers) {
      if (layer.updateEntity(entity)) return true
    }
    return false
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
      layer.update(info)
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
      layers.forEach(layer => layer.unselect([id]))
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
   * Sets the snap points object for this layout.
   * Replaces any existing snap points object with the new one.
   *
   * @param object - The snap points object to display
   */
  setSnapObject(object: AcTrObject) {
    if (this._snapPointsObject) {
      this._group.remove(this._snapPointsObject)
    }
    this._snapPointsObject = object
    this._group.add(object)
  }

  /**
   * Search entities intersected or contained in the specified bounding box.
   * Uses the spatial index for efficient querying of entities within the given bounds.
   *
   * @param box - Input the query bounding box (2D or 3D)
   * @returns Return query results containing entity IDs and their bounds
   */
  search(box: AcGeBox2d | AcGeBox3d) {
    const results = this._indexTree.search({
      minX: box.min.x,
      minY: box.min.y,
      maxX: box.max.x,
      maxY: box.max.y
    })
    return results
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
}
