import * as THREE from 'three'

import { AcTrPointSymbolCreator } from '../geometry/AcTrPointSymbolCreator'
import { AcTrEntity } from '../object'
import { AcTrMaterialUtil } from '../util'
import { AcTrBatchGeometryUserData } from './AcTrBatchedGeometryInfo'
import { AcTrBatchedLine } from './AcTrBatchedLine'
import { AcTrBatchedMesh } from './AcTrBatchedMesh'
import { AcTrBatchedPoint } from './AcTrBatchedPoint'

export type AcTrBatchedObject = AcTrBatchedLine | AcTrBatchedMesh

export interface AcTrEntityInBatchedObject {
  batchedObjectId: number
  batchId: number
}

export interface AcTrGeometrySize {
  count: number
  geometrySize: number
  mappingSize: number
}

export interface AcTrGeometryInfo {
  indexed: AcTrGeometrySize
  nonIndexed: AcTrGeometrySize
}

export interface AcTrBatchedGroupStats {
  summary: {
    entityCount: number
    totalGeometrySize: number
    totalMappingSize: number
  }
  mesh: AcTrGeometryInfo
  line: AcTrGeometryInfo
  point: AcTrGeometryInfo
}

export class AcTrBatchedGroup extends THREE.Group {
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
    this._meshBatches = new Map()
    this._meshWithIndexBatches = new Map()
    this._entitiesMap = new Map()
    this._selectedObjects = new THREE.Group()
    this._hoverObjects = new THREE.Group()
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
          count: this._lineBatches.size,
          geometrySize: this.getBatchedGeometrySize(this._lineBatches),
          mappingSize: this.getBatchedGeometryMappingSize(this._lineBatches)
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
      }
    }
    stats.summary.totalGeometrySize =
      stats.line.indexed.geometrySize +
      stats.line.nonIndexed.geometrySize +
      stats.mesh.indexed.geometrySize +
      stats.mesh.nonIndexed.geometrySize +
      stats.point.indexed.geometrySize +
      stats.point.nonIndexed.geometrySize
    stats.summary.totalMappingSize =
      stats.line.indexed.mappingSize +
      stats.line.nonIndexed.mappingSize +
      stats.mesh.indexed.mappingSize +
      stats.mesh.nonIndexed.mappingSize +
      stats.point.indexed.mappingSize +
      stats.point.nonIndexed.mappingSize
    return stats
  }

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

  clear() {
    this.groups.forEach(group => {
      group.forEach(value => {
        value.dispose()
      })
      group.clear()
    })
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

  addEntity(entity: AcTrEntity) {
    const entityInfo: AcTrEntityInBatchedObject[] = []
    this._entitiesMap.set(entity.objectId, entityInfo)

    entity.updateMatrixWorld(true)
    entity.traverse(object => {
      const bboxIntersectionCheck = !!object.userData.bboxIntersectionCheck
      if (object instanceof THREE.LineSegments) {
        entityInfo.push(
          this.addLine(object, {
            position: object.userData.position,
            objectId: entity.objectId,
            bboxIntersectionCheck: bboxIntersectionCheck
          })
        )
      } else if (object instanceof THREE.Mesh) {
        entityInfo.push(
          this.addMesh(object, {
            objectId: entity.objectId,
            bboxIntersectionCheck: bboxIntersectionCheck
          })
        )
      } else if (object instanceof THREE.Points) {
        entityInfo.push(
          this.addPoint(object, {
            objectId: entity.objectId,
            bboxIntersectionCheck: bboxIntersectionCheck
          })
        )
      }
    })
  }

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
    return result
  }

  hover(objectId: string) {
    this.highlight(objectId, this._hoverObjects)
  }

  unhover(objectId: string) {
    this.unhighlight(objectId, this._hoverObjects)
  }

  select(objectId: string) {
    this.highlight(objectId, this._selectedObjects)
  }

  unselect(objectId: string) {
    this.unhighlight(objectId, this._selectedObjects)
  }

  protected get groups() {
    return [
      this._lineBatches,
      this._lineWithIndexBatches,
      this._meshBatches,
      this._meshWithIndexBatches,
      this._pointBatches,
      this._pointSymbolBatches
    ]
  }

  protected highlight(objectId: string, containerGroup: THREE.Group) {
    const entityInfo = this._entitiesMap.get(objectId)
    if (entityInfo) {
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
  }

  protected unhighlight(objectId: string, containerGroup: THREE.Group) {
    const objects: THREE.Object3D[] = []
    containerGroup.children.forEach(obj => {
      if (obj.userData.objectId === objectId) objects.push(obj)
    })
    containerGroup.remove(...objects)
  }

  private addLine(
    object: THREE.LineSegments,
    userData: AcTrBatchGeometryUserData
  ): AcTrEntityInBatchedObject {
    const material = object.material as THREE.Material
    const batches = this.getMatchedLineBatches(object)
    let batchedLine = batches.get(material.id)
    if (batchedLine == null) {
      batchedLine = new AcTrBatchedLine(1000, 2000, material)
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

  private addMesh(
    object: THREE.Mesh,
    userData: AcTrBatchGeometryUserData
  ): AcTrEntityInBatchedObject {
    const material = object.material as THREE.Material

    const batches = this.getMatchedMeshBatches(object)
    let batchedMesh = batches.get(material.id)
    if (batchedMesh == null) {
      batchedMesh = new AcTrBatchedMesh(1000, 2000, material)
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

  private addPoint(
    object: THREE.Points,
    userData: AcTrBatchGeometryUserData
  ): AcTrEntityInBatchedObject {
    const material = object.material as THREE.Material
    let batchedPoint = this._pointBatches.get(material.id)
    if (batchedPoint == null) {
      batchedPoint = new AcTrBatchedPoint(100, material)
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

  private getMatchedMeshBatches(object: THREE.Mesh) {
    const hasIndex = object.geometry.getIndex() !== null
    let batches = this._meshBatches
    if (hasIndex) {
      batches = this._meshWithIndexBatches
    }
    return batches
  }

  private getBatchedGeometrySize(
    batch:
      | Map<number, AcTrBatchedPoint>
      | Map<number, AcTrBatchedLine>
      | Map<number, AcTrBatchedMesh>
  ) {
    let memory = 0
    batch.forEach(value => {
      memory += this.getGeometrySize(value)
    })
    return memory
  }

  private getBatchedGeometryMappingSize(
    batch:
      | Map<number, AcTrBatchedPoint>
      | Map<number, AcTrBatchedLine>
      | Map<number, AcTrBatchedMesh>
  ) {
    let memory = 0
    batch.forEach(item => {
      memory += item.mappingStats.size
    })
    return memory
  }

  private getGeometrySize(object: THREE.Object3D) {
    let memory = 0

    // Geometry memory usage
    if ('geometry' in object) {
      const geometry = object.geometry as THREE.BufferGeometry

      // Vertices
      if (geometry.attributes.position) {
        memory += geometry.attributes.position.array.byteLength
      }

      // Normals
      if (geometry.attributes.normal) {
        memory += geometry.attributes.normal.array.byteLength
      }

      // UVs (each UV has 2 floats)
      if (geometry.attributes.uv) {
        memory += geometry.attributes.uv.array.byteLength
      }

      // Indices
      if (geometry.index) {
        memory += geometry.index.array.byteLength
      }
    }
    return memory
  }
}
