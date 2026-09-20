import * as THREE from 'three'

import { AcTrPointSymbolCreator } from '../geometry/AcTrPointSymbolCreator'
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
/** Reused pre-write slot bounds for the {@link setGeometryAt} fast path. */
const _previousBounds = /*@__PURE__*/ new THREE.Box3()

/**
 * Mixin base produced by {@link createAcTrBatchedMixin} for indexed line batches.
 *
 * @internal Not exported; extended by {@link AcTrBatchedLine}.
 */
const AcTrBatchedLineBase = createAcTrBatchedMixin<AcTrBatchedGeometryInfo>(
  THREE.LineSegments,
  {
    typeName: 'AcTrBatchedLine',
    createObject: () => new THREE.LineSegments(),
    getDrawRange: (instance, geometryInfo) =>
      instance.geometry.index != null
        ? { start: geometryInfo.indexStart, count: geometryInfo.indexCount }
        : { start: geometryInfo.vertexStart, count: geometryInfo.vertexCount }
  }
)

/**
 * Batched renderer for {@link THREE.LineSegments}.
 *
 * Multiple line geometries that share compatible attribute layouts and a material
 * are packed into one combined vertex/index buffer to reduce draw calls. Supports
 * point-symbol line regeneration. Picking uses {@link THREE.LineSegments.raycast}
 * with `raycaster.params.Line.threshold` (distance to segments), not the geometry
 * AABB — hollow shapes must not be selectable via their bounding box interior.
 *
 * @see {@link AcTrBatchedMesh} for mesh batching.
 * @see {@link AcTrBatchedLine2} for wide-line (`Line2`) batching.
 */
export class AcTrBatchedLine extends AcTrBatchedLineBase {
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
   * Creates a new line batch with preallocated buffer capacities.
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
   * Total number of geometry ids ever allocated in this batch.
   *
   * Includes deleted slots until {@link optimize} compacts the id space.
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
    validateGeometry(this.geometry, geometry, 'AcTrBatchedLine', true)
  }

  /**
   * Grows vertex and/or index buffer capacity when the next append would overflow.
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
            growthFactor: AcTrBatchedLine.GROWTH_FACTOR
          })

    const positionAttribute = geometry.getAttribute('position')
    const newMaxVertexCount =
      positionAttribute == null
        ? this._maxVertexCount
        : growCapacityIfNeeded({
            currentMaxCount: this._maxVertexCount,
            nextStart: this._nextVertexStart,
            requiredCount: positionAttribute.count,
            growthFactor: AcTrBatchedLine.GROWTH_FACTOR
          })

    if (
      newMaxIndexCount > this._maxIndexCount ||
      newMaxVertexCount > this._maxVertexCount
    ) {
      this.setGeometrySize(newMaxVertexCount, newMaxIndexCount)
    }
  }

  /**
   * Clears all packed geometry ranges and resets internal cursor state.
   *
   * Disposes GPU buffers, clears geometry-info records, resets the batch origin
   * and world position, and marks buffers as uninitialized for the next insert.
   */
  reset() {
    this.boundingBox = null
    this.boundingSphere = null

    this._geometryInfo = []
    this._availableGeometryIds = []

    this._nextIndexStart = 0
    this._nextVertexStart = 0
    this._geometryCount = 0
    this._geometryInfo.length = 0

    this._origin = undefined
    this.position.set(0, 0, 0)
    this._geometryInitialized = false
    this.geometry.dispose()
  }

  /**
   * Returns per-geometry user metadata for all allocated slots.
   *
   * Used when rebuilding point-symbol line geometry after a display-mode change.
   *
   * @returns Array of {@link AcTrBatchGeometryUserData} extracted from geometry-info records.
   */
  getUserData() {
    const userData: AcTrBatchGeometryUserData[] = []
    const geometryInfoList = this._geometryInfo
    geometryInfoList.forEach(item => {
      userData.push({
        position: item.position,
        objectId: item.objectId,
        bboxIntersectionCheck: item.bboxIntersectionCheck
      })
    })
    return userData
  }

  /**
   * Rebuilds point-symbol batched line geometry for a new point display mode.
   *
   * Backs up entity metadata via {@link getUserData}, clears the batch with
   * {@link reset}, then recreates line geometries from stored point positions
   * using {@link AcTrPointSymbolCreator}.
   *
   * @param displayMode - Point style mode passed to the symbol creator.
   * @param displaySize - Point display size (`PDSIZE`) used to scale symbols.
   */
  resetGeometry(displayMode: number, displaySize: number = 0) {
    // Backup user data
    const userData = this.getUserData()

    // Reset states
    this.reset()

    const creator = AcTrPointSymbolCreator.instance
    userData.forEach(item => {
      if (item.position) {
        const geometry = creator.create(
          displayMode,
          item.position,
          displaySize
        )
        if (geometry.line) {
          const worldOffset = new THREE.Vector3(
            item.position.x,
            item.position.y,
            item.position.z ?? 0
          )
          const geometryId = this.addGeometry(
            geometry.line,
            -1,
            -1,
            worldOffset
          )
          this.setGeometryInfo(geometryId, item)
        }
      }
    })
  }

  /**
   * Appends one line geometry into the packed vertex/index buffers.
   *
   * Rebases vertices to the batch origin, reserves a geometry id, and copies
   * attribute/index data into the shared buffers.
   *
   * @param geometry - Source line geometry to pack. Mutated in place (rebase).
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
      typeName: 'AcTrBatchedLine',
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
    this.setGeometryAt(geometryId, geometry, null)

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
    if (!position) return

    if (!this._origin) {
      AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
      const center = geometry.boundingBox
        ? geometry.boundingBox.getCenter(new THREE.Vector3())
        : new THREE.Vector3()
      this._origin = center.add(worldOffset.clone())
      this.position.copy(this._origin)
    }

    const origin = this._origin
    if (!origin) return

    const arr = position.array
    if (arr instanceof Float32Array) {
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] = arr[i] + worldOffset.x - origin.x
        arr[i + 1] = arr[i + 1] + worldOffset.y - origin.y
        arr[i + 2] = arr[i + 2] + worldOffset.z - origin.z
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
   * Copies optional point `position` in addition to object id and bbox hit-test flag.
   *
   * @param geometryId - Target slot index returned by {@link addGeometry}.
   * @param userData - Entity metadata including optional source point position.
   * @throws {Error} When `geometryId` is out of range.
   */
  setGeometryInfo(geometryId: number, userData: AcTrBatchGeometryUserData) {
    if (geometryId >= this._geometryCount) {
      throw new Error('AcTrBatchedLine: Maximum geometry count reached.')
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
   * @param previousBounds - Pre-write local bounds of the slot. Defaults to a
   *   scan of the current packed vertex range (no cached `Box3` is consulted
   *   or materialized); `addGeometry` passes `null` for freshly reserved
   *   slots so the fast path is skipped on first write.
   * @returns The same `geometryId` for chaining.
   * @throws {Error} When the id is out of range, layout is incompatible, or
   *   the source exceeds reserved capacity.
   */
  setGeometryAt(
    geometryId: number,
    geometry: THREE.BufferGeometry,
    previousBounds: THREE.Box3 | null = this.computeBoundingBoxAt(
      geometryId,
      _previousBounds
    )
  ) {
    if (geometryId >= this._geometryCount) {
      throw new Error('AcTrBatchedLine: Maximum geometry count reached.')
    }

    this._validateGeometry(geometry)

    const batchGeometry = this.geometry
    const geometryInfo = this._geometryInfo[geometryId]
    applyGeometryAt(
      geometryInfo,
      batchGeometry,
      geometry,
      'AcTrBatchedLine',
      geometryId,
      previousBounds
    )

    return geometryId
  }

  /**
   * Materializes the `lineDistance` attribute when the current material is a
   * pattern (dashed linetype) shader that consumes it. Called from
   * {@link AcTrBatchedGroup.updateMaterial} after a layer rebind swaps a
   * dash-capable material onto a batch whose packed geometry never carried
   * the attribute (solid lines skip it to save ~25% of line vertex memory).
   *
   * Distances are rebuilt per packed slot so every entity restarts its dash
   * phase at zero instead of chaining across slots.
   */
  ensureLineDistanceAttribute() {
    const batchGeometry = this.geometry
    if (batchGeometry.hasAttribute('lineDistance')) {
      return
    }
    const material = Array.isArray(this.material)
      ? this.material[0]
      : this.material
    if (
      material == null ||
      !AcTrBufferGeometryUtil.hasPatternLineShader(material)
    ) {
      // Only per-vertex dash pattern shaders consume lineDistance.
      return
    }

    const packedPosition = batchGeometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined
    if (!packedPosition) return
    const packedIndex = batchGeometry.getIndex() as THREE.BufferAttribute | null

    // Sizing pass: scratch arrays cover the largest active slot.
    let maxSlotVertices = 2
    let maxSlotIndices = 2
    for (let i = 0; i < this._geometryCount; i++) {
      const info = this._geometryInfo[i]
      if (!isBatchGeometryActive(info.flags)) continue
      maxSlotVertices = Math.max(maxSlotVertices, info.vertexCount)
      maxSlotIndices = Math.max(maxSlotIndices, info.indexCount)
    }

    const itemSize = packedPosition.itemSize
    const distances = new Float32Array(packedPosition.count)
    const slotGeometry = new THREE.BufferGeometry()
    const positionScratch = new Float32Array(maxSlotVertices * itemSize)
    const indexScratch = packedIndex
      ? new Uint32Array(maxSlotIndices)
      : undefined

    for (let i = 0; i < this._geometryCount; i++) {
      const info = this._geometryInfo[i]
      if (!isBatchGeometryActive(info.flags)) continue
      const vertexCount = info.vertexCount
      if (vertexCount < 2) continue

      // Rebuild the slot's local geometry in the scratch object and reuse the
      // eager distance computation (segment-pair cumulative, entity-local).
      positionScratch.set(
        packedPosition.array.subarray(
          info.vertexStart * itemSize,
          (info.vertexStart + vertexCount) * itemSize
        ),
        0
      )
      slotGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(
          positionScratch.subarray(0, vertexCount * itemSize),
          itemSize
        )
      )
      if (indexScratch && packedIndex) {
        for (let k = 0; k < info.indexCount; k++) {
          indexScratch[k] =
            packedIndex.array[info.indexStart + k] - info.vertexStart
        }
        slotGeometry.setIndex(
          new THREE.BufferAttribute(indexScratch.subarray(0, info.indexCount), 1)
        )
      }
      AcTrBufferGeometryUtil.computeSegmentLineDistances(slotGeometry)
      const slotDistances = slotGeometry.getAttribute(
        'lineDistance'
      ) as THREE.BufferAttribute
      distances.set(slotDistances.array, info.vertexStart)
    }

    const attribute = new THREE.Float32BufferAttribute(distances, 1)
    attribute.needsUpdate = true
    batchGeometry.setAttribute('lineDistance', attribute)
  }

  /**
   * Compacts active geometry ranges to reclaim gaps left by deletions.
   *
   * Unlike {@link AcTrBatchedMesh.optimize}, advances cursors by **reserved**
   * spans so in-place updates retain their preallocated slot sizes.
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

    // Collect active geometries in buffer order
    const entries = this._geometryInfo
      .map((info, id) => ({ info, id }))
      .filter(e => isBatchGeometryActive(e.info.flags))
      .sort((a, b) => a.info.vertexStart - b.info.vertexStart)

    for (const { info } of entries) {
      const vertexCount = info.vertexCount
      const indexCount = hasIndex ? info.indexCount : 0

      const oldVertexStart = info.vertexStart
      const newVertexStart = nextVertexStart
      const vertexDelta = newVertexStart - oldVertexStart

      // ---------- move vertex attributes ----------
      if (vertexDelta !== 0 && vertexCount > 0) {
        for (const key in attributes) {
          const attr = attributes[key] as THREE.BufferAttribute
          const { array, itemSize } = attr

          array.copyWithin(
            newVertexStart * itemSize,
            oldVertexStart * itemSize,
            (oldVertexStart + vertexCount) * itemSize
          )

          attr.addUpdateRange(newVertexStart * itemSize, vertexCount * itemSize)

          attr.needsUpdate = true
        }
      }

      // ---------- move & remap indices ----------
      if (hasIndex && indexAttr && indexCount > 0) {
        const oldIndexStart = info.indexStart
        const newIndexStart = nextIndexStart
        const indexArray = indexAttr.array

        // remap vertex indices FIRST
        if (vertexDelta !== 0) {
          for (let i = oldIndexStart; i < oldIndexStart + indexCount; i++) {
            indexArray[i] += vertexDelta
          }
        }

        // move index range
        if (oldIndexStart !== newIndexStart) {
          indexArray.copyWithin(
            newIndexStart,
            oldIndexStart,
            oldIndexStart + indexCount
          )
        }

        indexAttr.addUpdateRange(newIndexStart, indexCount)
        indexAttr.needsUpdate = true

        info.indexStart = newIndexStart
      }

      // ---------- update geometry info ----------
      info.vertexStart = newVertexStart

      // advance by RESERVED sizes (CRITICAL)
      nextVertexStart += info.reservedVertexCount
      nextIndexStart += info.reservedIndexCount
    }

    // ---------- clear trailing index data (safety) ----------
    if (hasIndex && indexAttr) {
      const indexArray = indexAttr.array
      for (let i = nextIndexStart; i < indexArray.length; i++) {
        indexArray[i] = 0
      }
      indexAttr.needsUpdate = true
    }

    // ---------- update draw range ----------
    if (hasIndex) {
      geometry.setDrawRange(0, nextIndexStart)
    } else {
      geometry.setDrawRange(0, nextVertexStart)
    }

    // ---------- update internal cursors ----------
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
   * Computes the object-space AABB of one packed slot by scanning the packed
   * `position` buffer (through `index` when the batch is indexed).
   *
   * Overrides the mixin default so aggregate bounds queries (frustum culling,
   * layout extents, picking) never go through the lazily cached slot `Box3`:
   * one cached box per slot would stay resident for the whole session
   * (~234B × slot count, i.e. ~100MB on a large drawing).
   *
   * Numerically identical to {@link getBoundingBoxAt}: the fast path only
   * replaces `getX/getY/getZ` indirection with the same typed-array reads, and
   * iterates the same index/vertex range in the same order.
   *
   * @param geometryId - Slot index to query.
   * @param target - Reusable {@link THREE.Box3} that receives the result.
   * @returns `target` when the id is valid, otherwise `null`.
   */
  override computeBoundingBoxAt(
    geometryId: number,
    target: THREE.Box3
  ) {
    if (geometryId >= this._geometryCount) {
      return null
    }

    const geometry = this.geometry
    const geometryInfo = this._geometryInfo[geometryId]
    const index = geometry.index
    const position = geometry.attributes.position
    const { start, count } =
      index != null
        ? { start: geometryInfo.indexStart, count: geometryInfo.indexCount }
        : { start: geometryInfo.vertexStart, count: geometryInfo.vertexCount }
    target.makeEmpty()

    if (
      position.itemSize === 3 &&
      !position.normalized &&
      (index == null || (index.itemSize === 1 && !index.normalized))
    ) {
      const positionArray = position.array
      const indexArray = index?.array
      for (let i = start, l = start + count; i < l; i++) {
        const vertexIndex = indexArray == null ? i : indexArray[i]
        const offset = vertexIndex * 3
        target.expandByPoint(
          _vector.set(
            positionArray[offset],
            positionArray[offset + 1],
            positionArray[offset + 2]
          )
        )
      }
      return target
    }

    for (let i = start, l = start + count; i < l; i++) {
      let iv = i
      if (index) {
        iv = index.getX(iv)
      }

      target.expandByPoint(_vector.fromBufferAttribute(position, iv))
    }

    return target
  }

  /**
   * Aggregate object-space bounding sphere from one pass over the packed
   * vertex ranges of every active slot.
   *
   * Replaces the mixin's per-slot `Box3` + `Sphere.union` with plain min/max
   * comparisons on the packed buffer: no per-slot object is allocated and the
   * packed data is touched once. The resulting sphere is the circumsphere of
   * the aggregate AABB of the same active slot set, so it still encloses
   * every active vertex — frustum culling can only ever drop a batch whose
   * geometry is entirely outside the frustum, exactly as before.
   *
   * @param target - Sphere that receives the aggregate result.
   * @returns `target`, or `null` when no bounds could be derived.
   */
  override computeAggregateBoundingSphere(target: THREE.Sphere) {
    const geometry = this.geometry
    const index = geometry.index
    const position = geometry.attributes.position
    if (!position) {
      return null
    }

    let minX = Infinity
    let minY = Infinity
    let minZ = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    let maxZ = -Infinity

    const fast =
      position.itemSize === 3 &&
      !position.normalized &&
      (index == null || (index.itemSize === 1 && !index.normalized))
    const positionArray = position.array
    const indexArray = index?.array

    for (let slot = 0; slot < this._geometryCount; slot++) {
      const info = this._geometryInfo[slot]
      if (!isBatchGeometryActive(info.flags)) continue
      const { start, count } =
        index != null
          ? { start: info.indexStart, count: info.indexCount }
          : { start: info.vertexStart, count: info.vertexCount }

      if (fast) {
        for (let i = start, l = start + count; i < l; i++) {
          const offset = (indexArray == null ? i : indexArray[i]) * 3
          const x = positionArray[offset]
          const y = positionArray[offset + 1]
          const z = positionArray[offset + 2]
          if (x < minX) minX = x
          if (y < minY) minY = y
          if (z < minZ) minZ = z
          if (x > maxX) maxX = x
          if (y > maxY) maxY = y
          if (z > maxZ) maxZ = z
        }
      } else {
        for (let i = start, l = start + count; i < l; i++) {
          let iv = i
          if (index) {
            iv = index.getX(iv)
          }
          _vector.fromBufferAttribute(position, iv)
          if (_vector.x < minX) minX = _vector.x
          if (_vector.y < minY) minY = _vector.y
          if (_vector.z < minZ) minZ = _vector.z
          if (_vector.x > maxX) maxX = _vector.x
          if (_vector.y > maxY) maxY = _vector.y
          if (_vector.z > maxZ) maxZ = _vector.z
        }
      }
    }

    if (minX > maxX) {
      target.makeEmpty()
      return target
    }

    _box.min.set(minX, minY, minZ)
    _box.max.set(maxX, maxY, maxZ)
    return _box.getBoundingSphere(target)
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
   * Resizes packed geometry buffers while preserving existing data.
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
   * Creates a standalone line object for one batched sub-geometry.
   *
   * Overrides the mixin implementation to copy the batch world position so
   * isolated line views align with rebased vertex data.
   *
   * @param batchId - Geometry slot index.
   * @returns A {@link THREE.LineSegments} view of the sub-geometry.
   */
  override getObjectAt(batchId: number) {
    const object = super.getObjectAt(batchId)
    object.position.copy(this.position)
    return object
  }

  /**
   * Configures a temporary raycast object with the batch world position.
   *
   * Ensures line ray tests occur in the same coordinate frame as rebased vertices.
   *
   * @param raycastObject - Temporary object prepared for raycasting.
   */
  override _initializeRaycastObject(
    raycastObject: THREE.Object3D & {
      geometry: THREE.BufferGeometry
      material: THREE.Material | THREE.Material[]
    }
  ) {
    super._initializeRaycastObject(raycastObject)
    raycastObject.position.copy(this.position)
    raycastObject.updateMatrixWorld(true)
  }

  /**
   * Keeps `geometry.drawRange` in sync with the packed active data extent.
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
   * Deep-copies batched line state from another instance.
   *
   * @param source - Batch instance to copy from.
   * @returns This instance for chaining.
   */
  copy(source: AcTrBatchedLine) {
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
