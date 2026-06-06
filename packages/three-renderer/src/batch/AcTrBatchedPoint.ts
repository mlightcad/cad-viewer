import * as THREE from 'three'

import { AcTrBufferGeometryUtil } from '../util/AcTrBufferGeometryUtil'
import type { AcTrBatchedContainerUserData } from '../util/AcTrObjectUserData'
import {
  AcTrBatchGeometryUserData,
  AcTrVertexBatchGeometryInfo,
  copyArrayContents,
  isBatchGeometryActive
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
import { syncBatchDrawVisibilityAfterOptimize } from './drawVisibility'

/**
 * Per-slot geometry-info type used by {@link AcTrBatchedPoint}.
 *
 * Point batches are non-indexed; this alias omits index-range fields present
 * on {@link AcTrBatchedGeometryInfo}.
 */
export type AcTrBatchedGeometryInfo = AcTrVertexBatchGeometryInfo

/** Reusable scratch box for bounds queries. */
const _box = /*@__PURE__*/ new THREE.Box3()
/** Reusable scratch vector for bounds expansion. */
const _vector = /*@__PURE__*/ new THREE.Vector3()

/**
 * Mixin base produced by {@link createAcTrBatchedMixin} for non-indexed point batches.
 *
 * @internal Not exported; extended by {@link AcTrBatchedPoint}.
 */
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
 * Batched renderer for {@link THREE.Points}.
 *
 * Point geometries are packed into a shared non-indexed attribute buffer to
 * reduce draw calls. Each point entity receives a stable geometry id for
 * updates, visibility toggles, and hit-testing.
 *
 * @see {@link AcTrBatchedMesh} for mesh batching.
 * @see {@link AcTrBatchedLine} for line segment batching.
 */
export class AcTrBatchedPoint extends AcTrBatchedPointBase {
  /** Typed container metadata attached to the batch object. */
  declare userData: AcTrBatchedContainerUserData

  /** Multiplier applied when auto-growing vertex buffer capacity. */
  private static readonly GROWTH_FACTOR = 1.25

  /**
   * Stable world-space origin for this batch.
   *
   * Set from the first appended geometry's bounding-box center plus offset.
   * Vertex positions are stored relative to this origin to improve floating-point
   * precision for large-coordinate CAD data.
   */
  private _origin?: THREE.Vector3

  /** Current allocated vertex capacity of the packed attribute buffer. */
  private _maxVertexCount: number

  /** Next free vertex offset for appended geometries. */
  private _nextVertexStart = 0

  /** Whether packed geometry buffers have been allocated from a reference layout. */
  private _geometryInitialized = false

  /**
   * Creates a new point batch with preallocated vertex capacity.
   *
   * @param maxVertexCount - Initial vertex capacity; defaults to `1000`.
   * @param material - Optional shared material for all sub-geometries in this batch.
   */
  constructor(maxVertexCount: number = 1000, material?: THREE.Material) {
    super(new THREE.BufferGeometry(), material)
    this.frustumCulled = false

    // cached user options
    this._maxVertexCount = maxVertexCount
  }

  /**
   * Total number of geometry ids ever allocated in this batch.
   *
   * @returns Current `_geometryCount` value.
   */
  get geometryCount() {
    return this._geometryCount
  }

  /**
   * Number of unused vertex slots remaining before the next buffer resize.
   *
   * @returns Remaining vertex capacity (`maxVertexCount - nextVertexStart`).
   */
  get unusedVertexCount() {
    return this._maxVertexCount - this._nextVertexStart
  }

  /**
   * Allocates packed attribute buffers on first geometry insertion.
   *
   * Point batches are non-indexed; `maxIndexCount` is passed as `null`.
   *
   * @param reference - First (or representative) geometry defining batch layout.
   */
  private _initializeGeometry(reference: THREE.BufferGeometry) {
    if (this._geometryInitialized === false) {
      initializeGeometry(this.geometry, reference, this._maxVertexCount, null)
      this._geometryInitialized = true
    }
  }

  /**
   * Ensures the incoming geometry matches the batch attribute layout.
   *
   * Index buffers are not required or validated for point batches.
   *
   * @param geometry - Candidate geometry to append or update.
   * @throws {Error} When attribute layout is incompatible with the existing batch.
   */
  private _validateGeometry(geometry: THREE.BufferGeometry) {
    validateGeometry(this.geometry, geometry, 'AcTrBatchedPoint', false)
  }

  /**
   * Grows vertex buffer capacity when the next append would overflow.
   *
   * @param geometry - Incoming geometry whose vertex count drives the growth calculation.
   */
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
   *
   * Disposes GPU buffers, clears geometry-info records, resets the batch origin
   * and world position, and marks buffers as uninitialized for the next insert.
   */
  reset() {
    this.boundingBox = null
    this.boundingSphere = null

    this._geometryInfo = []
    this._availableGeometryIds = []

    this._nextVertexStart = 0
    this._geometryCount = 0
    this._geometryInfo.length = 0

    this._origin = undefined
    this.position.set(0, 0, 0)
    this._geometryInitialized = false
    this.geometry.dispose()
  }

  /**
   * Appends one point geometry into the packed vertex buffer.
   *
   * Rebases vertices to the batch origin, reserves a geometry id, and copies
   * attribute data into the shared buffer.
   *
   * @param geometry - Source point geometry to pack. Mutated in place (rebase).
   * @param reservedVertexCount - Reserved vertex span for in-place updates; `-1` uses actual count.
   * @param worldOffset - World-space offset applied before rebasing to the batch origin.
   * @returns The assigned geometry id for subsequent updates and metadata binding.
   * @throws {Error} When reserved space exceeds buffer capacity or layout is incompatible.
   */
  addGeometry(
    geometry: THREE.BufferGeometry,
    reservedVertexCount: number = -1,
    worldOffset: THREE.Vector3 = new THREE.Vector3()
  ) {
    this.rebaseGeometryInPlace(geometry, worldOffset)
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
   * Rebases geometry vertex positions into the batch's local coordinate frame.
   *
   * @param geometry - Geometry whose `position` attribute is mutated in place.
   * @param worldOffset - World-space placement offset for the geometry.
   */
  private rebaseGeometryInPlace(
    geometry: THREE.BufferGeometry,
    worldOffset: THREE.Vector3
  ) {
    const position = geometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined
    if (!position) {
      return
    }

    if (!this._origin) {
      AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
      const center = geometry.boundingBox
        ? geometry.boundingBox.getCenter(new THREE.Vector3())
        : new THREE.Vector3()
      this._origin = center.add(worldOffset.clone())
      this.position.copy(this._origin)
    }

    const origin = this._origin
    if (!origin) {
      return
    }

    const array = position.array
    if (array instanceof Float32Array) {
      for (let i = 0; i < array.length; i += 3) {
        array[i] = array[i] + worldOffset.x - origin.x
        array[i + 1] = array[i + 1] + worldOffset.y - origin.y
        array[i + 2] = array[i + 2] + worldOffset.z - origin.z
      }
      position.needsUpdate = true
      return
    }

    for (let i = 0; i < position.count; i++) {
      position.setXYZ(
        i,
        position.getX(i) + worldOffset.x - origin.x,
        position.getY(i) + worldOffset.y - origin.y,
        position.getZ(i) + worldOffset.z - origin.z
      )
    }
    position.needsUpdate = true
  }

  /**
   * Assigns entity metadata for one packed geometry id.
   *
   * Copies optional source point `position` for symbol regeneration workflows.
   *
   * @param geometryId - Target slot index returned by {@link addGeometry}.
   * @param userData - Entity metadata including optional source point position.
   * @throws {Error} When `geometryId` is out of range.
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
   * Rewrites geometry payload for one existing packed geometry id.
   *
   * @param geometryId - Target slot index.
   * @param geometry - New geometry payload to copy into the packed buffers.
   * @returns The same `geometryId` for chaining.
   * @throws {Error} When the id is out of range, layout is incompatible, or
   *   the source exceeds reserved capacity.
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
   * Compacts active geometry ranges to reclaim gaps left by deletions.
   *
   * Moves vertex attributes so active slots are contiguous. Advances cursors by
   * **reserved** vertex spans to preserve in-place update capacity.
   *
   * @returns This instance for chaining.
   */
  optimize() {
    let nextVertexStart = 0
    const geometry = this.geometry
    const geometryInfoList = this._geometryInfo

    // Sort ACTIVE geometries by original buffer order
    const indices = geometryInfoList
      .map((_g, i) => i)
      .filter(i => isBatchGeometryActive(geometryInfoList[i].flags))
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

    syncBatchDrawVisibilityAfterOptimize(geometry, geometryInfoList)

    return this
  }

  /**
   * Returns cached axis-aligned bounds for one geometry id.
   *
   * Iterates the slot's vertex range in the non-indexed position buffer.
   *
   * @param geometryId - Slot index to query.
   * @param target - Reusable {@link THREE.Box3} that receives the result.
   * @returns `target` when the id is valid, otherwise `null`.
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
   *
   * @param geometryId - Slot index to query.
   * @param target - Reusable {@link THREE.Sphere} that receives the result.
   * @returns `target` when the id is valid, otherwise `null`.
   */
  getBoundingSphereAt(geometryId: number, target: THREE.Sphere) {
    if (geometryId >= this._geometryCount) {
      return null
    }
    this.getBoundingBoxAt(geometryId, _box)
    _box.getBoundingSphere(target)
    return target
  }

  /**
   * Returns the geometry-info record for one slot after validation.
   *
   * @param geometryId - Slot index to query.
   * @returns The internal {@link AcTrBatchedGeometryInfo} record.
   * @throws {Error} When the id is invalid or the slot has been deleted.
   */
  getGeometryAt(geometryId: number) {
    this.validateGeometryId(geometryId)
    return this._geometryInfo[geometryId]
  }

  /**
   * Resizes packed point buffers while preserving existing data.
   *
   * @param maxVertexCount - New vertex capacity.
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
   * Keeps `geometry.drawRange` in sync with the packed active vertex extent.
   *
   * Call after `addGeometry`, `optimize`, or `setGeometrySize`.
   */
  private _syncDrawRange() {
    this.geometry.setDrawRange(0, this._nextVertexStart)
  }

  /**
   * Deep-copies batched point state from another instance.
   *
   * @param source - Batch instance to copy from.
   * @returns This instance for chaining.
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
    this._origin = source._origin?.clone()

    return this
  }
}
