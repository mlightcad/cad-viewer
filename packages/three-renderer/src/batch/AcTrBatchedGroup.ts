import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import {
  batchOriginOffsetDistance,
  canMergeIntoBatchOrigin
} from '../draw/AcTrBatchDrawPolicy'
import { AcTrPointSymbolCreator } from '../geometry/AcTrPointSymbolCreator'
import { AcTrEntity } from '../object'
import { getMaterialMetadata } from '../style/AcTrMaterialMetadata'
import { AcTrStyleManager } from '../style/AcTrStyleManager'
import { AcTrBufferGeometryUtil, AcTrMaterialUtil } from '../util'
import {
  type AcTrHighlightOverlayGroup,
  copyHighlightObjectFlags,
  getHighlightUserData,
  getSceneDrawableUserData,
  markHighlightOverlayGroup
} from '../util/AcTrObjectUserData'
import { isObjectHierarchyVisible } from '../util/AcTrVisibility'
import { AcTrBatchGeometryUserData } from './AcTrBatchedGeometryInfo'
import { AcTrBatchedLine } from './AcTrBatchedLine'
import { AcTrBatchedLine2 } from './AcTrBatchedLine2'
import { AcTrBatchedMesh } from './AcTrBatchedMesh'
import { AcTrBatchedPoint } from './AcTrBatchedPoint'

/**
 * Union of batch container classes resolved by {@link THREE.Object3D.getObjectById}
 * when {@link AcTrBatchedGroup} performs entity-level operations.
 *
 * Covers line, wide-line, and mesh render paths. Each container packs many
 * entity geometries into shared GPU buffers and exposes per-slot APIs such as
 * {@link AcTrBatchedLine.setVisibleAt | setVisibleAt},
 * {@link AcTrBatchedLine.deleteGeometry | deleteGeometry}, and
 * {@link AcTrBatchedLine.intersectWith | intersectWith}.
 *
 * Point batches ({@link AcTrBatchedPoint}) use the same slot-addressing model but
 * are typed separately where the group needs point-specific behavior.
 *
 * @see {@link AcTrOriginBatch} for the superset used in internal batch maps.
 */
export type AcTrBatchedObject =
  | AcTrBatchedLine
  | AcTrBatchedLine2
  | AcTrBatchedMesh

/**
 * Any batch container stored in an origin-split batch map inside
 * {@link AcTrBatchedGroup}.
 *
 * Extends {@link AcTrBatchedObject} with {@link AcTrBatchedPoint}, which renders
 * CAD point entities as `THREE.Points`. All variants share a stable world-space
 * {@link AcTrBatchedLine.origin | origin} so vertex data can be rebased for
 * float32 precision on large-coordinate drawings.
 */
type AcTrOriginBatch =
  | AcTrBatchedLine
  | AcTrBatchedLine2
  | AcTrBatchedMesh
  | AcTrBatchedPoint

/**
 * Material-keyed registry of batch containers that may be split by world origin.
 *
 * - **Key** — Three.js material id (`Material.id`). Geometries with the same
 *   material are candidates for the same draw call.
 * - **Value** — One or more batch containers for that material. When geometry
 *   from distant world regions cannot safely share one rebasing origin, the group
 *   creates additional containers via {@link AcTrBatchedGroup.resolveOriginBatch}.
 *
 * @typeParam T - Concrete batch container type (line, mesh, point, etc.).
 */
type AcTrOriginBatchMap<T extends AcTrOriginBatch> = Map<number, T[]>

/**
 * Reverse lookup from one logical CAD entity to a single geometry slot inside a
 * batched container.
 *
 * A decomposed entity (for example an INSERT or multi-pass layer bucket) may
 * occupy several slots; {@link AcTrBatchedGroup} stores an array of these entries
 * per entity object id in `_entitiesMap`.
 */
export interface AcTrEntityInBatchedObject {
  /**
   * Three.js object id (`Object3D.id`) of the batched container that owns the slot.
   *
   * Used with {@link THREE.Object3D.getObjectById} to retrieve the container
   * before calling per-slot batch APIs.
   */
  batchedObjectId: number
  /**
   * Stable geometry slot id assigned by the batch container when the entity
   * geometry was appended.
   *
   * Identifies the sub-range inside the packed buffer for visibility toggles,
   * deletion, raycast filtering, and highlight cloning.
   */
  batchId: number
}

export interface AcTrGeometrySize {
  /** Number of batch containers in this category. */
  count: number
  /** Estimated GPU geometry memory in bytes. */
  geometrySize: number
  /** Estimated CPU-side mapping metadata size in bytes. */
  mappingSize: number
}

export interface AcTrGeometryInfo {
  /** Statistics for indexed geometry containers. */
  indexed: AcTrGeometrySize
  /** Statistics for non-indexed geometry containers. */
  nonIndexed: AcTrGeometrySize
}

export interface AcTrUnbatchedGroupStats {
  /** Number of unbatched render objects. */
  count: number
  /** Estimated geometry memory of unbatched objects in bytes. */
  geometrySize: number
  byType: {
    /** Count of line-like unbatched objects. */
    line: number
    /** Count of mesh unbatched objects. */
    mesh: number
    /** Count of point unbatched objects. */
    point: number
    /** Count of other unbatched objects. */
    other: number
  }
}

export interface AcTrBatchedGroupStats {
  summary: {
    /** Total number of entities currently tracked by this group. */
    entityCount: number
    /** Total estimated geometry memory in bytes (batched + unbatched). */
    totalGeometrySize: number
    /** Total estimated metadata mapping memory in bytes. */
    totalMappingSize: number
  }
  /** Mesh batch statistics. */
  mesh: AcTrGeometryInfo
  /** Line batch statistics. */
  line: AcTrGeometryInfo
  /** Point batch statistics. */
  point: AcTrGeometryInfo
  /** Unbatched object statistics. */
  unbatched: AcTrUnbatchedGroupStats
}

/**
 * Options for {@link AcTrBatchedGroup.createPreviewSubset}.
 */
export interface AcTrPreviewSubsetOptions {
  /** Preview line style. Dashed rendering is best-effort in phase 1. */
  style?: 'normal' | 'dashed'
  /** Maximum number of drawable slots to extract. */
  maxSlots?: number
}

/**
 * Aggregates and manages all batched render objects belonging to one CAD
 * layer/layout group.
 *
 * Entities are distributed into per-material batch containers (line/mesh/point
 * and wide-line variants). Multiple containers may share one material when their
 * world-space origins are too far apart for safe float32 rebasing. Unsupported
 * render paths are stored in a dedicated unbatched group.
 */
export class AcTrBatchedGroup extends THREE.Group {
  private static readonly INITIAL_LINE_VERTEX_CAPACITY = 128
  private static readonly INITIAL_LINE_INDEX_CAPACITY = 256
  private static readonly INITIAL_MESH_VERTEX_CAPACITY = 128
  private static readonly INITIAL_MESH_INDEX_CAPACITY = 256
  private static readonly INITIAL_POINT_VERTEX_CAPACITY = 16
  /**
   * Batched line map for line segments without vertex index.
   * - the key is material id
   * - the value is one or more batched lines split by world origin
   */
  private _lineBatches: AcTrOriginBatchMap<AcTrBatchedLine>
  /**
   * Batched line map for lines with vertex index.
   * - the key is material id
   * - the value is one or more batched lines split by world origin
   */
  private _lineWithIndexBatches: AcTrOriginBatchMap<AcTrBatchedLine>
  /**
   * Batched line map for wide lines rendered as THREE.LineSegments2.
   * - the key is material id
   * - the value is one or more batched line2 containers split by world origin
   */
  private _line2Batches: AcTrOriginBatchMap<AcTrBatchedLine2>
  /**
   * Batched mesh map for meshes without vertex index.
   * - the key is material id
   * - the value is one or more batched meshes split by world origin
   */
  private _meshBatches: AcTrOriginBatchMap<AcTrBatchedMesh>
  /**
   * Batched mesh map for meshes with vertex index.
   * - the key is material id
   * - the value is one or more batched meshes split by world origin
   */
  private _meshWithIndexBatches: AcTrOriginBatchMap<AcTrBatchedMesh>
  /**
   * Batched mesh map for points rendered as THREE.Points
   * - the key is material id
   * - the value is one or more batched point containers split by world origin
   */
  private _pointBatches: AcTrOriginBatchMap<AcTrBatchedPoint>
  /**
   * Batched mesh map for points rendered as THREE.LineSegments
   * - the key is material id
   * - the value is one or more batched lines split by world origin
   */
  private _pointSymbolBatches: AcTrOriginBatchMap<AcTrBatchedLine>
  /**
   * The group to store all of selected entities
   */
  private _selectedObjects: AcTrHighlightOverlayGroup
  /**
   * The group to store all of entities hovering on them
   */
  private _hoverObjects: AcTrHighlightOverlayGroup
  /**
   * Non-batched objects (for render paths that cannot be merged, e.g. fat lines).
   */
  private _unbatchedObjects: THREE.Group
  /** Per-entity list of unbatched cloned objects, allocated lazily. */
  private _unbatchedEntities: Map<string, THREE.Object3D[]>
  /**
   * All entities added in this group.
   * - The key is object id of the entity
   * - The value is the entity's position information in the batched objects
   */
  private _entitiesMap: Map<string, AcTrEntityInBatchedObject[]>

  /**
   * Creates an empty batched group with highlight and unbatched child containers.
   */
  constructor() {
    super()
    this._pointBatches = new Map()
    this._pointSymbolBatches = new Map()
    this._lineBatches = new Map()
    this._lineWithIndexBatches = new Map()
    this._line2Batches = new Map()
    this._meshBatches = new Map()
    this._meshWithIndexBatches = new Map()
    this._entitiesMap = new Map()
    this._unbatchedEntities = new Map()
    this._unbatchedObjects = new THREE.Group()
    this._selectedObjects = markHighlightOverlayGroup(new THREE.Group())
    this._hoverObjects = markHighlightOverlayGroup(new THREE.Group())
    this.add(this._unbatchedObjects)
    this.add(this._selectedObjects)
    this.add(this._hoverObjects)
  }

  /**
   * The number of entities stored in this batched group
   */
  get entityCount() {
    return this._entitiesMap.size
  }

  /**
   * The statistics data of this batched group
   */
  get stats() {
    const unbatched = this.getUnbatchedStats()
    const stats: AcTrBatchedGroupStats = {
      summary: {
        entityCount: this._entitiesMap.size,
        totalGeometrySize: 0,
        totalMappingSize: 0
      },
      mesh: {
        indexed: {
          count: this.countBatchContainers(this._meshWithIndexBatches),
          geometrySize: this.getBatchedGeometrySize(this._meshWithIndexBatches),
          mappingSize: this.getBatchedGeometryMappingSize(
            this._meshWithIndexBatches
          )
        },
        nonIndexed: {
          count: this.countBatchContainers(this._meshBatches),
          geometrySize: this.getBatchedGeometrySize(this._meshBatches),
          mappingSize: this.getBatchedGeometryMappingSize(this._meshBatches)
        }
      },
      line: {
        indexed: {
          count: this.countBatchContainers(this._lineWithIndexBatches),
          geometrySize: this.getBatchedGeometrySize(this._lineWithIndexBatches),
          mappingSize: this.getBatchedGeometryMappingSize(
            this._lineWithIndexBatches
          )
        },
        nonIndexed: {
          count:
            this.countBatchContainers(this._lineBatches) +
            this.countBatchContainers(this._line2Batches),
          geometrySize:
            this.getBatchedGeometrySize(this._lineBatches) +
            this.getBatchedGeometrySize(this._line2Batches),
          mappingSize:
            this.getBatchedGeometryMappingSize(this._lineBatches) +
            this.getBatchedGeometryMappingSize(this._line2Batches)
        }
      },
      point: {
        indexed: {
          count: this.countBatchContainers(this._pointSymbolBatches),
          geometrySize: this.getBatchedGeometrySize(this._pointSymbolBatches),
          mappingSize: this.getBatchedGeometryMappingSize(
            this._pointSymbolBatches
          )
        },
        nonIndexed: {
          count: this.countBatchContainers(this._pointBatches),
          geometrySize: this.getBatchedGeometrySize(this._pointBatches),
          mappingSize: this.getBatchedGeometryMappingSize(this._pointBatches)
        }
      },
      unbatched
    }
    stats.summary.totalGeometrySize =
      stats.line.indexed.geometrySize +
      stats.line.nonIndexed.geometrySize +
      stats.mesh.indexed.geometrySize +
      stats.mesh.nonIndexed.geometrySize +
      stats.point.indexed.geometrySize +
      stats.point.nonIndexed.geometrySize +
      stats.unbatched.geometrySize
    stats.summary.totalMappingSize =
      stats.line.indexed.mappingSize +
      stats.line.nonIndexed.mappingSize +
      stats.mesh.indexed.mappingSize +
      stats.mesh.nonIndexed.mappingSize +
      stats.point.indexed.mappingSize +
      stats.point.nonIndexed.mappingSize
    return stats
  }

  /**
   * Rebuilds point-symbol batches for a new point display mode.
   */
  rerenderPoints(displayMode: number) {
    const creator = AcTrPointSymbolCreator.instance
    const pointSymbol = creator.create(displayMode)

    if (pointSymbol.line) {
      this._pointSymbolBatches.forEach(batches => {
        batches.forEach(item => {
          item.resetGeometry(displayMode)
        })
      })
    }

    const isShowPoint = pointSymbol.point != null
    this._pointBatches.forEach(batches => {
      batches.forEach(item => {
        item.visible = isShowPoint
      })
    })
  }

  /**
   * Computes axis-aligned bounds from packed batch vertex data and visible
   * unbatched drawables. Prefer this over entity-level bounding boxes when
   * framing the view — it reflects what is actually rendered in GPU buffers.
   */
  computeBoundingBox(
    target = new THREE.Box3(),
    options?: { excludeObjectIds?: ReadonlySet<string> }
  ) {
    target.makeEmpty()
    const scratch = new THREE.Box3()

    const unionBatchMap = (map: AcTrOriginBatchMap<AcTrOriginBatch>) => {
      map.forEach(batches => {
        batches.forEach(batch => {
          batch.unionActiveVisibleBoundingBoxInto(target, options)
        })
      })
    }

    unionBatchMap(this._lineBatches)
    unionBatchMap(this._lineWithIndexBatches)
    unionBatchMap(this._line2Batches)
    unionBatchMap(this._meshBatches)
    unionBatchMap(this._meshWithIndexBatches)
    unionBatchMap(this._pointBatches)
    unionBatchMap(this._pointSymbolBatches)

    this._unbatchedEntities.forEach((objects, objectId) => {
      if (options?.excludeObjectIds?.has(objectId)) {
        return
      }
      for (const child of objects) {
        if (child.visible === false) continue
        this.unionUnbatchedObjectBounds(child, target, scratch)
      }
    })

    return target
  }

  /**
   * Clears all batched/unbatched data and disposes owned resources.
   */
  clear() {
    this.groups.forEach(group => {
      group.forEach(batches => {
        batches.forEach(batch => {
          batch.dispose()
          batch.removeFromParent()
        })
      })
      group.clear()
    })
    this.clearHighlightGroup(this._selectedObjects)
    this.clearHighlightGroup(this._hoverObjects)
    this._unbatchedObjects.children.forEach(object => {
      this.disposeObject(object)
    })
    this._unbatchedObjects.clear()
    this._unbatchedEntities.clear()
    this._entitiesMap.clear()
    return this
  }

  /**
   * Update material of batch objects
   * @param oldId - Id of the old material associated with batch objects
   * @param material - The new material associated with the batch object
   */
  updateMaterial(oldId: number, material: THREE.Material) {
    for (const group of this.groups) {
      const batches = group.get(oldId)
      if (!batches) {
        continue
      }
      for (const batch of batches) {
        batch.material = material
      }
      if (material.id !== oldId) {
        group.delete(oldId)
        const existing = group.get(material.id)
        if (existing) {
          existing.push(...batches)
        } else {
          group.set(material.id, batches)
        }
      }
    }
    this._unbatchedObjects.traverse(object => {
      if (!('material' in object)) return
      const drawableUserData = getSceneDrawableUserData(object)
      if (drawableUserData.styleMaterialId === oldId) {
        object.material = material
        drawableUserData.styleMaterialId = material.id
      }
    })
  }

  /**
   * Return true if this group contains the entity with the specified object id. Otherwise, return false.
   * @param objectId Input the object id of one entity
   * @returns Return true if this group contains the entity with the specified object id. Otherwise,
   * return false.
   */
  hasEntity(objectId: string) {
    return (
      this._entitiesMap.has(objectId) || this._unbatchedEntities.has(objectId)
    )
  }

  /**
   * Updates visibility for one entity without removing it from batch containers.
   *
   * @param objectId - Entity object id.
   * @param visible - Desired visibility state.
   * @returns `true` when the entity exists in this group.
   */
  setEntityVisible(objectId: string, visible: boolean) {
    const entityInfo = this._entitiesMap.get(objectId)
    const unbatchedObjects = this._unbatchedEntities.get(objectId)
    if (!entityInfo && !unbatchedObjects) {
      return false
    }

    entityInfo?.forEach(item => {
      const batchedObject = this.getObjectById(
        item.batchedObjectId
      ) as AcTrBatchedObject
      batchedObject?.setVisibleAt(item.batchId, visible)
    })

    unbatchedObjects?.forEach(object => {
      object.visible = visible
    })

    if (!visible) {
      this.unhighlight(objectId, this._selectedObjects)
      this.unhighlight(objectId, this._hoverObjects)
    }

    return true
  }

  /**
   * Returns the current scene visibility for one entity, or `undefined` when
   * the entity is not present in this group.
   */
  getEntityVisible(objectId: string): boolean | undefined {
    const entityInfo = this._entitiesMap.get(objectId)
    const unbatchedObjects = this._unbatchedEntities.get(objectId)
    if (!entityInfo && !unbatchedObjects) {
      return undefined
    }

    let visible: boolean | undefined

    if (entityInfo && entityInfo.length > 0) {
      visible = entityInfo.every(item => this.getBatchItemVisible(item))
    }

    if (unbatchedObjects && unbatchedObjects.length > 0) {
      const unbatchedVisible = unbatchedObjects.some(object => object.visible)
      visible =
        visible === undefined ? unbatchedVisible : visible && unbatchedVisible
    }

    return visible
  }

  /**
   * Adds one converted entity into batch/unbatched containers.
   */
  addEntity(entity: AcTrEntity) {
    // Skip invisible entities on initial insert so invisible DWG/DXF content does
    // not allocate batch memory. Runtime visibility toggles use setEntityVisible.
    if (entity.visible === false) {
      return
    }

    const objectId = entity.objectId
    const entityVisible = entity.visible
    // One logical entity (same objectId) can be appended in multiple passes
    // (e.g. INSERT decomposition by source layer and inherited layer-0 bucket).
    // Keep accumulating geometry mappings instead of overwriting previous ones.
    let entityInfo = this._entitiesMap.get(objectId)
    if (!entityInfo) {
      entityInfo = []
      this._entitiesMap.set(objectId, entityInfo)
    }

    const existingUnbatched = this._unbatchedEntities.get(objectId)
    const unbatchedObjects: THREE.Object3D[] = existingUnbatched ?? []
    let hasUnbatched = false
    const styleManager = entity.styleManager

    entity.updateMatrixWorld(true)
    const visitDrawable = (object: THREE.Object3D) => {
      // traverse() visits descendants even when an intermediate AcTrEntity is invisible.
      if (!isObjectHierarchyVisible(object)) {
        return
      }

      const drawableUserData = getSceneDrawableUserData(object)
      const bboxIntersectionCheck = !!drawableUserData.bboxIntersectionCheck

      if (drawableUserData.noBatch) {
        const cloned = this.cloneUnbatchedObject(object)
        cloned.visible = entityVisible && object.visible
        getSceneDrawableUserData(cloned).bboxIntersectionCheck =
          bboxIntersectionCheck
        this._unbatchedObjects.add(cloned)
        unbatchedObjects.push(cloned)
        hasUnbatched = true
        return
      }

      if (object instanceof LineSegments2) {
        const item = this.addLine2(object, {
          objectId,
          bboxIntersectionCheck: bboxIntersectionCheck
        })
        if (item) {
          entityInfo.push(item)
          this.applyBatchSlotVisibility(item, entityVisible && object.visible)
        }
        return
      }

      if (object instanceof THREE.LineSegments) {
        const item = this.addLine(object, {
          position: drawableUserData.position,
          objectId,
          bboxIntersectionCheck: bboxIntersectionCheck
        })
        if (item) {
          entityInfo.push(item)
          this.applyBatchSlotVisibility(item, entityVisible && object.visible)
        }
      } else if (object instanceof THREE.Mesh) {
        const item = this.addMesh(
          object,
          {
            objectId,
            bboxIntersectionCheck: bboxIntersectionCheck
          },
          styleManager
        )
        if (item) {
          entityInfo.push(item)
          this.applyBatchSlotVisibility(item, entityVisible && object.visible)
        }
      } else if (object instanceof THREE.Points) {
        const item = this.addPoint(object, {
          objectId,
          bboxIntersectionCheck: bboxIntersectionCheck
        })
        if (item) {
          entityInfo.push(item)
          this.applyBatchSlotVisibility(item, entityVisible && object.visible)
        }
      }

      for (const child of object.children) {
        visitDrawable(child)
      }
    }
    visitDrawable(entity)

    if (hasUnbatched) {
      this._unbatchedEntities.set(objectId, unbatchedObjects)
    }
  }

  /**
   * Removes one entity from batch/unbatched containers.
   */
  removeEntity(objectId: string) {
    let result = false
    const entityInfo = this._entitiesMap.get(objectId)
    if (entityInfo) {
      const batchedObjects = new Map<number, AcTrBatchedObject>()
      for (let index = 0, len = entityInfo.length; index < len; index++) {
        const item = entityInfo[index]
        const batchedObject = this.getObjectById(
          item.batchedObjectId
        ) as AcTrBatchedObject
        if (batchedObject) {
          batchedObject.deleteGeometry(item.batchId)
          batchedObjects.set(item.batchedObjectId, batchedObject)
          result = true
        }
      }
      batchedObjects.forEach(batchedObject => batchedObject.optimize())
      this.unhighlight(objectId, this._selectedObjects)
      this._entitiesMap.delete(objectId)
    }
    const unbatchedObjects = this._unbatchedEntities.get(objectId)
    if (unbatchedObjects) {
      this.unhighlight(objectId, this._selectedObjects)
      this.unhighlight(objectId, this._hoverObjects)
      unbatchedObjects.forEach(object => {
        this.disposeObject(object)
        this._unbatchedObjects.remove(object)
      })
      this._unbatchedEntities.delete(objectId)
      result = true
    }
    return result
  }

  /**
   * Return true if the object with the specified object id is intersected with the ray by using raycast.
   * @param objectId  Input object id of object to check for intersection with the ray.
   * @param raycaster Input raycaster to check intersection
   */
  isIntersectWith(objectId: string, raycaster: THREE.Raycaster) {
    const result = false
    const entityInfo = this._entitiesMap.get(objectId)
    if (entityInfo) {
      const intersects: THREE.Intersection[] = []
      for (let index = 0, len = entityInfo.length; index < len; index++) {
        const item = entityInfo[index]
        const batchedObject = this.getObjectById(
          item.batchedObjectId
        ) as AcTrBatchedObject
        if (batchedObject) {
          batchedObject.intersectWith(item.batchId, raycaster, intersects)
          if (intersects.length > 0) return true
        }
      }
    }
    const unbatchedObjects = this._unbatchedEntities.get(objectId)
    if (unbatchedObjects) {
      for (let i = 0; i < unbatchedObjects.length; i++) {
        if (
          this.isUnbatchedDrawableIntersecting(unbatchedObjects[i], raycaster)
        ) {
          return true
        }
      }
    }
    return result
  }

  /**
   * Adds hover highlight for one entity id.
   */
  hover(objectId: string) {
    this.highlight(objectId, this._hoverObjects)
  }

  /**
   * Removes hover highlight for one entity id.
   */
  unhover(objectId: string) {
    this.unhighlight(objectId, this._hoverObjects)
  }

  /**
   * Adds selection highlight for one entity id.
   */
  select(objectId: string) {
    this.highlight(objectId, this._selectedObjects)
  }

  /**
   * Removes selection highlight for one entity id.
   */
  unselect(objectId: string) {
    this.unhighlight(objectId, this._selectedObjects)
  }

  /**
   * Builds a standalone preview subset for the specified entity ids.
   *
   * Extracts batched slots via {@link AcTrBatchedLine.getObjectAt} and clones
   * unbatched drawables without re-running entity conversion.
   *
   * @param entityIds - Database object ids to include in the preview subset.
   * @param options - Optional preview style and slot limits.
   * @returns A group containing preview drawables, or `null` when nothing matched.
   */
  createPreviewSubset(
    entityIds: string[],
    options?: AcTrPreviewSubsetOptions
  ): THREE.Group | null {
    if (entityIds.length === 0) {
      return null
    }

    const maxSlots = options?.maxSlots ?? 10000
    const container = new THREE.Group()
    container.name = 'PreviewSubset'
    container.userData.previewSubsetGroup = true

    let slotCount = 0
    for (const objectId of entityIds) {
      if (slotCount >= maxSlots) {
        disposePreviewSubset(container)
        return null
      }
      const added = this.appendEntityOverlayDrawables(objectId, container, {
        maxSlots: maxSlots - slotCount,
        mode: 'preview',
        previewStyle: options?.style ?? 'normal'
      })
      if (added === 0) {
        disposePreviewSubset(container)
        return null
      }
      slotCount += added
    }

    return container
  }

  /**
   * Returns all batch maps managed by this group.
   */
  protected get groups(): AcTrOriginBatchMap<AcTrOriginBatch>[] {
    return [
      this._lineBatches,
      this._lineWithIndexBatches,
      this._line2Batches,
      this._meshBatches,
      this._meshWithIndexBatches,
      this._pointBatches,
      this._pointSymbolBatches
    ]
  }

  /**
   * Creates highlight draw objects for one entity id.
   */
  protected highlight(objectId: string, containerGroup: THREE.Group) {
    this.appendEntityOverlayDrawables(objectId, containerGroup, {
      maxSlots: 1000,
      mode: 'highlight'
    })
  }

  /**
   * Appends batched or unbatched drawables for one entity into an overlay group.
   *
   * @param objectId - Database object id whose drawables should be extracted
   * @param containerGroup - Overlay group receiving cloned or extracted drawables
   * @param options - Slot limit, overlay mode, and optional preview style
   * @returns Number of drawables appended
   */
  private appendEntityOverlayDrawables(
    objectId: string,
    containerGroup: THREE.Group,
    options: {
      maxSlots: number
      mode: 'highlight' | 'preview'
      previewStyle?: 'normal' | 'dashed'
    }
  ): number {
    let added = 0
    const entityInfo = this._entitiesMap.get(objectId)
    if (entityInfo && added < options.maxSlots) {
      const limit = Math.min(entityInfo.length, options.maxSlots)
      for (let index = 0; index < limit; index++) {
        const item = entityInfo[index]
        const batchedObject = this.getObjectById(item.batchedObjectId) as
          | AcTrOriginBatch
          | undefined
        if (!batchedObject || !this.hasBatchObjectAt(batchedObject)) {
          continue
        }

        const object = batchedObject.getObjectAt(item.batchId)
        this.copyHighlightMetadata(batchedObject, object)
        if (options.mode === 'highlight') {
          this.applyHighlightMaterial(object)
        } else {
          this.applyPreviewMaterial(object, options.previewStyle ?? 'normal')
        }

        const overlayUserData = getHighlightUserData(object)
        overlayUserData.objectId = objectId
        overlayUserData.disposeGeometryOnRemove =
          batchedObject instanceof AcTrBatchedLine2
        overlayUserData.previewDrawable = options.mode === 'preview'
        containerGroup.add(object)
        added++
      }
    }

    const unbatchedObjects = this._unbatchedEntities.get(objectId)
    if (unbatchedObjects && added < options.maxSlots) {
      const limit = Math.min(unbatchedObjects.length, options.maxSlots - added)
      for (let index = 0; index < limit; index++) {
        const obj = unbatchedObjects[index]
        const overlayObj = obj.clone()
        this.copyHighlightMetadata(obj, overlayObj)
        if (options.mode === 'highlight') {
          this.applyHighlightMaterial(overlayObj)
        } else {
          this.applyPreviewMaterial(overlayObj, options.previewStyle ?? 'normal')
        }

        const overlayUserData = getHighlightUserData(overlayObj)
        overlayUserData.objectId = objectId
        overlayUserData.previewDrawable = options.mode === 'preview'
        containerGroup.add(overlayObj)
        added++
      }
    }

    return added
  }

  /**
   * Returns true when a batch container exposes per-slot object extraction.
   *
   * @param batchedObject - Batch container candidate for drawable extraction
   */
  private hasBatchObjectAt(
    batchedObject: AcTrOriginBatch
  ): batchedObject is AcTrOriginBatch & {
    getObjectAt(batchId: number): THREE.Object3D
  } {
    return typeof batchedObject.getObjectAt === 'function'
  }

  /**
   * Clones materials for preview drawables without applying highlight tint.
   *
   * @param object - Drawable node or subtree root to receive cloned materials
   * @param _style - Reserved preview line style; dashed rendering is best-effort
   */
  private applyPreviewMaterial(
    object: THREE.Object3D,
    _style: 'normal' | 'dashed'
  ) {
    if (this.hasMaterial(object)) {
      object.material = AcTrMaterialUtil.cloneMaterial(object.material)
    }

    object.children.forEach(child => this.applyPreviewMaterial(child, _style))
  }

  /**
   * Recursively clones and recolors materials on a highlight object subtree.
   */
  private applyHighlightMaterial(object: THREE.Object3D) {
    if (this.hasMaterial(object)) {
      const clonedMaterial = AcTrMaterialUtil.cloneMaterial(object.material)
      AcTrMaterialUtil.setMaterialColor(clonedMaterial)
      object.material = clonedMaterial
    }

    object.children.forEach(child => this.applyHighlightMaterial(child))
  }

  /**
   * Copies highlight-related user-data flags from source to target object.
   */
  private copyHighlightMetadata(
    source: THREE.Object3D,
    target: THREE.Object3D
  ) {
    copyHighlightObjectFlags(source, target)
  }

  /**
   * Removes and disposes highlight objects for one entity id.
   */
  protected unhighlight(objectId: string, containerGroup: THREE.Group) {
    const objects: THREE.Object3D[] = []
    containerGroup.children.forEach(obj => {
      if (getHighlightUserData(obj).objectId === objectId) objects.push(obj)
    })
    objects.forEach(obj => this.disposeHighlightObject(obj))
    containerGroup.remove(...objects)
  }

  /**
   * Applies entity-level visibility to one batched geometry slot.
   *
   * Batched geometry defaults to visible; DXF group code 60 and AcDbEntity
   * visibility must be reflected per slot so invisible entities are not drawn.
   */
  private applyBatchSlotVisibility(
    item: AcTrEntityInBatchedObject,
    visible: boolean
  ) {
    const batchedObject = this.getObjectById(item.batchedObjectId) as
      | AcTrBatchedObject
      | undefined
    batchedObject?.setVisibleAt(item.batchId, visible)
  }

  /**
   * Returns visibility state for one batched geometry slot.
   */
  private getBatchItemVisible(item: AcTrEntityInBatchedObject): boolean {
    const batchedObject = this.getObjectById(item.batchedObjectId) as
      | (AcTrBatchedObject & { getVisibleAt(geometryId: number): boolean })
      | AcTrBatchedPoint
      | undefined
    return batchedObject?.getVisibleAt(item.batchId) ?? false
  }

  /**
   * Adds one `THREE.LineSegments` object into matching line batch.
   */
  private addLine(
    object: THREE.LineSegments,
    userData: AcTrBatchGeometryUserData
  ): AcTrEntityInBatchedObject | null {
    const material = object.material as THREE.Material
    const batches = this.getMatchedLineBatches(object)
    const worldOffset = new THREE.Vector3().setFromMatrixPosition(
      object.matrixWorld
    )
    const batchedLine = this.resolveOriginBatch(
      batches,
      material.id,
      worldOffset,
      () =>
        new AcTrBatchedLine(
          AcTrBatchedGroup.INITIAL_LINE_VERTEX_CAPACITY,
          AcTrBatchedGroup.INITIAL_LINE_INDEX_CAPACITY,
          material
        )
    )

    // Bake rotation/scale into geometry, but keep world translation as offset.
    // This preserves block reference transforms while avoiding large Float32 coords.
    const geometry = object.geometry.clone()
    const matrixNoTranslation = object.matrixWorld.clone()
    matrixNoTranslation.setPosition(0, 0, 0)
    if (
      !AcTrBufferGeometryUtil.safeApplyMatrix4(geometry, matrixNoTranslation, 2)
    ) {
      geometry.dispose()
      return null
    }
    const geometryId = batchedLine.addGeometry(geometry, -1, -1, worldOffset)
    batchedLine.setGeometryInfo(geometryId, userData)
    geometry.dispose()

    return {
      batchedObjectId: batchedLine.id,
      batchId: geometryId
    }
  }

  /**
   * Adds one `LineSegments2` object into wide-line batch.
   */
  private addLine2(
    object: LineSegments2,
    userData: AcTrBatchGeometryUserData
  ): AcTrEntityInBatchedObject | null {
    const material = object.material as THREE.Material
    const worldOffset = new THREE.Vector3().setFromMatrixPosition(
      object.matrixWorld
    )
    const batchedLine = this.resolveOriginBatch(
      this._line2Batches,
      material.id,
      worldOffset,
      () =>
        new AcTrBatchedLine2(
          AcTrBatchedGroup.INITIAL_LINE_VERTEX_CAPACITY,
          material
        )
    )

    const matrixNoTranslation = object.matrixWorld.clone()
    matrixNoTranslation.setPosition(0, 0, 0)
    const geometry = this.cloneLineSegments2Geometry(
      object,
      matrixNoTranslation
    )
    if (!geometry) {
      return null
    }
    const geometryId = batchedLine.addGeometry(geometry, -1, worldOffset)
    batchedLine.setGeometryInfo(geometryId, userData)
    geometry.dispose()

    return {
      batchedObjectId: batchedLine.id,
      batchId: geometryId
    }
  }

  /**
   * Adds one `THREE.Mesh` object into matching mesh batch.
   *
   * When the mesh's world transform has a negative determinant (mirrored
   * block reference), the triangle winding is reversed and `FrontSide`
   * culling would discard the fill.  In that case we swap to a
   * `BackSide` variant of the same material — zero fillrate overhead,
   * and the mesh lands in a separate batch keyed by the variant's id.
   *
   * Lines and points are unaffected by face culling and do not need
   * this treatment.
   *
   * **Static-transform assumption:** this check runs once when the mesh
   * enters the batch.  If a future feature mutates transforms after
   * batching (live edit, animation), this check will not re-run.
   */
  private addMesh(
    object: THREE.Mesh,
    userData: AcTrBatchGeometryUserData,
    styleManager: AcTrStyleManager
  ): AcTrEntityInBatchedObject | null {
    let material = object.material as THREE.Material

    // Detect mirrored transforms: a negative determinant means the
    // transform reversed triangle winding (odd number of negative scale
    // factors).  Swap to BackSide so the culler keeps these triangles.
    // det === 0 is a singular (collapsed) matrix — nothing renders, skip.
    if (object.matrixWorld.determinant() < 0) {
      material = styleManager.getBackSideVariant(material)
      object.material = material
    }

    const batches = this.getMatchedMeshBatches(object)
    const worldOffset = new THREE.Vector3().setFromMatrixPosition(
      object.matrixWorld
    )
    const batchedMesh = this.resolveOriginBatch(
      batches,
      material.id,
      worldOffset,
      () => {
        const metadata = getMaterialMetadata(material)
        const drawOrder = metadata.drawOrder ?? 0
        const batch = new AcTrBatchedMesh(
          AcTrBatchedGroup.INITIAL_MESH_VERTEX_CAPACITY,
          AcTrBatchedGroup.INITIAL_MESH_INDEX_CAPACITY,
          material
        )
        // All CAD geometry lives on the same Z plane, so depth test alone
        // cannot decide which primitive wins on a shared pixel. Use the
        // material's explicit draw-order tier, derived from
        // `AcGiSubEntityTraits.drawOrder`, so hatch fills sit below
        // linework while wide polylines and text glyph meshes stay at the
        // normal linework tier.
        batch.renderOrder = drawOrder
        return batch
      }
    )
    const geometry = object.geometry.clone()
    const matrixNoTranslation = object.matrixWorld.clone()
    matrixNoTranslation.setPosition(0, 0, 0)
    if (
      !AcTrBufferGeometryUtil.safeApplyMatrix4(geometry, matrixNoTranslation, 3)
    ) {
      geometry.dispose()
      return null
    }
    const geometryId = batchedMesh.addGeometry(geometry, -1, -1, worldOffset)
    batchedMesh.setGeometryInfo(geometryId, userData)
    geometry.dispose()

    return {
      batchedObjectId: batchedMesh.id,
      batchId: geometryId
    }
  }

  /**
   * Adds one `THREE.Points` object into matching point batch.
   */
  private addPoint(
    object: THREE.Points,
    userData: AcTrBatchGeometryUserData
  ): AcTrEntityInBatchedObject | null {
    const material = object.material as THREE.Material
    const worldOffset = new THREE.Vector3().setFromMatrixPosition(
      object.matrixWorld
    )
    const batchedPoint = this.resolveOriginBatch(
      this._pointBatches,
      material.id,
      worldOffset,
      () => {
        const batch = new AcTrBatchedPoint(
          AcTrBatchedGroup.INITIAL_POINT_VERTEX_CAPACITY,
          material
        )
        batch.visible = object.visible
        return batch
      }
    )
    const geometry = object.geometry.clone()
    const matrixNoTranslation = object.matrixWorld.clone()
    matrixNoTranslation.setPosition(0, 0, 0)
    if (
      !AcTrBufferGeometryUtil.safeApplyMatrix4(geometry, matrixNoTranslation, 2)
    ) {
      geometry.dispose()
      return null
    }
    const geometryId = batchedPoint.addGeometry(geometry, -1, worldOffset)
    batchedPoint.setGeometryInfo(geometryId, userData)
    geometry.dispose()

    return {
      batchedObjectId: batchedPoint.id,
      batchId: geometryId
    }
  }

  /**
   * Resolves an existing batch container for one material and world offset, or
   * creates a new container when every existing origin is too far away.
   *
   * When multiple containers are eligible, picks the one whose established
   * origin is closest to `worldOffset` so rebased vertex magnitudes stay small.
   */
  private resolveOriginBatch<T extends AcTrOriginBatch>(
    batches: AcTrOriginBatchMap<T>,
    materialId: number,
    worldOffset: THREE.Vector3,
    create: () => T
  ): T {
    let list = batches.get(materialId)
    if (list == null) {
      list = []
      batches.set(materialId, list)
    }

    let best: T | undefined
    let bestDistance = Infinity

    for (const batch of list) {
      if (!canMergeIntoBatchOrigin(batch.origin, worldOffset)) {
        continue
      }

      const origin = batch.origin
      if (origin == null) {
        return batch
      }

      const distance = batchOriginOffsetDistance(origin, worldOffset)
      if (distance < bestDistance) {
        bestDistance = distance
        best = batch
      }
    }

    if (best) {
      return best
    }

    const batch = create()
    list.push(batch)
    this.add(batch)
    return batch
  }

  /**
   * Counts batch containers across all material keys in one batch map.
   */
  private countBatchContainers<T extends AcTrOriginBatch>(
    map: AcTrOriginBatchMap<T>
  ) {
    let count = 0
    map.forEach(batches => {
      count += batches.length
    })
    return count
  }

  /**
   * Estimates geometry memory size for all objects in one batch map.
   */
  private getBatchedGeometrySize<T extends AcTrOriginBatch>(
    batch: AcTrOriginBatchMap<T>
  ) {
    let memory = 0
    batch.forEach(batches => {
      batches.forEach(value => {
        memory += this.getGeometrySize(value)
      })
    })
    return memory
  }

  /**
   * Estimates mapping metadata memory size for all objects in one batch map.
   */
  private getBatchedGeometryMappingSize<T extends AcTrOriginBatch>(
    batch: AcTrOriginBatchMap<T>
  ) {
    let memory = 0
    batch.forEach(batches => {
      batches.forEach(item => {
        memory += item.mappingStats.size
      })
    })
    return memory
  }

  /**
   * Resolves matching line batch map by geometry/index mode.
   */
  private getMatchedLineBatches(object: THREE.LineSegments) {
    if (getSceneDrawableUserData(object).isPoint) {
      return this._pointSymbolBatches
    } else {
      const hasIndex = object.geometry.getIndex() !== null
      let batches = this._lineBatches
      if (hasIndex) {
        batches = this._lineWithIndexBatches
      }
      return batches
    }
  }

  /**
   * Resolves matching mesh batch map by geometry/index mode.
   */
  private getMatchedMeshBatches(object: THREE.Mesh) {
    const hasIndex = object.geometry.getIndex() !== null
    let batches = this._meshBatches
    if (hasIndex) {
      batches = this._meshWithIndexBatches
    }
    return batches
  }

  /**
   * Estimates geometry memory usage for one render object.
   */
  private getGeometrySize(object: THREE.Object3D) {
    const visitedBuffers = new Set<ArrayBufferLike>()
    let memory = 0

    // Geometry memory usage
    if (this.hasGeometry(object)) {
      const geometry = object.geometry as THREE.BufferGeometry

      Object.keys(geometry.attributes).forEach(attributeName => {
        const attribute = geometry.attributes[attributeName] as
          | THREE.BufferAttribute
          | THREE.InterleavedBufferAttribute
        const array = this.getAttributeArray(attribute)
        if (array && !visitedBuffers.has(array.buffer)) {
          memory += array.byteLength
          visitedBuffers.add(array.buffer)
        }
      })

      if (geometry.index) {
        const indexArray = geometry.index.array
        if (!visitedBuffers.has(indexArray.buffer)) {
          memory += indexArray.byteLength
          visitedBuffers.add(indexArray.buffer)
        }
      }
    }
    return memory
  }

  /**
   * Computes summary stats for objects that were not batched.
   */
  private getUnbatchedStats(): AcTrUnbatchedGroupStats {
    const stats: AcTrUnbatchedGroupStats = {
      count: 0,
      geometrySize: 0,
      byType: {
        line: 0,
        mesh: 0,
        point: 0,
        other: 0
      }
    }
    this._unbatchedObjects.children.forEach(object => {
      stats.count += 1
      stats.geometrySize += this.getGeometrySize(object)
      if (this.isLineObject(object)) {
        stats.byType.line += 1
      } else if (object instanceof THREE.Mesh) {
        stats.byType.mesh += 1
      } else if (object instanceof THREE.Points) {
        stats.byType.point += 1
      } else {
        stats.byType.other += 1
      }
    })
    return stats
  }

  /**
   * Clones an unbatched object into world space for group ownership.
   *
   * Leaf drawables keep local geometry buffers and receive the source world
   * transform on the clone root. This preserves precision for entities that
   * rebase vertices around a local origin (lines, wide lines) instead of baking
   * large world coordinates into float32 attributes.
   */
  private cloneUnbatchedObject(source: THREE.Object3D) {
    if (this.shouldCloneUnbatchedSubtree(source)) {
      return this.cloneUnbatchedSubtree(source)
    }

    const cloned = source.clone() as THREE.Object3D
    source.updateMatrixWorld(true)
    source.matrixWorld.decompose(_v1, _unbatchedQuaternion, _unbatchedScale)
    cloned.position.copy(_v1)
    cloned.quaternion.copy(_unbatchedQuaternion)
    cloned.scale.copy(_unbatchedScale)
    if (this.hasMaterial(source) && this.hasMaterial(cloned)) {
      cloned.material = source.material
      const sourceDrawable = getSceneDrawableUserData(source)
      const clonedDrawable = getSceneDrawableUserData(cloned)
      clonedDrawable.styleMaterialId =
        sourceDrawable.styleMaterialId ?? this.getMaterialId(source.material)
      clonedDrawable.bboxIntersectionCheck =
        sourceDrawable.bboxIntersectionCheck
      clonedDrawable.bakedWorldMatrix = source.matrixWorld.toArray()
    }
    cloned.updateMatrix()
    cloned.updateMatrixWorld(true)
    this.finalizeUnbatchedLineClone(cloned)
    return cloned
  }

  /**
   * Applies line-specific setup so unbatched wide/basic lines render reliably
   * at large world coordinates (matches batched line frustum-culling behavior).
   */
  private finalizeUnbatchedLineClone(cloned: THREE.Object3D) {
    if (!this.isLineObject(cloned)) {
      return
    }

    cloned.frustumCulled = false
    const geometry = this.getDrawableGeometry(cloned)
    if (!geometry) {
      return
    }
    AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
    AcTrBufferGeometryUtil.safeComputeBoundingSphere(geometry)
  }

  /**
   * Resolves drawable geometry from supported line/mesh/point object types.
   */
  private getDrawableGeometry(
    object: THREE.Object3D
  ): THREE.BufferGeometry | undefined {
    if (object instanceof LineSegments2) {
      return object.geometry as THREE.BufferGeometry
    }
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.LineSegments ||
      object instanceof THREE.Line ||
      object instanceof THREE.Points
    ) {
      return object.geometry
    }
    return undefined
  }

  /**
   * Returns true when an unbatched source is a placement root with child drawables.
   */
  private shouldCloneUnbatchedSubtree(source: THREE.Object3D) {
    return source.children.length > 0 && !this.hasGeometry(source)
  }

  /**
   * Clones a no-batch placement root together with its render children. MTEXT
   * keeps merged glyph geometry in local space under one insertion transform.
   */
  private cloneUnbatchedSubtree(source: THREE.Object3D) {
    const cloned = source.clone(true) as THREE.Object3D
    source.updateMatrixWorld(true)
    source.matrixWorld.decompose(_v1, _unbatchedQuaternion, _unbatchedScale)
    cloned.position.copy(_v1)
    cloned.quaternion.copy(_unbatchedQuaternion)
    cloned.scale.copy(_unbatchedScale)
    cloned.updateMatrix()
    cloned.updateMatrixWorld(true)

    const sourceDrawable = getSceneDrawableUserData(source)
    const clonedDrawable = getSceneDrawableUserData(cloned)
    clonedDrawable.bboxIntersectionCheck = sourceDrawable.bboxIntersectionCheck
    clonedDrawable.bakedWorldMatrix = source.matrixWorld.toArray()

    cloned.traverse(child => {
      if (!this.hasMaterial(child)) {
        return
      }
      const childDrawable = getSceneDrawableUserData(child)
      if (childDrawable.styleMaterialId == null) {
        childDrawable.styleMaterialId = this.getMaterialId(
          (child as THREE.Mesh).material as THREE.Material
        )
      }
    })

    return cloned
  }

  /**
   * Clones `LineSegments2` geometry and bakes non-translation transforms.
   */
  private cloneLineSegments2Geometry(
    object: LineSegments2,
    transform: THREE.Matrix4
  ): LineSegmentsGeometry | null {
    const source = object.geometry as LineSegmentsGeometry
    const instanceStart = source.getAttribute('instanceStart')
    const instanceEnd = source.getAttribute('instanceEnd')
    const count = instanceStart.count
    const segmentPositions: number[] = []

    for (let i = 0; i < count; i++) {
      _v1.fromBufferAttribute(instanceStart, i).applyMatrix4(transform)
      _v2.fromBufferAttribute(instanceEnd, i).applyMatrix4(transform)
      if (
        !Number.isFinite(_v1.x) ||
        !Number.isFinite(_v1.y) ||
        !Number.isFinite(_v1.z) ||
        !Number.isFinite(_v2.x) ||
        !Number.isFinite(_v2.y) ||
        !Number.isFinite(_v2.z)
      ) {
        continue
      }
      segmentPositions.push(_v1.x, _v1.y, _v1.z, _v2.x, _v2.y, _v2.z)
    }

    if (segmentPositions.length < 6) {
      return null
    }

    const geometry = new LineSegmentsGeometry()
    geometry.setPositions(new Float32Array(segmentPositions))
    if (source.hasAttribute('instanceColorStart')) {
      geometry.setAttribute(
        'instanceColorStart',
        source.getAttribute('instanceColorStart').clone()
      )
      geometry.setAttribute(
        'instanceColorEnd',
        source.getAttribute('instanceColorEnd').clone()
      )
    }
    AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
    AcTrBufferGeometryUtil.safeComputeBoundingSphere(geometry)
    return geometry
  }

  /**
   * Recursively disposes one object subtree owned by this group.
   */
  private disposeObject(object: THREE.Object3D) {
    object.removeFromParent()
    if (this.hasGeometry(object)) {
      object.geometry.dispose()
    }
    object.children.forEach(child => this.disposeObject(child))
  }

  /**
   * Disposes all highlight children of one highlight container.
   */
  private clearHighlightGroup(group: THREE.Group) {
    const objects = [...group.children]
    objects.forEach(obj => this.disposeHighlightObject(obj))
    group.clear()
  }

  /**
   * Disposes highlight object resources (cloned material and optional geometry).
   */
  private disposeHighlightObject(object: THREE.Object3D) {
    disposePreviewObjectTree(object)
  }

  /**
   * Unions world-space bounds from one unbatched drawable or its geometry leaves.
   */
  private unionUnbatchedObjectBounds(
    object: THREE.Object3D,
    target: THREE.Box3,
    scratch: THREE.Box3
  ) {
    const geometry = this.getDrawableGeometry(object)
    if (geometry) {
      AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
      if (!geometry.boundingBox) {
        return
      }
      scratch.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld)
      target.union(scratch)
      return
    }

    for (const child of object.children) {
      if (child.visible === false) continue
      this.unionUnbatchedObjectBounds(child, target, scratch)
    }
  }

  /**
   * Ray-tests one unbatched drawable, honoring bbox-only pick metadata.
   */
  private isUnbatchedDrawableIntersecting(
    object: THREE.Object3D,
    raycaster: THREE.Raycaster
  ) {
    if (getSceneDrawableUserData(object).bboxIntersectionCheck) {
      return this.isUnbatchedBboxIntersecting(object, raycaster)
    }
    return raycaster.intersectObject(object, true).length > 0
  }

  /**
   * Tests ray intersection against the world-space bounds of one unbatched drawable.
   */
  private isUnbatchedBboxIntersecting(
    object: THREE.Object3D,
    raycaster: THREE.Raycaster
  ) {
    object.updateMatrixWorld(true)
    _intersectBox.makeEmpty()

    const geometry = this.getDrawableGeometry(object)
    if (geometry) {
      AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
      if (!geometry.boundingBox) {
        return false
      }
      _intersectBox.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld)
    } else {
      this.unionUnbatchedObjectBounds(
        object,
        _intersectBox,
        _intersectScratchBox
      )
      if (_intersectBox.isEmpty()) {
        return false
      }
    }

    return raycaster.ray.intersectBox(_intersectBox, _v1) !== null
  }

  /**
   * Type guard for objects that expose `material`.
   */
  private hasMaterial(
    object: THREE.Object3D
  ): object is THREE.Mesh | THREE.Line | THREE.Points {
    return 'material' in object
  }

  /**
   * Type guard for objects that expose `geometry`.
   */
  private hasGeometry(
    object: THREE.Object3D
  ): object is THREE.Mesh | THREE.Line | THREE.Points {
    return 'geometry' in object
  }

  /**
   * Returns typed array backing one geometry attribute.
   */
  private getAttributeArray(
    attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute
  ):
    | (ArrayLike<number> & { buffer: ArrayBufferLike; byteLength: number })
    | null {
    if ('array' in attribute && attribute.array) {
      return attribute.array
    }
    if ('data' in attribute && attribute.data && attribute.data.array) {
      return attribute.data.array
    }
    return null
  }

  /**
   * Returns true when object should be counted as line-like for stats.
   */
  private isLineObject(object: THREE.Object3D): boolean {
    if (object instanceof THREE.Line) return true
    return !!(object as THREE.Object3D & { isLineSegments2?: boolean })
      .isLineSegments2
  }

  /**
   * Gets deterministic material id from single/multi-material values.
   */
  private getMaterialId(material: THREE.Material | THREE.Material[]) {
    if (Array.isArray(material)) {
      return material[0]?.id ?? -1
    }
    return material.id
  }
}

/**
 * Disposes one preview subset tree created by {@link AcTrBatchedGroup.createPreviewSubset}.
 *
 * Shared batch geometry buffers are never disposed; cloned materials and
 * Line2-owned geometry follow the same rules as highlight overlays.
 *
 * @param group - Preview subset root group to dispose
 */
export function disposePreviewSubset(group: THREE.Group): void {
  disposePreviewObjectTree(group)
}

/**
 * Recursively disposes preview overlay drawables without touching shared batch buffers.
 *
 * @param object - Preview subset root or descendant node
 */
function disposePreviewObjectTree(object: THREE.Object3D): void {
  for (const child of [...object.children]) {
    disposePreviewObjectTree(child)
  }
  disposePreviewObject(object)
}

/**
 * Disposes cloned preview materials and optional Line2-owned geometry on one node.
 *
 * @param object - Preview drawable node to release
 */
function disposePreviewObject(object: THREE.Object3D): void {
  if (hasPreviewDrawableMaterial(object)) {
    const material = object.material
    if (Array.isArray(material)) {
      material.forEach(item => item.dispose())
    } else {
      material.dispose()
    }
  }
  if (
    hasPreviewDrawableGeometry(object) &&
    getHighlightUserData(object).disposeGeometryOnRemove
  ) {
    object.geometry.dispose()
  }
}

/**
 * Type guard for drawable nodes that own preview-cloned materials.
 *
 * @param object - Candidate drawable node
 */
function hasPreviewDrawableMaterial(
  object: THREE.Object3D
): object is THREE.Object3D & { material: THREE.Material | THREE.Material[] } {
  return 'material' in object && object.material != null
}

/**
 * Type guard for drawable nodes that own disposable preview geometry.
 *
 * @param object - Candidate drawable node
 */
function hasPreviewDrawableGeometry(
  object: THREE.Object3D
): object is THREE.Object3D & { geometry: THREE.BufferGeometry } {
  return 'geometry' in object && object.geometry != null
}

const _v1 = /*@__PURE__*/ new THREE.Vector3()
const _v2 = /*@__PURE__*/ new THREE.Vector3()
const _unbatchedQuaternion = /*@__PURE__*/ new THREE.Quaternion()
const _unbatchedScale = /*@__PURE__*/ new THREE.Vector3()
const _intersectBox = /*@__PURE__*/ new THREE.Box3()
const _intersectScratchBox = /*@__PURE__*/ new THREE.Box3()
