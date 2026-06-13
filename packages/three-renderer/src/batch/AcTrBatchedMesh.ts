import * as THREE from 'three'

import { AcTrBufferGeometryUtil } from '../util/AcTrBufferGeometryUtil'
import type { AcTrBatchedContainerUserData } from '../util/AcTrObjectUserData'
import {
  AcTrBatchedGeometryInfo,
  AcTrBatchGeometryUserData,
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

/** Reusable scratch box for bounds queries. */
const _box = /*@__PURE__*/ new THREE.Box3()
/** Reusable scratch vector for bounds expansion. */
const _vector = /*@__PURE__*/ new THREE.Vector3()

/**
 * Mixin base produced by {@link createAcTrBatchedMixin} for indexed mesh batches.
 *
 * @internal Not exported; extended by {@link AcTrBatchedMesh}.
 */
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
 * Batched renderer for {@link THREE.Mesh} geometry.
 *
 * All compatible mesh geometries sharing the same attribute layout and material
 * are packed into shared vertex/index buffers to reduce draw calls. Each inserted
 * geometry receives a stable integer id used for updates, deletion, visibility
 * toggles, and hit-testing.
 *
 * @see {@link AcTrBatchedLine} for line segment batching.
 * @see {@link AcTrBatchedPoint} for point batching.
 */
export class AcTrBatchedMesh extends AcTrBatchedMeshBase {
  /** Typed container metadata attached to the batch object. */
  declare userData: AcTrBatchedContainerUserData

  /** Multiplier applied when auto-growing vertex/index buffer capacity. */
  private static readonly GROWTH_FACTOR = 1.25

  /**
   * Stable world-space origin for this batch.
   *
   * Set from the first appended geometry's bounding-box center plus offset.
   * Vertex positions are stored relative to this origin to improve floating-point
   * precision for large-coordinate CAD data.
   */
  private _origin?: THREE.Vector3

  /** Current allocated vertex capacity of the packed attribute buffers. */
  private _maxVertexCount: number
  /** Current allocated index capacity of the packed index buffer. */
  private _maxIndexCount: number

  /** Next free index offset for appended geometries. */
  private _nextIndexStart = 0
  /** Next free vertex offset for appended geometries. */
  private _nextVertexStart = 0

  /** Whether packed geometry buffers have been allocated from a reference layout. */
  private _geometryInitialized = false

  /**
   * Creates a new mesh batch with preallocated buffer capacities.
   *
   * @param maxVertexCount - Initial vertex capacity; defaults to `1000`.
   * @param maxIndexCount - Initial index capacity; defaults to `maxVertexCount * 2`.
   * @param material - Optional shared material for all sub-geometries in this batch.
   */
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

  /**
   * Number of unused vertex slots remaining before the next buffer resize.
   *
   * @returns Remaining vertex capacity (`maxVertexCount - nextVertexStart`).
   */
  get unusedVertexCount() {
    return this._maxVertexCount - this._nextVertexStart
  }

  /**
   * Number of unused index entries remaining before the next buffer resize.
   *
   * @returns Remaining index capacity (`maxIndexCount - nextIndexStart`).
   */
  get unusedIndexCount() {
    return this._maxIndexCount - this._nextIndexStart
  }

  /** World-space origin used when rebasing packed vertex data, if established. */
  get origin() {
    return this._origin
  }

  /**
   * Allocates packed attribute/index buffers on first geometry insertion.
   *
   * Uses the incoming geometry as a layout reference for attribute names and types.
   *
   * @param reference - First (or representative) geometry defining batch layout.
   */
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

  /**
   * Ensures the incoming geometry matches the batch attribute/index contract.
   *
   * @param geometry - Candidate geometry to append or update.
   * @throws {Error} When layout is incompatible with the existing batch.
   */
  private _validateGeometry(geometry: THREE.BufferGeometry) {
    validateGeometry(this.geometry, geometry, 'AcTrBatchedMesh', true)
  }

  /**
   * Grows vertex and/or index buffer capacity when the next append would overflow.
   *
   * Applies {@link AcTrBatchedMesh.GROWTH_FACTOR} via {@link growCapacityIfNeeded}.
   *
   * @param geometry - Incoming geometry whose counts drive the growth calculation.
   */
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
   * Appends one mesh geometry into the packed vertex/index buffers.
   *
   * Rebases vertex positions relative to the batch origin, strips `uv` and
   * `normal` attributes to save memory, reserves a geometry id, and copies
   * attribute/index data into the shared buffers.
   *
   * @param geometry - Source mesh geometry to pack. Mutated in place (rebase, attribute removal).
   * @param reservedVertexCount - Reserved vertex span for in-place updates; `-1` uses actual count.
   * @param reservedIndexCount - Reserved index span for in-place updates; `-1` uses actual count.
   * @param worldOffset - World-space offset applied before rebasing to the batch origin.
   * @returns The assigned geometry id for subsequent updates and metadata binding.
   * @throws {Error} When reserved space exceeds buffer capacity or layout is incompatible.
   */
  addGeometry(
    geometry: THREE.BufferGeometry,
    reservedVertexCount: number = -1,
    reservedIndexCount: number = -1,
    worldOffset: THREE.Vector3 = new THREE.Vector3()
  ) {
    this.rebaseGeometryInPlace(geometry, worldOffset)

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
   * Rebases geometry vertex positions into the batch's local coordinate frame.
   *
   * On the first call, establishes `_origin` from the geometry bounding-box
   * center plus `worldOffset` and sets the batch object's world position.
   * Subsequent vertices are translated by `worldOffset - origin`.
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
   * Metadata is copied into the internal geometry-info record and surfaced on
   * raycast intersections via `objectId`.
   *
   * @param geometryId - Target slot index returned by {@link addGeometry}.
   * @param userData - Entity metadata (object id, bbox-only hit test flag, etc.).
   * @throws {Error} When `geometryId` is out of range.
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
   * Rewrites geometry payload for one existing packed geometry id.
   *
   * Source geometry must fit within the slot's originally reserved vertex/index
   * span. Cached bounds for the slot are invalidated.
   *
   * @param geometryId - Target slot index.
   * @param geometry - New geometry payload to copy into the packed buffers.
   * @returns The same `geometryId` for chaining.
   * @throws {Error} When the id is out of range, layout is incompatible, or
   *   the source exceeds reserved capacity.
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
   * Compacts active geometry ranges to reclaim gaps left by deletions.
   *
   * Moves vertex attributes and remaps indices so active slots are contiguous
   * at the start of the packed buffers. Updates internal cursors, draw range,
   * and clears the reusable-id pool.
   *
   * @returns This instance for chaining.
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
      .filter(e => isBatchGeometryActive(e.info.flags))
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

    syncBatchDrawVisibilityAfterOptimize(geometry, this._geometryInfo)

    return this
  }

  /**
   * Returns cached axis-aligned bounds for one geometry id.
   *
   * Computes bounds lazily from packed buffer data on first access and caches
   * the result on the geometry-info record.
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
   *
   * Derived from {@link getBoundingBoxAt} on first access.
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
   * Resizes packed geometry buffers while preserving existing data.
   *
   * Disposes the previous {@link THREE.BufferGeometry}, allocates larger
   * attribute/index arrays, and copies existing buffer contents.
   *
   * @param maxVertexCount - New vertex capacity.
   * @param maxIndexCount - New index capacity.
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
   * Keeps `geometry.drawRange` in sync with the packed active data extent.
   *
   * Uses index count when indexed, otherwise vertex count. Call after
   * `addGeometry`, `optimize`, or `setGeometrySize`.
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
   * Deep-copies batched mesh state from another instance.
   *
   * Clones geometry, aggregate bounds, geometry-info records (including cached
   * per-slot boxes), capacity cursors, and the batch origin.
   *
   * @param source - Batch instance to copy from.
   * @returns This instance for chaining.
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
    this._origin = source._origin?.clone()

    return this
  }
}
