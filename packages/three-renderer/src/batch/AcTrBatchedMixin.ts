import * as THREE from 'three'

import { AcTrCommonUtil } from '../util'
import {
  AcTrBatchGeometryDefaultFlags,
  AcTrBatchGeometryFlags,
  AcTrIndexedBatchGeometryInfo,
  AcTrVertexBatchGeometryInfo,
  ascIdSort,
  copyAttributeData,
  isBatchGeometryActive,
  isBatchGeometryVisible,
  setBatchGeometryVisible
} from './AcTrBatchedGeometryInfo'
import {
  type AcTrBatchDrawVisibilityInfo,
  applyBatchSlotDrawVisibility
} from './drawVisibility'

/**
 * Generic constructor type used to parameterize the batched mixin factory.
 *
 * @typeParam T - Instance type produced by the constructor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T

/**
 * Minimum surface required of a THREE.js object that can host batched geometry.
 *
 * Combines {@link THREE.Object3D} with the geometry and material bindings that
 * the batching pipeline reads and writes during packing and raycasting.
 */
type AcTrBatchBaseObject = THREE.Object3D & {
  /** Shared geometry bound to the render object. */
  geometry: THREE.BufferGeometry
  /** Render material(s) used by the object. */
  material: THREE.Material | THREE.Material[]
}

/**
 * Per-geometry bounds query contract implemented by concrete batched classes.
 *
 * Used internally by the mixin when aggregating bounds and configuring
 * temporary raycast objects for individual sub-geometries.
 */
type AcTrBatchBounds = {
  /**
   * Returns cached or lazily computed axis-aligned bounds for one packed geometry id.
   *
   * @param geometryId - Slot index of the sub-geometry within the batch.
   * @param target - Reusable {@link THREE.Box3} that receives the result.
   * @returns `target` when the id is valid, otherwise `null`.
   */
  getBoundingBoxAt(geometryId: number, target: THREE.Box3): THREE.Box3 | null
  /**
   * Returns cached or lazily computed bounding sphere for one packed geometry id.
   *
   * @param geometryId - Slot index of the sub-geometry within the batch.
   * @param target - Reusable {@link THREE.Sphere} that receives the result.
   * @returns `target` when the id is valid, otherwise `null`.
   */
  getBoundingSphereAt(
    geometryId: number,
    target: THREE.Sphere
  ): THREE.Sphere | null
}

/**
 * Geometry-info record shape shared by all batched primitive implementations.
 *
 * Alias of {@link AcTrVertexBatchGeometryInfo}; indexed batches extend this
 * with index-range fields via {@link AcTrIndexedBatchGeometryInfo}.
 */
type AcTrBatchGeometryLike = AcTrVertexBatchGeometryInfo

/**
 * Estimates memory footprint of one geometry-info record and returns aggregate
 * mapping statistics for the whole batch.
 *
 * Uses {@link AcTrCommonUtil.estimateObjectSize} on the first record and
 * multiplies by the total slot count. Useful for diagnostics and capacity planning.
 *
 * @typeParam T - Geometry-info record type stored in the batch.
 * @param geometryInfo - Array of per-sub-geometry mapping records.
 * @returns Object containing the slot `count` and estimated total `size` in bytes.
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
 *
 * Creates typed attribute arrays sized for `maxVertexCount` vertices and, when
 * `maxIndexCount` is non-null and the reference geometry is indexed, allocates
 * a matching index buffer (`Uint16Array` or `Uint32Array` depending on vertex count).
 *
 * @param geometry - Destination batch geometry whose attributes are created or replaced.
 * @param reference - Source geometry whose attribute names, item sizes, and types define the layout.
 * @param maxVertexCount - Preallocated vertex capacity for every attribute array.
 * @param maxIndexCount - Preallocated index capacity, or `null` for non-indexed batches.
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
 *
 * Ensures every batch attribute exists on the incoming geometry with matching
 * `itemSize` and `normalized` flags. When `checkIndex` is true, indexed and
 * non-indexed geometries cannot be mixed within the same batch.
 *
 * @param batchGeometry - Combined geometry whose layout defines the batch contract.
 * @param geometry - Candidate geometry to append or update.
 * @param typeName - Batch class name included in error messages.
 * @param checkIndex - When `true`, require consistent presence of an index buffer.
 * @throws {Error} When attribute names, item sizes, normalized flags, or index usage differ.
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
 *
 * Deleted slots are tracked in `availableGeometryIds` and sorted ascending
 * before reuse so lower ids are consumed first, keeping id density compact.
 *
 * @typeParam T - Geometry-info record type stored per slot.
 * @param availableGeometryIds - Pool of ids freed by {@link deleteGeometryById}.
 * @param geometryInfoList - Mutable array of per-slot mapping records.
 * @param geometryCount - Current number of allocated ids (may exceed active count).
 * @param geometryInfo - New record to assign to the reserved slot.
 * @returns The assigned `geometryId` and updated `geometryCount`.
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
 *
 * Callers pass `-1` to mean "use the geometry's current vertex or index count"
 * when reserving space during {@link applyGeometryAt}.
 *
 * @param reservedCount - Requested reservation, or `-1` to adopt `actualCount`.
 * @param actualCount - Vertex or index count from the source geometry.
 * @returns The resolved reservation size.
 */
export function resolveReservedCount(
  reservedCount: number,
  actualCount: number
) {
  return reservedCount === -1 ? actualCount : reservedCount
}

/**
 * Creates default slot state for a newly inserted geometry record.
 *
 * Bounding boxes start as `null` and are computed lazily on first bounds query.
 *
 * @returns Fresh state object merged into new geometry-info records.
 */
export function createGeometryState() {
  return {
    boundingBox: null as THREE.Box3 | null,
    flags: AcTrBatchGeometryDefaultFlags
  }
}

/**
 * Validates reserved vertex/index ranges against current batch capacities.
 *
 * @param params - Capacity check parameters.
 * @param params.typeName - Batch class name included in error messages.
 * @param params.maxVertexCount - Total vertex capacity of the packed buffer.
 * @param params.vertexStart - Write offset for the new or updated slot.
 * @param params.reservedVertexCount - Reserved vertex span for the slot.
 * @param params.maxIndexCount - Total index capacity, omitted for non-indexed batches.
 * @param params.indexStart - Write offset in the index buffer, or `-1` when unused.
 * @param params.reservedIndexCount - Reserved index span for the slot.
 * @throws {Error} When the requested range would exceed buffer capacity.
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
 *
 * When `nextStart + requiredCount` exceeds `currentMaxCount`, returns
 * `ceil(totalRequired * growthFactor)` so batches grow amortized rather than
 * per-vertex.
 *
 * @param params - Growth calculation inputs.
 * @param params.currentMaxCount - Current buffer capacity.
 * @param params.nextStart - Next free offset in the buffer.
 * @param params.requiredCount - Count needed for the incoming geometry.
 * @param params.growthFactor - Multiplier applied when growth is required (typically `1.25`).
 * @returns Either unchanged `currentMaxCount` or the new larger capacity.
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
 *
 * Sets slot flags to {@link AcTrBatchGeometryFlags.None} without compacting buffer memory;
 * callers should invoke `optimize()` on the concrete batch class to reclaim space.
 *
 * @typeParam T - Geometry-info record type extending {@link AcTrBatchGeometryLike}.
 * @param geometryId - Slot index to delete.
 * @param geometryInfoList - Mutable array of per-slot mapping records.
 * @param availableGeometryIds - Pool that receives the freed id.
 * @returns `true` when the slot was active and is now deleted; `false` if already deleted or out of range.
 */
export function deleteGeometryById<T extends AcTrBatchGeometryLike>(
  geometryId: number,
  geometryInfoList: T[],
  availableGeometryIds: number[]
) {
  if (
    geometryId >= geometryInfoList.length ||
    !isBatchGeometryActive(geometryInfoList[geometryId].flags)
  ) {
    return false
  }

  geometryInfoList[geometryId].flags = AcTrBatchGeometryFlags.None
  availableGeometryIds.push(geometryId)
  return true
}

/**
 * Throws when `geometryId` does not refer to an active geometry record.
 *
 * @typeParam T - Geometry-info record type extending {@link AcTrBatchGeometryLike}.
 * @param geometryId - Slot index to validate.
 * @param geometryInfoList - Array of per-slot mapping records.
 * @param typeName - Batch class name included in error messages.
 * @throws {Error} When the id is negative, out of range, or refers to a deleted slot.
 */
export function validateGeometryId<T extends AcTrBatchGeometryLike>(
  geometryId: number,
  geometryInfoList: T[],
  typeName: string
) {
  if (
    geometryId < 0 ||
    geometryId >= geometryInfoList.length ||
    !isBatchGeometryActive(geometryInfoList[geometryId].flags)
  ) {
    throw new Error(
      `${typeName}: Invalid geometryId ${geometryId}. Geometry is either out of range or has been deleted.`
    )
  }
}

/**
 * Copies all geometry attributes into batched buffers and zero-fills reserved
 * tail ranges to avoid stale data.
 *
 * Writes source attribute data starting at `vertexStart` and clears any unused
 * portion of the reserved span so GPU reads do not see leftover vertices from
 * previous occupants of the slot.
 *
 * @param batchGeometry - Combined destination geometry.
 * @param geometry - Source geometry whose attributes are copied.
 * @param vertexStart - Destination vertex offset in the packed buffer.
 * @param reservedVertexCount - Total reserved vertex span including padding.
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
 *
 * Each source index is offset by `vertexStart` so it references vertices in
 * the packed attribute array. Unused index entries within the reserved span are
 * filled with `vertexStart` as a safe degenerate reference.
 *
 * @param batchGeometry - Combined destination geometry with an index buffer.
 * @param geometry - Source indexed geometry.
 * @param vertexStart - Vertex offset applied to every copied index value.
 * @param indexStart - Destination index offset in the packed index buffer.
 * @param reservedIndexCount - Total reserved index span including padding.
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
 *
 * Validates that the source fits within the slot's reserved vertex (and index,
 * when applicable) capacity, copies attributes and indices, updates actual
 * counts, and invalidates cached bounds.
 *
 * @typeParam T - Geometry-info record type extending {@link AcTrBatchGeometryLike}.
 * @param geometryInfo - Target slot metadata describing buffer offsets and reservations.
 * @param batchGeometry - Combined destination geometry.
 * @param geometry - Source geometry payload to write.
 * @param typeName - Batch class name included in error messages.
 * @throws {Error} When the source geometry exceeds the slot's reserved capacity.
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

  if (isBatchGeometryActive(geometryInfo.flags)) {
    delete geometryInfo.hiddenDrawSnapshot
    if (!isBatchGeometryVisible(geometryInfo.flags)) {
      applyBatchSlotDrawVisibility(
        batchGeometry,
        geometryInfo as AcTrBatchDrawVisibilityInfo,
        false
      )
    }
  }
}

/**
 * Computes global bounding box of all active geometry records in a batch.
 *
 * Unions lazily cached per-slot boxes; slots without computed bounds are skipped.
 *
 * @typeParam T - Geometry-info record type extending {@link AcTrBatchGeometryLike}.
 * @param currentBoundingBox - Existing aggregate box to reuse, or `null` to allocate.
 * @param geometryInfo - Array of per-slot mapping records.
 * @returns A bounding box containing all active sub-geometries with known bounds.
 */
export function computeBoundingBox<T extends AcTrBatchGeometryLike>(
  currentBoundingBox: THREE.Box3 | null,
  geometryInfo: T[]
) {
  const boundingBox = currentBoundingBox ?? new THREE.Box3()
  boundingBox.makeEmpty()

  for (let i = 0, l = geometryInfo.length; i < l; i++) {
    const geometry = geometryInfo[i]
    if (!isBatchGeometryActive(geometry.flags)) continue
    if (geometry.boundingBox != null) {
      boundingBox.union(geometry.boundingBox)
    }
  }

  return boundingBox
}

/**
 * Computes global bounding sphere of all active geometry records in a batch.
 *
 * Delegates per-slot sphere computation to `getBoundingSphereAt` so concrete
 * batch classes can apply their lazy bounds caching strategy.
 *
 * @typeParam T - Geometry-info record type extending {@link AcTrBatchGeometryLike}.
 * @param currentBoundingSphere - Existing aggregate sphere to reuse, or `null` to allocate.
 * @param geometryInfo - Array of per-slot mapping records.
 * @param getBoundingSphereAt - Callback provided by the concrete batch class.
 * @returns A bounding sphere enclosing all active sub-geometries.
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
    if (!isBatchGeometryActive(geometryInfo[i].flags)) continue
    getBoundingSphereAt(i, sphere)
    boundingSphere.union(sphere)
  }

  return boundingSphere
}

/**
 * Rebinds a temporary raycast object to the shared batch geometry buffers.
 *
 * Shares attribute and index references with the batch geometry (no copy) and
 * ensures bounding box/sphere objects exist for draw-range ray tests.
 *
 * @param raycastObject - Temporary object used for per-slot raycasting.
 * @param batchGeometry - Combined geometry whose buffers are shared.
 * @param material - Material bound to the raycast object for intersection tests.
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
 *
 * Restricts the temporary raycast geometry to `[start, start + count)` and
 * copies precomputed bounds so THREE.js culling operates on the sub-range only.
 *
 * @param raycastObject - Temporary object whose geometry draw range is updated.
 * @param start - Index or vertex offset of the sub-geometry within the packed buffer.
 * @param count - Number of indices or vertices to include in the draw range.
 * @param boundingBox - Axis-aligned bounds of the sub-geometry in local space.
 * @param boundingSphere - Bounding sphere of the sub-geometry in local space.
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
 *
 * Detaches shared buffer references and resets the draw range to the full buffer
 * so the temporary object does not keep batch memory alive after a raycast pass.
 *
 * @param raycastObject - Temporary object to reset after raycasting.
 */
export function resetRaycastObjectInfo(raycastObject: AcTrBatchBaseObject) {
  raycastObject.geometry.index = null
  raycastObject.geometry.attributes = {}
  raycastObject.geometry.setDrawRange(0, Infinity)
}

/**
 * Configuration passed to {@link createAcTrBatchedMixin} for a concrete batch type.
 *
 * @typeParam TInfo - Per-slot geometry-info record type.
 */
export type AcTrBatchedMixinOptions<TInfo extends AcTrBatchGeometryLike> = {
  /** Human-readable batch class name used in validation errors. */
  typeName: string
  /** Factory that creates temporary THREE objects for raycast and `getObjectAt`. */
  createObject: () => AcTrBatchBaseObject
  /**
   * Resolves the draw range (index or vertex) for one sub-geometry slot.
   *
   * @param instance - The batched render object instance.
   * @param info - Geometry-info record for the requested slot.
   */
  getDrawRange: (
    instance: AcTrBatchBaseObject,
    info: TInfo
  ) => {
    start: number
    count: number
  }
}

/**
 * Creates a reusable mixin that implements shared behavior for batched render
 * objects (visibility, bounds aggregation, id lifecycle, and raycast flow).
 *
 * The returned class extends `Base` (typically {@link THREE.Mesh},
 * {@link THREE.LineSegments}, or {@link THREE.Points}) and is further extended
 * by {@link AcTrBatchedMesh}, {@link AcTrBatchedLine}, and
 * {@link AcTrBatchedPoint}.
 *
 * @typeParam TInfo - Per-slot geometry-info record type.
 * @typeParam TBase - Constructor of the THREE.js object being extended.
 * @param Base - THREE.js base class constructor (e.g. `THREE.Mesh`).
 * @param options - Batch-specific configuration and draw-range resolver.
 * @returns A mixin base class with shared batched-object behavior.
 */
export function createAcTrBatchedMixin<
  TInfo extends AcTrBatchGeometryLike,
  TBase extends Constructor<AcTrBatchBaseObject> =
    Constructor<AcTrBatchBaseObject>
>(Base: TBase, options: AcTrBatchedMixinOptions<TInfo>) {
  /**
   * Base class produced by {@link createAcTrBatchedMixin}.
   *
   * Implements geometry-id lifecycle, aggregate bounds, visibility toggles,
   * and batched raycasting shared across mesh, line, and point batch types.
   */
  return class AcTrBatchedMixinBase extends Base {
    /** Aggregate bounding box across all active packed geometries. */
    boundingBox: THREE.Box3 | null = null
    /** Aggregate bounding sphere across all active packed geometries. */
    boundingSphere: THREE.Sphere | null = null

    /** Per-geometry mapping/state records indexed by geometry id. */
    _geometryInfo: TInfo[] = []
    /** Deleted geometry ids available for reuse on subsequent inserts. */
    _availableGeometryIds: number[] = []
    /** Total number of geometry ids ever allocated (includes deleted slots). */
    _geometryCount = 0

    /** Shared temporary object used for batched raycast operations. */
    readonly _raycastObject = options.createObject()
    /** Temporary intersection collection reused for one raycast sub-pass. */
    readonly _batchIntersects: THREE.Intersection[] = []
    /** Reused axis-aligned bounding box scratch object. */
    readonly _box = new THREE.Box3()
    /** Reused bounding sphere scratch object. */
    readonly _sphere = new THREE.Sphere()
    /** Reused vector scratch object for ray/box tests. */
    readonly _vector = new THREE.Vector3()
    /** Typed view exposing optional `batchId` and `objectId` on intersections. */
    readonly _typedBatchIntersects: Array<
      THREE.Intersection & { batchId?: number; objectId?: string }
    > = this._batchIntersects as Array<
      THREE.Intersection & { batchId?: number; objectId?: string }
    >

    /**
     * Estimated memory footprint and slot count of `_geometryInfo` records.
     *
     * @returns Mapping statistics from {@link getMappingStats}.
     */
    get mappingStats() {
      return getMappingStats(this._geometryInfo)
    }

    /**
     * Validates that `geometryId` refers to an active, in-range geometry slot.
     *
     * @param geometryId - Slot index to validate.
     * @throws {Error} When the id is invalid or the slot has been deleted.
     */
    validateGeometryId(geometryId: number) {
      validateGeometryId(geometryId, this._geometryInfo, options.typeName)
    }

    /**
     * Returns the geometry-info record for one active slot.
     *
     * @param geometryId - Slot index to query.
     * @returns The mapping record describing buffer offsets and entity metadata.
     * @throws {Error} When the id is invalid or the slot has been deleted.
     */
    getGeometryRangeAt(geometryId: number) {
      this.validateGeometryId(geometryId)
      return this._geometryInfo[geometryId]
    }

    /**
     * Recomputes the aggregate bounding box from all active sub-geometries.
     *
     * @returns This instance for chaining.
     */
    computeBoundingBox() {
      this.boundingBox = computeBoundingBox(
        this.boundingBox,
        this._geometryInfo
      )
    }

    /**
     * Unions axis-aligned bounds of every active, visible packed geometry slot
     * into `target`. Uses lazily computed per-slot boxes derived from batch
     * vertex buffers (not entity-level metadata boxes).
     */
    unionActiveVisibleBoundingBoxInto(
      target: THREE.Box3,
      options?: { excludeObjectIds?: ReadonlySet<string> }
    ) {
      const self = this as unknown as THREE.Object3D
      self.updateMatrixWorld(true)

      for (let i = 0; i < this._geometryCount; i++) {
        const info = this._geometryInfo[i]
        if (!isBatchGeometryActive(info.flags)) continue
        if (!isBatchGeometryVisible(info.flags)) continue
        if (
          options?.excludeObjectIds &&
          info.objectId &&
          options.excludeObjectIds.has(info.objectId)
        ) {
          continue
        }
        const bounds = (
          this as unknown as AcTrBatchBounds
        ).getBoundingBoxAt(i, this._box)
        if (bounds) {
          // Per-slot boxes are in batch-local space; translate by batch origin.
          this._box.applyMatrix4(self.matrixWorld)
          target.union(this._box)
        }
      }
    }

    /**
     * Recomputes the aggregate bounding sphere from all active sub-geometries.
     *
     * @returns This instance for chaining.
     */
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

    /**
     * Sets per-slot visibility without removing geometry from the batch buffer.
     *
     * Invisible slots are skipped during raycasting and draw-time collapse keeps
     * packed geometry in place until deleted and optimized.
     *
     * @param geometryId - Slot index to update.
     * @param value - Desired visibility flag.
     * @returns This instance for chaining.
     * @throws {Error} When the id is invalid or the slot has been deleted.
     */
    setVisibleAt(geometryId: number, value: boolean) {
      this.validateGeometryId(geometryId)

      if (
        isBatchGeometryVisible(this._geometryInfo[geometryId].flags) === value
      ) {
        return this
      }

      const info = this._geometryInfo[geometryId]
      const applied = applyBatchSlotDrawVisibility(
        this.geometry,
        info as AcTrBatchDrawVisibilityInfo,
        value
      )
      if (applied) {
        info.flags = setBatchGeometryVisible(info.flags, value)
      }

      return this
    }

    /**
     * Returns the visibility flag for one geometry slot.
     *
     * @param geometryId - Slot index to query.
     * @returns `true` when the slot is visible.
     * @throws {Error} When the id is invalid or the slot has been deleted.
     */
    getVisibleAt(geometryId: number) {
      this.validateGeometryId(geometryId)
      return isBatchGeometryVisible(this._geometryInfo[geometryId].flags)
    }

    /**
     * Soft-deletes one geometry slot and registers its id for reuse.
     *
     * Does not compact buffer memory; call `optimize()` on the concrete batch
     * class to reclaim gaps.
     *
     * @param geometryId - Slot index to delete.
     * @returns This instance for chaining.
     */
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

    /**
     * Creates a standalone THREE object view of one batched sub-geometry.
     *
     * The returned object shares buffer references with the batch and is
     * configured with the correct draw range and bounds for inspection or
     * isolated rendering.
     *
     * @param batchId - Geometry slot index.
     * @returns A new THREE object representing only the requested sub-geometry.
     */
    getObjectAt(batchId: number) {
      const object = options.createObject()
      this._initializeRaycastObject(object)
      const geometryInfo = this._geometryInfo[batchId]
      const { start, count } = options.getDrawRange(this, geometryInfo)
      this._setRaycastObjectInfo(object, batchId, start, count)
      return object
    }

    /**
     * Raycasts one batched sub-geometry and appends hits to `intersects`.
     *
     * Initializes and tears down temporary raycast bindings around the call.
     *
     * @param geometryId - Slot index to test.
     * @param raycaster - Configured THREE.js raycaster.
     * @param intersects - Output array populated with intersection records
     *   extended by optional `batchId` and `objectId` fields.
     */
    intersectWith(
      geometryId: number,
      raycaster: THREE.Raycaster,
      intersects: THREE.Intersection[]
    ) {
      this._initializeRaycastObject(this._raycastObject)
      this._intersectWith(geometryId, raycaster, intersects)
      this._resetRaycastObjectInfo(this._raycastObject)
    }

    /**
     * Raycasts all active, visible sub-geometries in this batch.
     *
     * Implements the standard THREE.js `raycast` entry point for batched objects.
     *
     * @param raycaster - Configured THREE.js raycaster.
     * @param intersects - Output array populated with intersection records.
     */
    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
      this._initializeRaycastObject(this._raycastObject)

      for (let i = 0, l = this._geometryInfo.length; i < l; i++) {
        this._intersectWith(i, raycaster, intersects)
      }
      this._resetRaycastObjectInfo(this._raycastObject)
    }

    /**
     * Disposes packed GPU buffers held by this batch object.
     *
     * @returns This instance for chaining.
     */
    dispose() {
      this.geometry.dispose()
      return this
    }

    /**
     * Synchronizes world transform and shared buffer bindings on a raycast object.
     *
     * @param raycastObject - Temporary object to configure before raycasting.
     */
    _initializeRaycastObject(raycastObject: AcTrBatchBaseObject) {
      initializeRaycastObject(raycastObject, this.geometry, this.material)
      raycastObject.position.copy(this.position)
      raycastObject.quaternion.copy(this.quaternion)
      raycastObject.scale.copy(this.scale)
      raycastObject.updateMatrix()
      raycastObject.updateMatrixWorld(true)
    }

    /**
     * Applies draw range and per-slot bounds to a raycast object.
     *
     * @param raycastObject - Temporary object to configure.
     * @param index - Geometry slot index whose bounds are copied.
     * @param start - Draw-range start offset within the packed buffer.
     * @param count - Draw-range length.
     */
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

    /**
     * Clears temporary raycast bindings after a sub-pass completes.
     *
     * @param raycastObject - Temporary object to reset.
     */
    _resetRaycastObjectInfo(raycastObject: AcTrBatchBaseObject) {
      resetRaycastObjectInfo(raycastObject)
    }

    /**
     * Performs ray intersection for one geometry slot.
     *
     * Skips inactive or invisible slots. When `bboxIntersectionCheck` is set on
     * the slot, tests against the world-space bounding box only; otherwise
     * delegates to the underlying THREE.js primitive raycast on the sub-range.
     *
     * Subclasses such as {@link AcTrBatchedLine} may override to add fallback logic.
     *
     * @param geometryId - Slot index to test.
     * @param raycaster - Configured THREE.js raycaster.
     * @param intersects - Output array populated with intersection records.
     */
    _intersectWith(
      geometryId: number,
      raycaster: THREE.Raycaster,
      intersects: THREE.Intersection[]
    ) {
      const geometryInfo = this._geometryInfo[geometryId]
      if (!isBatchGeometryVisible(geometryInfo.flags)) {
        return
      }

      if (geometryInfo.bboxIntersectionCheck) {
        ;(
          this as unknown as AcTrBatchBaseObject & AcTrBatchBounds
        ).getBoundingBoxAt(geometryId, this._box)
        this._box.applyMatrix4((this as unknown as THREE.Object3D).matrixWorld)
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
