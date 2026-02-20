import * as THREE from 'three'

import {
  AcTrBatchedGeometryInfo,
  AcTrBatchGeometryUserData,
  copyArrayContents
} from './AcTrBatchedGeometryInfo'
import {
  applyGeometryAt,
  assertReservedCapacity,
  createAcTrBatchedMixin,
  createGeometryState,
  growCapacityIfNeeded,
  initializeGeometry,
  reserveGeometryId,
  resolveReservedCount,
  validateGeometry
} from './AcTrBatchedMixin'

const _box = /*@__PURE__*/ new THREE.Box3()
const _vector = /*@__PURE__*/ new THREE.Vector3()

const AcTrBatchedMeshBase = createAcTrBatchedMixin<AcTrBatchedGeometryInfo>(
  THREE.Mesh,
  {
    typeName: 'AcTrBatchedMesh',
    createObject: () => new THREE.Mesh(),
    getDrawRange: (instance, geometryInfo) =>
      instance.geometry.index != null
        ? { start: geometryInfo.indexStart, count: geometryInfo.indexCount }
        : { start: geometryInfo.vertexStart, count: geometryInfo.vertexCount }
  }
)

/**
 * Batched renderer for `THREE.Mesh` geometry.
 *
 * All compatible mesh geometries are packed into shared attribute/index buffers
 * per material to reduce draw calls.
 */
export class AcTrBatchedMesh extends AcTrBatchedMeshBase {
  private static readonly GROWTH_FACTOR = 1.25

  /** Current allocated vertex capacity. */
  private _maxVertexCount: number
  /** Current allocated index capacity. */
  private _maxIndexCount: number

  /** Next free index offset for appended geometries. */
  private _nextIndexStart = 0
  /** Next free vertex offset for appended geometries. */
  private _nextVertexStart = 0

  /** Whether packed geometry buffers have been allocated. */
  private _geometryInitialized = false

  constructor(
    maxVertexCount: number = 1000,
    maxIndexCount: number = maxVertexCount * 2,
    material?: THREE.Material
  ) {
    super(new THREE.BufferGeometry(), material)
    this.frustumCulled = false

    // cached user options
    this._maxVertexCount = maxVertexCount
    this._maxIndexCount = maxIndexCount
  }

  get unusedVertexCount() {
    return this._maxVertexCount - this._nextVertexStart
  }

  get unusedIndexCount() {
    return this._maxIndexCount - this._nextIndexStart
  }

  private _initializeGeometry(reference: THREE.BufferGeometry) {
    if (this._geometryInitialized === false) {
      initializeGeometry(
        this.geometry,
        reference,
        this._maxVertexCount,
        this._maxIndexCount
      )
      this._geometryInitialized = true
    }
  }

  // Make sure the geometry is compatible with the existing combined geometry attributes
  private _validateGeometry(geometry: THREE.BufferGeometry) {
    validateGeometry(this.geometry, geometry, 'AcTrBatchedMesh', true)
  }

  private _resizeSpaceIfNeeded(geometry: THREE.BufferGeometry) {
    const index = geometry.getIndex()
    const newMaxIndexCount =
      index == null
        ? this._maxIndexCount
        : growCapacityIfNeeded({
            currentMaxCount: this._maxIndexCount,
            nextStart: this._nextIndexStart,
            requiredCount: index.count,
            growthFactor: AcTrBatchedMesh.GROWTH_FACTOR
          })

    const positionAttribute = geometry.getAttribute('position')
    const newMaxVertexCount =
      positionAttribute == null
        ? this._maxVertexCount
        : growCapacityIfNeeded({
            currentMaxCount: this._maxVertexCount,
            nextStart: this._nextVertexStart,
            requiredCount: positionAttribute.count,
            growthFactor: AcTrBatchedMesh.GROWTH_FACTOR
          })

    if (
      newMaxIndexCount > this._maxIndexCount ||
      newMaxVertexCount > this._maxVertexCount
    ) {
      this.setGeometrySize(newMaxVertexCount, newMaxIndexCount)
    }
  }

  /**
   * Appends one mesh geometry into packed buffers.
   */
  addGeometry(
    geometry: THREE.BufferGeometry,
    reservedVertexCount: number = -1,
    reservedIndexCount: number = -1
  ) {
    // Remove uv and normal to save memory
    if (geometry.hasAttribute('uv')) {
      geometry.deleteAttribute('uv')
    }
    if (geometry.hasAttribute('normal')) {
      geometry.deleteAttribute('normal')
    }
    this._initializeGeometry(geometry)
    this._validateGeometry(geometry)

    this._resizeSpaceIfNeeded(geometry)

    const positionCount = geometry.getAttribute('position').count
    const index = geometry.getIndex()
    const geometryInfo: AcTrBatchedGeometryInfo = {
      // geometry information
      vertexStart: this._nextVertexStart,
      vertexCount: -1,
      reservedVertexCount: resolveReservedCount(
        reservedVertexCount,
        positionCount
      ),

      indexStart: index ? this._nextIndexStart : -1,
      indexCount: -1,
      reservedIndexCount: index
        ? resolveReservedCount(reservedIndexCount, index.count)
        : 0,

      // state
      ...createGeometryState()
    }

    assertReservedCapacity({
      typeName: 'AcTrBatchedMesh',
      maxVertexCount: this._maxVertexCount,
      vertexStart: geometryInfo.vertexStart,
      reservedVertexCount: geometryInfo.reservedVertexCount,
      maxIndexCount: this._maxIndexCount,
      indexStart: geometryInfo.indexStart,
      reservedIndexCount: geometryInfo.reservedIndexCount
    })

    // update id
    const { geometryId, geometryCount } = reserveGeometryId(
      this._availableGeometryIds,
      this._geometryInfo,
      this._geometryCount,
      geometryInfo
    )
    this._geometryCount = geometryCount

    // update the geometry
    this.setGeometryAt(geometryId, geometry)

    // increment the next geometry position
    this._nextIndexStart =
      geometryInfo.indexStart + geometryInfo.reservedIndexCount
    this._nextVertexStart =
      geometryInfo.vertexStart + geometryInfo.reservedVertexCount

    this._syncDrawRange()

    return geometryId
  }

  /**
   * Assigns entity metadata for one packed geometry id.
   */
  setGeometryInfo(geometryId: number, userData: AcTrBatchGeometryUserData) {
    if (geometryId >= this._geometryCount) {
      throw new Error('AcTrBatchedMesh: Maximum geometry count reached.')
    }
    const geometryInfo = this._geometryInfo[geometryId]
    geometryInfo.objectId = userData.objectId
    geometryInfo.bboxIntersectionCheck = userData.bboxIntersectionCheck
  }

  /**
   * Rewrites geometry payload for one packed geometry id.
   */
  setGeometryAt(geometryId: number, geometry: THREE.BufferGeometry) {
    if (geometryId >= this._geometryCount) {
      throw new Error('AcTrBatchedMesh: Maximum geometry count reached.')
    }

    this._validateGeometry(geometry)

    const batchGeometry = this.geometry
    const geometryInfo = this._geometryInfo[geometryId]
    applyGeometryAt(geometryInfo, batchGeometry, geometry, 'AcTrBatchedMesh')

    return geometryId
  }

  /**
   * Compacts active geometry ranges to reclaim deleted-space gaps.
   */
  optimize() {
    const geometry = this.geometry
    const hasIndex = geometry.index !== null

    const attributes = geometry.attributes
    const indexAttr = geometry.index

    let nextVertexStart = 0
    let nextIndexStart = 0

    // Sort ACTIVE geometries by current vertex position
    const activeInfos = this._geometryInfo
      .map((info, i) => ({ info, i }))
      .filter(e => e.info.active)
      .sort((a, b) => a.info.vertexStart - b.info.vertexStart)

    // ---- pack active geometries ----
    for (const { info } of activeInfos) {
      const vertexCount = info.vertexCount
      const indexCount = hasIndex ? info.indexCount : 0

      const oldVertexStart = info.vertexStart
      const oldIndexStart = info.indexStart

      // ---- move vertices ----
      if (oldVertexStart !== nextVertexStart) {
        for (const key in attributes) {
          const attr = attributes[key] as THREE.BufferAttribute
          const { array, itemSize } = attr

          array.copyWithin(
            nextVertexStart * itemSize,
            oldVertexStart * itemSize,
            (oldVertexStart + vertexCount) * itemSize
          )

          attr.addUpdateRange(
            nextVertexStart * itemSize,
            vertexCount * itemSize
          )
          attr.needsUpdate = true
        }

        info.vertexStart = nextVertexStart
      }

      // ---- move & remap indices ----
      if (hasIndex && indexAttr) {
        if (oldIndexStart !== nextIndexStart) {
          const indexArray = indexAttr.array
          const delta = nextVertexStart - oldVertexStart

          // copy + remap indices safely
          for (let i = 0; i < indexCount; i++) {
            indexArray[nextIndexStart + i] =
              indexArray[oldIndexStart + i] + delta
          }

          indexAttr.addUpdateRange(nextIndexStart, indexCount)
          indexAttr.needsUpdate = true

          info.indexStart = nextIndexStart
        }
      }

      // ---- update draw info ----
      nextVertexStart += vertexCount
      nextIndexStart += indexCount
    }

    // ---- clear unused index tail (safety) ----
    if (hasIndex && indexAttr) {
      const array = indexAttr.array
      for (let i = nextIndexStart, l = array.length; i < l; i++) {
        array[i] = 0
      }
      indexAttr.needsUpdate = true
    }

    // ---- update internal cursors ----
    this._nextVertexStart = nextVertexStart
    this._nextIndexStart = nextIndexStart

    this._syncDrawRange()

    this._availableGeometryIds.length = 0

    return this
  }

  /**
   * Returns cached bounds for one geometry id, computing lazily on first use.
   */
  getBoundingBoxAt(geometryId: number, target: THREE.Box3) {
    if (geometryId >= this._geometryCount) {
      return null
    }

    // compute bounding box
    const geometry = this.geometry
    const geometryInfo = this._geometryInfo[geometryId]
    if (geometryInfo.boundingBox === null) {
      const box = new THREE.Box3()
      const index = geometry.index
      const position = geometry.attributes.position
      const { start, count } =
        index != null
          ? { start: geometryInfo.indexStart, count: geometryInfo.indexCount }
          : { start: geometryInfo.vertexStart, count: geometryInfo.vertexCount }
      for (let i = start, l = start + count; i < l; i++) {
        let iv = i
        if (index) {
          iv = index.getX(iv)
        }

        box.expandByPoint(_vector.fromBufferAttribute(position, iv))
      }

      geometryInfo.boundingBox = box
    }

    target.copy(geometryInfo.boundingBox)
    return target
  }

  /**
   * Returns cached bounding sphere for one geometry id.
   */
  getBoundingSphereAt(geometryId: number, target: THREE.Sphere) {
    if (geometryId >= this._geometryCount) {
      return null
    }
    this.getBoundingBoxAt(geometryId, _box)
    _box.getBoundingSphere(target)
    return target
  }

  getGeometryRangeAt(geometryId: number) {
    this.validateGeometryId(geometryId)
    return this._geometryInfo[geometryId]
  }

  /**
   * Resizes packed geometry buffers while preserving existing data.
   */
  setGeometrySize(maxVertexCount: number, maxIndexCount: number) {
    // dispose of the previous geometry
    const oldGeometry = this.geometry
    oldGeometry.dispose()

    // recreate the geometry needed based on the previous variant
    this._maxVertexCount = maxVertexCount
    this._maxIndexCount = maxIndexCount

    if (this._geometryInitialized) {
      this._geometryInitialized = false
      this.geometry = new THREE.BufferGeometry()
      this._initializeGeometry(oldGeometry)
    }

    // copy data from the previous geometry
    const geometry = this.geometry
    if (oldGeometry.index) {
      copyArrayContents(oldGeometry.index.array, geometry.index!.array)
    }

    for (const key in oldGeometry.attributes) {
      copyArrayContents(
        oldGeometry.attributes[key].array,
        geometry.attributes[key].array
      )
    }
    this._syncDrawRange()
  }

  /**
   * Before calling optimize(), drawRange defaults to { start: 0, count: Infinity }.
   * After calling , you need to explicitly shrink it to the exact active range.
   */
  private _syncDrawRange() {
    const geometry = this.geometry
    if (geometry.index) {
      geometry.setDrawRange(0, this._nextIndexStart)
    } else {
      geometry.setDrawRange(0, this._nextVertexStart)
    }
  }

  /**
   * Deep-copies batched geometry state.
   */
  copy(source: AcTrBatchedMesh) {
    super.copy(source)

    this.geometry = source.geometry.clone()
    this.boundingBox =
      source.boundingBox !== null ? source.boundingBox.clone() : null
    this.boundingSphere =
      source.boundingSphere !== null ? source.boundingSphere.clone() : null

    this._geometryInfo = source._geometryInfo.map(info => ({
      ...info,
      boundingBox: info.boundingBox !== null ? info.boundingBox.clone() : null
    }))

    this._maxVertexCount = source._maxVertexCount
    this._maxIndexCount = source._maxIndexCount

    this._geometryInitialized = source._geometryInitialized
    this._geometryCount = source._geometryCount

    return this
  }
}
