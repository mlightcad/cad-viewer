import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { AcTrPointSymbolCreator } from '../geometry/AcTrPointSymbolCreator'
import { AcTrEntity } from '../object'
import { AcTrMaterialUtil } from '../util'
import { AcTrBatchGeometryUserData } from './AcTrBatchedGeometryInfo'
import { AcTrBatchedLine } from './AcTrBatchedLine'
import { AcTrBatchedLine2 } from './AcTrBatchedLine2'
import { AcTrBatchedMesh } from './AcTrBatchedMesh'
import { AcTrBatchedPoint } from './AcTrBatchedPoint'

export type AcTrBatchedObject =
  | AcTrBatchedLine
  | AcTrBatchedLine2
  | AcTrBatchedMesh

export interface AcTrEntityInBatchedObject {
  /** Three.js object id of the target batched container. */
  batchedObjectId: number
  /** Geometry id inside that batched container. */
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
 * Aggregates and manages all batched render objects belonging to one CAD
 * layer/layout group.
 *
 * Entities are distributed into per-material batch containers (line/mesh/point
 * and wide-line variants), while unsupported render paths are stored in a
 * dedicated unbatched group.
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
   * - the value is one batched line
   */
  private _lineBatches: Map<number, AcTrBatchedLine>
  /**
   * Batched line map for lines with vertex index.
   * - the key is material id
   * - the value is one batched map
   */
  private _lineWithIndexBatches: Map<number, AcTrBatchedLine>
  /**
   * Batched line map for wide lines rendered as THREE.LineSegments2.
   * - the key is material id
   * - the value is one batched line2
   */
  private _line2Batches: Map<number, AcTrBatchedLine2>
  /**
   * Batched mesh map for meshes without vertex index.
   * - the key is material id
   * - the value is one batched map
   */
  private _meshBatches: Map<number, AcTrBatchedMesh>
  /**
   * Batched mesh map for meshes with vertex index.
   * - the key is material id
   * - the value is one batched map
   */
  private _meshWithIndexBatches: Map<number, AcTrBatchedMesh>
  /**
   * Batched mesh map for points rendered as THREE.Points
   * - the key is material id
   * - the value is one batched map
   */
  private _pointBatches: Map<number, AcTrBatchedPoint>
  /**
   * Batched mesh map for points rendered as THREE.LineSegments
   * - the key is material id
   * - the value is one batched map
   */
  private _pointSymbolBatches: Map<number, AcTrBatchedLine>
  /**
   * The group to store all of selected entities
   */
  private _selectedObjects: THREE.Group
  /**
   * The group to store all of entities hovering on them
   */
  private _hoverObjects: THREE.Group
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
    this._selectedObjects = new THREE.Group()
    this._hoverObjects = new THREE.Group()
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
          count: this._meshWithIndexBatches.size,
          geometrySize: this.getBatchedGeometrySize(this._meshWithIndexBatches),
          mappingSize: this.getBatchedGeometryMappingSize(
            this._meshWithIndexBatches
          )
        },
        nonIndexed: {
          count: this._meshBatches.size,
          geometrySize: this.getBatchedGeometrySize(this._meshBatches),
          mappingSize: this.getBatchedGeometryMappingSize(this._meshBatches)
        }
      },
      line: {
        indexed: {
          count: this._lineWithIndexBatches.size,
          geometrySize: this.getBatchedGeometrySize(this._lineWithIndexBatches),
          mappingSize: this.getBatchedGeometryMappingSize(
            this._lineWithIndexBatches
          )
        },
        nonIndexed: {
          count: this._lineBatches.size + this._line2Batches.size,
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
          count: this._pointSymbolBatches.size,
          geometrySize: this.getBatchedGeometrySize(this._pointSymbolBatches),
          mappingSize: this.getBatchedGeometryMappingSize(
            this._pointSymbolBatches
          )
        },
        nonIndexed: {
          count: this._pointBatches.size,
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
      this._pointSymbolBatches.forEach(item => {
        item.resetGeometry(displayMode)
      })
    }

    const isShowPoint = pointSymbol.point != null
    this._pointBatches.forEach(item => {
      item.visible = isShowPoint
    })
  }

  /**
   * Clears all batched/unbatched data and disposes owned resources.
   */
  clear() {
    this.groups.forEach(group => {
      group.forEach(value => {
        value.dispose()
      })
      group.clear()
    })
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
    this.groups.forEach(group => {
      const batch = group.get(oldId)
      if (batch) {
        batch.material = material
        // @ts-expect-error batch is from group and it must be type-safe.
        group.set(material.id, batch)
      }
    })
    this._unbatchedObjects.traverse(object => {
      if (!('material' in object)) return
      const userDataMaterialId = object.userData.styleMaterialId as number
      if (userDataMaterialId === oldId) {
        object.material = material
        object.userData.styleMaterialId = material.id
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
    return this._entitiesMap.has(objectId)
  }

  /**
   * Adds one converted entity into batch/unbatched containers.
   */
  addEntity(entity: AcTrEntity) {
    const objectId = entity.objectId
    const entityInfo: AcTrEntityInBatchedObject[] = []
    this._entitiesMap.set(objectId, entityInfo)
    this._unbatchedEntities.delete(objectId)
    const unbatchedObjects: THREE.Object3D[] = []
    let hasUnbatched = false

    entity.updateMatrixWorld(true)
    entity.traverse(object => {
      const bboxIntersectionCheck = !!object.userData.bboxIntersectionCheck
      if (object instanceof LineSegments2) {
        entityInfo.push(
          this.addLine2(object, {
            objectId,
            bboxIntersectionCheck: bboxIntersectionCheck
          })
        )
        return
      }

      if (object.userData.noBatch) {
        const cloned = this.cloneUnbatchedObject(object)
        cloned.userData.bboxIntersectionCheck = bboxIntersectionCheck
        this._unbatchedObjects.add(cloned)
        unbatchedObjects.push(cloned)
        hasUnbatched = true
        return
      }
      if (object instanceof THREE.LineSegments) {
        entityInfo.push(
          this.addLine(object, {
            position: object.userData.position,
            objectId,
            bboxIntersectionCheck: bboxIntersectionCheck
          })
        )
      } else if (object instanceof THREE.Mesh) {
        entityInfo.push(
          this.addMesh(object, {
            objectId,
            bboxIntersectionCheck: bboxIntersectionCheck
          })
        )
      } else if (object instanceof THREE.Points) {
        entityInfo.push(
          this.addPoint(object, {
            objectId,
            bboxIntersectionCheck: bboxIntersectionCheck
          })
        )
      }
    })

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
        const object = unbatchedObjects[i]
        const intersects = raycaster.intersectObject(object, true)
        if (intersects.length > 0) return true
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
   * Returns all batch maps managed by this group.
   */
  protected get groups() {
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
    const entityInfo = this._entitiesMap.get(objectId)
    // TODO:
    // If there are more than 1000 batched object to highlight, just ignore it due to
    // performance reason. We will fix it in the future.
    if (entityInfo && entityInfo.length < 1000) {
      entityInfo.forEach(item => {
        const batchedObject = this.getObjectById(
          item.batchedObjectId
        ) as AcTrBatchedObject
        const object = batchedObject.getObjectAt(item.batchId)

        const clonedMaterial = AcTrMaterialUtil.cloneMaterial(object.material)
        AcTrMaterialUtil.setMaterialColor(clonedMaterial)
        object.material = clonedMaterial

        object.userData.objectId = objectId
        containerGroup.add(object)
      })
    }

    const unbatchedObjects = this._unbatchedEntities.get(objectId)
    if (unbatchedObjects && unbatchedObjects.length < 1000) {
      unbatchedObjects.forEach(obj => {
        const highlightObj = obj.clone()
        if (this.hasMaterial(highlightObj)) {
          const clonedMaterial = AcTrMaterialUtil.cloneMaterial(
            highlightObj.material
          )
          AcTrMaterialUtil.setMaterialColor(clonedMaterial)
          highlightObj.material = clonedMaterial
        }
        highlightObj.userData.objectId = objectId
        containerGroup.add(highlightObj)
      })
    }
  }

  /**
   * Removes and disposes highlight objects for one entity id.
   */
  protected unhighlight(objectId: string, containerGroup: THREE.Group) {
    const objects: THREE.Object3D[] = []
    containerGroup.children.forEach(obj => {
      if (obj.userData.objectId === objectId) objects.push(obj)
    })
    objects.forEach(obj => {
      if ('material' in obj) {
        const material = obj.material as THREE.Material | THREE.Material[]
        if (Array.isArray(material)) {
          material.forEach(m => m.dispose())
        } else {
          material.dispose()
        }
      }
    })
    containerGroup.remove(...objects)
  }

  /**
   * Adds one `THREE.LineSegments` object into matching line batch.
   */
  private addLine(
    object: THREE.LineSegments,
    userData: AcTrBatchGeometryUserData
  ): AcTrEntityInBatchedObject {
    const material = object.material as THREE.Material
    const batches = this.getMatchedLineBatches(object)
    let batchedLine = batches.get(material.id)
    if (batchedLine == null) {
      batchedLine = new AcTrBatchedLine(
        AcTrBatchedGroup.INITIAL_LINE_VERTEX_CAPACITY,
        AcTrBatchedGroup.INITIAL_LINE_INDEX_CAPACITY,
        material
      )
      batches.set(material.id, batchedLine)
      this.add(batchedLine)
    }
    object.geometry.applyMatrix4(object.matrixWorld)
    const geometryId = batchedLine.addGeometry(object.geometry)
    batchedLine.setGeometryInfo(geometryId, userData)

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
  ): AcTrEntityInBatchedObject {
    const material = object.material as THREE.Material
    let batchedLine = this._line2Batches.get(material.id)
    if (batchedLine == null) {
      batchedLine = new AcTrBatchedLine2(
        AcTrBatchedGroup.INITIAL_LINE_VERTEX_CAPACITY,
        material
      )
      this._line2Batches.set(material.id, batchedLine)
      this.add(batchedLine)
    }

    const geometry = this.cloneLineSegments2GeometryInWorld(object)
    const geometryId = batchedLine.addGeometry(geometry)
    batchedLine.setGeometryInfo(geometryId, userData)
    geometry.dispose()

    return {
      batchedObjectId: batchedLine.id,
      batchId: geometryId
    }
  }

  /**
   * Adds one `THREE.Mesh` object into matching mesh batch.
   */
  private addMesh(
    object: THREE.Mesh,
    userData: AcTrBatchGeometryUserData
  ): AcTrEntityInBatchedObject {
    const material = object.material as THREE.Material

    const batches = this.getMatchedMeshBatches(object)
    let batchedMesh = batches.get(material.id)
    if (batchedMesh == null) {
      batchedMesh = new AcTrBatchedMesh(
        AcTrBatchedGroup.INITIAL_MESH_VERTEX_CAPACITY,
        AcTrBatchedGroup.INITIAL_MESH_INDEX_CAPACITY,
        material
      )
      batches.set(material.id, batchedMesh)
      this.add(batchedMesh)
    }
    object.geometry.applyMatrix4(object.matrixWorld)
    const geometryId = batchedMesh.addGeometry(object.geometry)
    batchedMesh.setGeometryInfo(geometryId, userData)

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
  ): AcTrEntityInBatchedObject {
    const material = object.material as THREE.Material
    let batchedPoint = this._pointBatches.get(material.id)
    if (batchedPoint == null) {
      batchedPoint = new AcTrBatchedPoint(
        AcTrBatchedGroup.INITIAL_POINT_VERTEX_CAPACITY,
        material
      )
      batchedPoint.visible = object.visible
      this._pointBatches.set(material.id, batchedPoint)
      this.add(batchedPoint)
    }
    object.geometry.applyMatrix4(object.matrixWorld)
    const geometryId = batchedPoint.addGeometry(object.geometry)
    batchedPoint.setGeometryInfo(geometryId, userData)

    return {
      batchedObjectId: batchedPoint.id,
      batchId: geometryId
    }
  }

  /**
   * Resolves matching line batch map by geometry/index mode.
   */
  private getMatchedLineBatches(object: THREE.LineSegments) {
    if (object.userData.isPoint) {
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
   * Estimates geometry memory size for all objects in one batch map.
   */
  private getBatchedGeometrySize(
    batch:
      | Map<number, AcTrBatchedPoint>
      | Map<number, AcTrBatchedLine>
      | Map<number, AcTrBatchedLine2>
      | Map<number, AcTrBatchedMesh>
  ) {
    let memory = 0
    batch.forEach(value => {
      memory += this.getGeometrySize(value)
    })
    return memory
  }

  /**
   * Estimates mapping metadata memory size for all objects in one batch map.
   */
  private getBatchedGeometryMappingSize(
    batch:
      | Map<number, AcTrBatchedPoint>
      | Map<number, AcTrBatchedLine>
      | Map<number, AcTrBatchedLine2>
      | Map<number, AcTrBatchedMesh>
  ) {
    let memory = 0
    batch.forEach(item => {
      memory += item.mappingStats.size
    })
    return memory
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
   */
  private cloneUnbatchedObject(source: THREE.Object3D) {
    const cloned = source.clone() as THREE.Object3D
    if (this.hasGeometry(source) && this.hasGeometry(cloned)) {
      const geometry = source.geometry
      const clonedGeometry = geometry.clone()
      clonedGeometry.applyMatrix4(source.matrixWorld)
      cloned.geometry = clonedGeometry
    }
    if (this.hasMaterial(source) && this.hasMaterial(cloned)) {
      cloned.material = source.material
      cloned.userData.styleMaterialId =
        source.userData.styleMaterialId ?? this.getMaterialId(source.material)
    }
    cloned.position.set(0, 0, 0)
    cloned.rotation.set(0, 0, 0)
    cloned.scale.set(1, 1, 1)
    cloned.updateMatrix()
    cloned.updateMatrixWorld(true)
    return cloned
  }

  /**
   * Clones `LineSegments2` geometry into world space for wide-line batching.
   */
  private cloneLineSegments2GeometryInWorld(object: LineSegments2) {
    const source = object.geometry as LineSegmentsGeometry
    const instanceStart = source.getAttribute('instanceStart')
    const instanceEnd = source.getAttribute('instanceEnd')
    const count = instanceStart.count
    const segmentPositions = new Float32Array(count * 6)

    for (let i = 0, p = 0; i < count; i++) {
      _v1.fromBufferAttribute(instanceStart, i).applyMatrix4(object.matrixWorld)
      _v2.fromBufferAttribute(instanceEnd, i).applyMatrix4(object.matrixWorld)
      segmentPositions[p++] = _v1.x
      segmentPositions[p++] = _v1.y
      segmentPositions[p++] = _v1.z
      segmentPositions[p++] = _v2.x
      segmentPositions[p++] = _v2.y
      segmentPositions[p++] = _v2.z
    }

    const geometry = new LineSegmentsGeometry()
    geometry.setPositions(segmentPositions)
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
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
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

const _v1 = /*@__PURE__*/ new THREE.Vector3()
const _v2 = /*@__PURE__*/ new THREE.Vector3()
