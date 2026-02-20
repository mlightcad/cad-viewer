import * as THREE from 'three'

import { AcTrCommonUtil } from '../util'
import {
  AcTrIndexedBatchGeometryInfo,
  AcTrVertexBatchGeometryInfo,
  ascIdSort,
  copyAttributeData
} from './AcTrBatchedGeometryInfo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T

type AcTrBatchBaseObject = THREE.Object3D & {
  /** Shared geometry bound to the render object. */
  geometry: THREE.BufferGeometry
  /** Render material(s) used by the object. */
  material: THREE.Material | THREE.Material[]
}

type AcTrBatchBounds = {
  /** Returns cached/derived bounding box for one packed geometry id. */
  getBoundingBoxAt(geometryId: number, target: THREE.Box3): THREE.Box3 | null
  /** Returns cached/derived bounding sphere for one packed geometry id. */
  getBoundingSphereAt(
    geometryId: number,
    target: THREE.Sphere
  ): THREE.Sphere | null
}

type AcTrBatchGeometryLike = AcTrVertexBatchGeometryInfo

/**
 * Estimates memory footprint of one geometry-info record and returns aggregate
 * mapping statistics for the whole batch.
 */
export function getMappingStats<T>(geometryInfo: T[]) {
  const count = geometryInfo.length
  let size = 0
  if (count > 0) {
    size = AcTrCommonUtil.estimateObjectSize(geometryInfo[0])
  }

  return {
    count,
    size: count * size
  }
}

/**
 * Initializes destination batch geometry buffers using a reference geometry
 * layout and preallocated capacities.
 */
export function initializeGeometry(
  geometry: THREE.BufferGeometry,
  reference: THREE.BufferGeometry,
  maxVertexCount: number,
  maxIndexCount: number | null
) {
  for (const attributeName in reference.attributes) {
    const srcAttribute = reference.getAttribute(attributeName)
    const { array, itemSize, normalized } = srcAttribute

    // @ts-expect-error no good way to remove this type error
    const dstArray = new array.constructor(maxVertexCount * itemSize)
    const dstAttribute = new THREE.BufferAttribute(
      dstArray,
      itemSize,
      normalized
    )
    geometry.setAttribute(attributeName, dstAttribute)
  }

  if (maxIndexCount != null && reference.getIndex() !== null) {
    const indexArray =
      maxVertexCount > 65535
        ? new Uint32Array(maxIndexCount)
        : new Uint16Array(maxIndexCount)

    geometry.setIndex(new THREE.BufferAttribute(indexArray, 1))
  }
}

/**
 * Validates that a geometry is compatible with current batch attribute/index
 * layout.
 */
export function validateGeometry(
  batchGeometry: THREE.BufferGeometry,
  geometry: THREE.BufferGeometry,
  typeName: string,
  checkIndex: boolean
) {
  if (checkIndex) {
    if (Boolean(geometry.getIndex()) !== Boolean(batchGeometry.getIndex())) {
      throw new Error(
        `${typeName}: All geometries must consistently have "index".`
      )
    }
  }

  for (const attributeName in batchGeometry.attributes) {
    if (!geometry.hasAttribute(attributeName)) {
      throw new Error(
        `${typeName}: Added geometry missing "${attributeName}". All geometries must have consistent attributes.`
      )
    }

    const srcAttribute = geometry.getAttribute(attributeName)
    const dstAttribute = batchGeometry.getAttribute(attributeName)
    if (
      srcAttribute.itemSize !== dstAttribute.itemSize ||
      srcAttribute.normalized !== dstAttribute.normalized
    ) {
      throw new Error(
        `${typeName}: All attributes must have a consistent itemSize and normalized value.`
      )
    }
  }
}

/**
 * Reserves a geometry id slot for insertion, reusing deleted ids when
 * available.
 */
export function reserveGeometryId<T>(
  availableGeometryIds: number[],
  geometryInfoList: T[],
  geometryCount: number,
  geometryInfo: T
) {
  let geometryId: number
  let nextGeometryCount = geometryCount

  if (availableGeometryIds.length > 0) {
    availableGeometryIds.sort(ascIdSort)
    geometryId = availableGeometryIds.shift() as number
    geometryInfoList[geometryId] = geometryInfo
  } else {
    geometryId = geometryCount
    nextGeometryCount++
    geometryInfoList.push(geometryInfo)
  }

  return { geometryId, geometryCount: nextGeometryCount }
}

/**
 * Converts sentinel reserved count `-1` into actual source geometry count.
 */
export function resolveReservedCount(
  reservedCount: number,
  actualCount: number
) {
  return reservedCount === -1 ? actualCount : reservedCount
}

/**
 * Creates default active/visible state for a newly inserted geometry record.
 */
export function createGeometryState() {
  return {
    boundingBox: null as THREE.Box3 | null,
    active: true,
    visible: true
  }
}

/**
 * Validates reserved vertex/index ranges against current batch capacities.
 */
export function assertReservedCapacity(params: {
  typeName: string
  maxVertexCount: number
  vertexStart: number
  reservedVertexCount: number
  maxIndexCount?: number
  indexStart?: number
  reservedIndexCount?: number
}) {
  const {
    typeName,
    maxVertexCount,
    vertexStart,
    reservedVertexCount,
    maxIndexCount,
    indexStart = -1,
    reservedIndexCount = 0
  } = params

  if (
    (maxIndexCount != null &&
      indexStart !== -1 &&
      indexStart + reservedIndexCount > maxIndexCount) ||
    vertexStart + reservedVertexCount > maxVertexCount
  ) {
    throw new Error(
      `${typeName}: Reserved space request exceeds the maximum buffer size.`
    )
  }
}

/**
 * Computes a grown capacity if the requested append range does not fit.
 */
export function growCapacityIfNeeded(params: {
  currentMaxCount: number
  nextStart: number
  requiredCount: number
  growthFactor: number
}) {
  const { currentMaxCount, nextStart, requiredCount, growthFactor } = params
  const totalRequiredCount = nextStart + requiredCount
  if (totalRequiredCount <= currentMaxCount) {
    return currentMaxCount
  }
  return Math.ceil(totalRequiredCount * growthFactor)
}

/**
 * Marks a geometry record as deleted and registers its id for reuse.
 */
export function deleteGeometryById<T extends AcTrBatchGeometryLike>(
  geometryId: number,
  geometryInfoList: T[],
  availableGeometryIds: number[]
) {
  if (
    geometryId >= geometryInfoList.length ||
    geometryInfoList[geometryId].active === false
  ) {
    return false
  }

  geometryInfoList[geometryId].active = false
  geometryInfoList[geometryId].visible = false
  availableGeometryIds.push(geometryId)
  return true
}

/**
 * Throws when `geometryId` does not refer to an active geometry record.
 */
export function validateGeometryId<T extends AcTrBatchGeometryLike>(
  geometryId: number,
  geometryInfoList: T[],
  typeName: string
) {
  if (
    geometryId < 0 ||
    geometryId >= geometryInfoList.length ||
    geometryInfoList[geometryId].active === false
  ) {
    throw new Error(
      `${typeName}: Invalid geometryId ${geometryId}. Geometry is either out of range or has been deleted.`
    )
  }
}

/**
 * Copies all geometry attributes into batched buffers and zero-fills reserved
 * tail ranges to avoid stale data.
 */
export function copyGeometryAttributes(
  batchGeometry: THREE.BufferGeometry,
  geometry: THREE.BufferGeometry,
  vertexStart: number,
  reservedVertexCount: number
) {
  for (const attributeName in batchGeometry.attributes) {
    const srcAttribute = geometry.getAttribute(attributeName)
    const dstAttribute = batchGeometry.getAttribute(
      attributeName
    ) as THREE.BufferAttribute
    copyAttributeData(srcAttribute, dstAttribute, vertexStart)

    const itemSize = srcAttribute.itemSize
    for (let i = srcAttribute.count, l = reservedVertexCount; i < l; i++) {
      const index = vertexStart + i
      for (let c = 0; c < itemSize; c++) {
        dstAttribute.setComponent(index, c, 0)
      }
    }

    dstAttribute.needsUpdate = true
    dstAttribute.addUpdateRange(
      vertexStart * itemSize,
      reservedVertexCount * itemSize
    )
  }
}

/**
 * Copies and rebases index data into the destination batch index buffer.
 */
export function copyGeometryIndices(
  batchGeometry: THREE.BufferGeometry,
  geometry: THREE.BufferGeometry,
  vertexStart: number,
  indexStart: number,
  reservedIndexCount: number
) {
  const dstIndex = batchGeometry.getIndex()
  const srcIndex = geometry.getIndex()
  if (!dstIndex || !srcIndex) {
    return
  }

  for (let i = 0; i < srcIndex.count; i++) {
    dstIndex.setX(indexStart + i, vertexStart + srcIndex.getX(i))
  }

  for (let i = srcIndex.count, l = reservedIndexCount; i < l; i++) {
    dstIndex.setX(indexStart + i, vertexStart)
  }

  dstIndex.needsUpdate = true
  dstIndex.addUpdateRange(indexStart, reservedIndexCount)
}

/**
 * Writes a full source geometry into one reserved batched geometry range.
 */
export function applyGeometryAt<T extends AcTrBatchGeometryLike>(
  geometryInfo: T,
  batchGeometry: THREE.BufferGeometry,
  geometry: THREE.BufferGeometry,
  typeName: string
) {
  const hasIndex = batchGeometry.getIndex() !== null
  const srcIndex = geometry.getIndex()

  if (
    (hasIndex &&
      srcIndex &&
      srcIndex.count >
        (geometryInfo as unknown as AcTrIndexedBatchGeometryInfo)
          .reservedIndexCount) ||
    geometry.attributes.position.count > geometryInfo.reservedVertexCount
  ) {
    throw new Error(
      `${typeName}: Reserved space not large enough for provided geometry.`
    )
  }

  const vertexStart = geometryInfo.vertexStart
  const reservedVertexCount = geometryInfo.reservedVertexCount
  geometryInfo.vertexCount = geometry.getAttribute('position').count
  copyGeometryAttributes(
    batchGeometry,
    geometry,
    vertexStart,
    reservedVertexCount
  )

  if (hasIndex && srcIndex) {
    const indexedInfo = geometryInfo as unknown as AcTrIndexedBatchGeometryInfo
    indexedInfo.indexCount = srcIndex.count
    copyGeometryIndices(
      batchGeometry,
      geometry,
      vertexStart,
      indexedInfo.indexStart,
      indexedInfo.reservedIndexCount
    )
  }

  geometryInfo.boundingBox = null
}

/**
 * Computes global bounding box of all active geometry records in a batch.
 */
export function computeBoundingBox<T extends AcTrBatchGeometryLike>(
  currentBoundingBox: THREE.Box3 | null,
  geometryInfo: T[]
) {
  const boundingBox = currentBoundingBox ?? new THREE.Box3()
  boundingBox.makeEmpty()

  for (let i = 0, l = geometryInfo.length; i < l; i++) {
    const geometry = geometryInfo[i]
    if (geometry.active === false) continue
    if (geometry.boundingBox != null) {
      boundingBox.union(geometry.boundingBox)
    }
  }

  return boundingBox
}

/**
 * Computes global bounding sphere of all active geometry records in a batch.
 */
export function computeBoundingSphere<T extends AcTrBatchGeometryLike>(
  currentBoundingSphere: THREE.Sphere | null,
  geometryInfo: T[],
  getBoundingSphereAt: (
    geometryId: number,
    target: THREE.Sphere
  ) => THREE.Sphere | null
) {
  const boundingSphere = currentBoundingSphere ?? new THREE.Sphere()
  boundingSphere.makeEmpty()

  const sphere = new THREE.Sphere()
  for (let i = 0, l = geometryInfo.length; i < l; i++) {
    if (geometryInfo[i].active === false) continue
    getBoundingSphereAt(i, sphere)
    boundingSphere.union(sphere)
  }

  return boundingSphere
}

/**
 * Rebinds a temporary raycast object to the shared batch geometry buffers.
 */
export function initializeRaycastObject(
  raycastObject: AcTrBatchBaseObject,
  batchGeometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[]
) {
  raycastObject.material = material
  raycastObject.geometry.index = batchGeometry.index
  raycastObject.geometry.attributes = batchGeometry.attributes

  if (raycastObject.geometry.boundingBox === null) {
    raycastObject.geometry.boundingBox = new THREE.Box3()
  }

  if (raycastObject.geometry.boundingSphere === null) {
    raycastObject.geometry.boundingSphere = new THREE.Sphere()
  }
}

/**
 * Updates draw-range and bounds for raycasting one batched sub-geometry.
 */
export function setRaycastObjectInfo(
  raycastObject: AcTrBatchBaseObject,
  start: number,
  count: number,
  boundingBox: THREE.Box3,
  boundingSphere: THREE.Sphere
) {
  raycastObject.geometry.setDrawRange(start, count)
  raycastObject.geometry.boundingBox!.copy(boundingBox)
  raycastObject.geometry.boundingSphere!.copy(boundingSphere)
}

/**
 * Clears temporary raycast object bindings to prevent accidental retention.
 */
export function resetRaycastObjectInfo(raycastObject: AcTrBatchBaseObject) {
  raycastObject.geometry.index = null
  raycastObject.geometry.attributes = {}
  raycastObject.geometry.setDrawRange(0, Infinity)
}

/**
 * Creates a reusable mixin that implements shared behavior for batched render
 * objects (visibility, bounds aggregation, id lifecycle, and raycast flow).
 */
export function createAcTrBatchedMixin<
  TInfo extends AcTrBatchGeometryLike,
  TBase extends
    Constructor<AcTrBatchBaseObject> = Constructor<AcTrBatchBaseObject>
>(
  Base: TBase,
  options: {
    typeName: string
    createObject: () => AcTrBatchBaseObject
    getDrawRange: (
      instance: AcTrBatchBaseObject,
      info: TInfo
    ) => {
      start: number
      count: number
    }
  }
) {
  /**
   * Base class produced by {@link createAcTrBatchedMixin}.
   */
  return class AcTrBatchedMixinBase extends Base {
    /** Aggregate bounding box across all active packed geometries. */
    boundingBox: THREE.Box3 | null = null
    /** Aggregate bounding sphere across all active packed geometries. */
    boundingSphere: THREE.Sphere | null = null

    /** Per-geometry mapping/state records. */
    _geometryInfo: TInfo[] = []
    /** Deleted geometry ids available for reuse. */
    _availableGeometryIds: number[] = []
    /** Number of allocated geometry ids. */
    _geometryCount = 0

    /** Shared temporary object used for batched raycast operations. */
    readonly _raycastObject = options.createObject()
    /** Temporary intersection collection for one raycast pass. */
    readonly _batchIntersects: THREE.Intersection[] = []
    /** Reused bounding box scratch object. */
    readonly _box = new THREE.Box3()
    /** Reused bounding sphere scratch object. */
    readonly _sphere = new THREE.Sphere()
    /** Reused vector scratch object. */
    readonly _vector = new THREE.Vector3()
    /** Typed view exposing optional batch/object ids on intersections. */
    readonly _typedBatchIntersects: Array<
      THREE.Intersection & { batchId?: number; objectId?: string }
    > = this._batchIntersects as Array<
      THREE.Intersection & { batchId?: number; objectId?: string }
    >

    get mappingStats() {
      return getMappingStats(this._geometryInfo)
    }

    validateGeometryId(geometryId: number) {
      validateGeometryId(geometryId, this._geometryInfo, options.typeName)
    }

    computeBoundingBox() {
      this.boundingBox = computeBoundingBox(
        this.boundingBox,
        this._geometryInfo
      )
    }

    computeBoundingSphere() {
      this.boundingSphere = computeBoundingSphere(
        this.boundingSphere,
        this._geometryInfo,
        (geometryId, target) =>
          (
            this as unknown as AcTrBatchBaseObject & AcTrBatchBounds
          ).getBoundingSphereAt(geometryId, target)
      )
    }

    setVisibleAt(geometryId: number, value: boolean) {
      this.validateGeometryId(geometryId)

      if (this._geometryInfo[geometryId].visible === value) {
        return this
      }

      this._geometryInfo[geometryId].visible = value

      return this
    }

    getVisibleAt(geometryId: number) {
      this.validateGeometryId(geometryId)
      return this._geometryInfo[geometryId].visible
    }

    deleteGeometry(geometryId: number) {
      const deleted = deleteGeometryById(
        geometryId,
        this._geometryInfo,
        this._availableGeometryIds
      )
      if (!deleted) {
        return this
      }

      return this
    }

    getObjectAt(batchId: number) {
      const object = options.createObject()
      this._initializeRaycastObject(object)
      const geometryInfo = this._geometryInfo[batchId]
      const { start, count } = options.getDrawRange(this, geometryInfo)
      this._setRaycastObjectInfo(object, batchId, start, count)
      return object
    }

    intersectWith(
      geometryId: number,
      raycaster: THREE.Raycaster,
      intersects: THREE.Intersection[]
    ) {
      this._initializeRaycastObject(this._raycastObject)
      this._intersectWith(geometryId, raycaster, intersects)
      this._resetRaycastObjectInfo(this._raycastObject)
    }

    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
      this._initializeRaycastObject(this._raycastObject)

      for (let i = 0, l = this._geometryInfo.length; i < l; i++) {
        this._intersectWith(i, raycaster, intersects)
      }
      this._resetRaycastObjectInfo(this._raycastObject)
    }

    dispose() {
      this.geometry.dispose()
      return this
    }

    _initializeRaycastObject(raycastObject: AcTrBatchBaseObject) {
      initializeRaycastObject(raycastObject, this.geometry, this.material)
    }

    _setRaycastObjectInfo(
      raycastObject: AcTrBatchBaseObject,
      index: number,
      start: number,
      count: number
    ) {
      const self = this as unknown as AcTrBatchBaseObject & AcTrBatchBounds
      self.getBoundingBoxAt(index, this._box)
      self.getBoundingSphereAt(index, this._sphere)
      setRaycastObjectInfo(raycastObject, start, count, this._box, this._sphere)
    }

    _resetRaycastObjectInfo(raycastObject: AcTrBatchBaseObject) {
      resetRaycastObjectInfo(raycastObject)
    }

    _intersectWith(
      geometryId: number,
      raycaster: THREE.Raycaster,
      intersects: THREE.Intersection[]
    ) {
      const geometryInfo = this._geometryInfo[geometryId]
      if (!geometryInfo.visible || !geometryInfo.active) {
        return
      }

      if (geometryInfo.bboxIntersectionCheck) {
        ;(
          this as unknown as AcTrBatchBaseObject & AcTrBatchBounds
        ).getBoundingBoxAt(geometryId, this._box)
        if (raycaster.ray.intersectBox(this._box, this._vector)) {
          const distance = raycaster.ray.origin.distanceTo(this._vector)
          ;(
            intersects as Array<
              THREE.Intersection & { batchId?: number; objectId?: string }
            >
          ).push({
            distance,
            point: this._vector.clone(),
            object: this,
            face: null,
            faceIndex: undefined,
            uv: undefined,
            batchId: geometryId,
            objectId: geometryInfo.objectId
          })
        }
      } else {
        const { start, count } = options.getDrawRange(this, geometryInfo)
        this._setRaycastObjectInfo(
          this._raycastObject,
          geometryId,
          start,
          count
        )
        this._raycastObject.raycast(raycaster, this._batchIntersects)

        for (let j = 0, l = this._typedBatchIntersects.length; j < l; j++) {
          const intersect = this._typedBatchIntersects[j]
          intersect.object = this
          intersect.batchId = geometryId
          intersect.objectId = geometryInfo.objectId
          intersects.push(intersect)
        }

        this._batchIntersects.length = 0
      }
    }
  }
}
