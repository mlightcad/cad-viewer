import * as THREE from 'three'

import {
  AcTrBatchGeometryUserData,
  AcTrVertexBatchGeometryInfo,
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

export type AcTrBatchedGeometryInfo = AcTrVertexBatchGeometryInfo

const _box = /*@__PURE__*/ new THREE.Box3()
const _vector = /*@__PURE__*/ new THREE.Vector3()

const AcTrBatchedPointBase = createAcTrBatchedMixin<AcTrBatchedGeometryInfo>(
  THREE.Points,
  {
    typeName: 'AcTrBatchedPoint',
    createObject: () => new THREE.Points(),
    getDrawRange: (_instance, geometryInfo) => ({
      start: geometryInfo.vertexStart,
      count: geometryInfo.vertexCount
    })
  }
)

/**
 * Batched renderer for `THREE.Points`.
 *
 * Point geometries are packed into a shared non-indexed attribute buffer.
 */
export class AcTrBatchedPoint extends AcTrBatchedPointBase {
  private static readonly GROWTH_FACTOR = 1.25

  /** Current allocated vertex capacity. */
  private _maxVertexCount: number

  /** Next free vertex offset for appended geometries. */
  private _nextVertexStart = 0

  /** Whether packed geometry buffers have been allocated. */
  private _geometryInitialized = false

  constructor(maxVertexCount: number = 1000, material?: THREE.Material) {
    super(new THREE.BufferGeometry(), material)
    this.frustumCulled = false

    // cached user options
    this._maxVertexCount = maxVertexCount
  }

  get geometryCount() {
    return this._geometryCount
  }

  get unusedVertexCount() {
    return this._maxVertexCount - this._nextVertexStart
  }

  private _initializeGeometry(reference: THREE.BufferGeometry) {
    if (this._geometryInitialized === false) {
      initializeGeometry(this.geometry, reference, this._maxVertexCount, null)
      this._geometryInitialized = true
    }
  }

  // Make sure the geometry is compatible with the existing combined geometry attributes
  private _validateGeometry(geometry: THREE.BufferGeometry) {
    validateGeometry(this.geometry, geometry, 'AcTrBatchedPoint', false)
  }

  private _resizeSpaceIfNeeded(geometry: THREE.BufferGeometry) {
    const positionAttribute = geometry.getAttribute('position')
    const newMaxVertexCount =
      positionAttribute == null
        ? this._maxVertexCount
        : growCapacityIfNeeded({
            currentMaxCount: this._maxVertexCount,
            nextStart: this._nextVertexStart,
            requiredCount: positionAttribute.count,
            growthFactor: AcTrBatchedPoint.GROWTH_FACTOR
          })

    if (newMaxVertexCount > this._maxVertexCount) {
      this.setGeometrySize(newMaxVertexCount)
    }
  }

  /**
   * Clears all packed point ranges and resets internal cursor state.
   */
  reset() {
    this.boundingBox = null
    this.boundingSphere = null

    this._geometryInfo = []
    this._availableGeometryIds = []

    this._nextVertexStart = 0
    this._geometryCount = 0
    this._geometryInfo.length = 0

    this._geometryInitialized = false
    this.geometry.dispose()
  }

  /**
   * Appends one point geometry into packed buffers.
   */
  addGeometry(
    geometry: THREE.BufferGeometry,
    reservedVertexCount: number = -1
  ) {
    this._initializeGeometry(geometry)
    this._validateGeometry(geometry)

    this._resizeSpaceIfNeeded(geometry)

    const positionCount = geometry.getAttribute('position').count
    const geometryInfo: AcTrBatchedGeometryInfo = {
      // geometry information
      vertexStart: this._nextVertexStart,
      vertexCount: -1,
      reservedVertexCount: resolveReservedCount(
        reservedVertexCount,
        positionCount
      ),

      // state
      ...createGeometryState()
    }

    assertReservedCapacity({
      typeName: 'AcTrBatchedPoint',
      maxVertexCount: this._maxVertexCount,
      vertexStart: geometryInfo.vertexStart,
      reservedVertexCount: geometryInfo.reservedVertexCount
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
    this._nextVertexStart =
      geometryInfo.vertexStart + geometryInfo.reservedVertexCount
    this.geometry.setDrawRange(0, this._nextVertexStart)

    this._syncDrawRange()

    return geometryId
  }

  /**
   * Assigns entity metadata for one packed geometry id.
   */
  setGeometryInfo(geometryId: number, userData: AcTrBatchGeometryUserData) {
    if (geometryId >= this._geometryCount) {
      throw new Error('AcTrBatchedPoint: Maximum geometry count reached.')
    }
    const geometryInfo = this._geometryInfo[geometryId]
    const position = userData.position
    if (position) geometryInfo.position = { ...position }
    geometryInfo.objectId = userData.objectId
    geometryInfo.bboxIntersectionCheck = userData.bboxIntersectionCheck
  }

  /**
   * Rewrites geometry payload for one packed geometry id.
   */
  setGeometryAt(geometryId: number, geometry: THREE.BufferGeometry) {
    if (geometryId >= this._geometryCount) {
      throw new Error('AcTrBatchedPoint: Maximum geometry count reached.')
    }

    this._validateGeometry(geometry)

    const batchGeometry = this.geometry
    const geometryInfo = this._geometryInfo[geometryId]

    applyGeometryAt(geometryInfo, batchGeometry, geometry, 'AcTrBatchedPoint')

    return geometryId
  }

  /**
   * Compacts active geometry ranges to reclaim deleted-space gaps.
   */
  optimize() {
    let nextVertexStart = 0
    const geometry = this.geometry
    const geometryInfoList = this._geometryInfo

    // Sort ACTIVE geometries by original buffer order
    const indices = geometryInfoList
      .map((_g, i) => i)
      .filter(i => geometryInfoList[i].active)
      .sort(
        (a, b) =>
          geometryInfoList[a].vertexStart - geometryInfoList[b].vertexStart
      )

    // ---- pack active geometries ----
    for (let k = 0; k < indices.length; k++) {
      const id = indices[k]
      const info = geometryInfoList[id]

      const oldVertexStart = info.vertexStart
      const count = info.reservedVertexCount

      if (oldVertexStart !== nextVertexStart) {
        for (const key in geometry.attributes) {
          const attr = geometry.attributes[key] as THREE.BufferAttribute
          const { array, itemSize } = attr

          array.copyWithin(
            nextVertexStart * itemSize,
            oldVertexStart * itemSize,
            (oldVertexStart + count) * itemSize
          )

          attr.addUpdateRange(nextVertexStart * itemSize, count * itemSize)
          attr.needsUpdate = true
        }

        info.vertexStart = nextVertexStart
      }

      nextVertexStart += count
    }

    // ---- update authoritative state ----
    this._nextVertexStart = nextVertexStart

    // ---- sync GPU draw range ----
    this._syncDrawRange()

    // ---- reset reusable ids ----
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
      for (
        let i = geometryInfo.vertexStart,
          l = geometryInfo.vertexStart + geometryInfo.vertexCount;
        i < l;
        i++
      ) {
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

  getGeometryAt(geometryId: number) {
    this.validateGeometryId(geometryId)
    return this._geometryInfo[geometryId]
  }

  /**
   * Resizes packed point buffers while preserving existing data.
   */
  setGeometrySize(maxVertexCount: number) {
    // dispose of the previous geometry
    const oldGeometry = this.geometry
    oldGeometry.dispose()

    // recreate the geometry needed based on the previous variant
    this._maxVertexCount = maxVertexCount

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
   * Keeps geometry.drawRange in sync with active vertex data.
   * Call after add / optimize / resize.
   */
  private _syncDrawRange() {
    this.geometry.setDrawRange(0, this._nextVertexStart)
  }

  /**
   * Deep-copies batched point state.
   */
  copy(source: AcTrBatchedPoint) {
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

    this._geometryInitialized = source._geometryInitialized
    this._geometryCount = source._geometryCount

    return this
  }
}
