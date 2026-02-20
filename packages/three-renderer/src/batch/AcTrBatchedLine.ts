import * as THREE from 'three'

import { AcTrPointSymbolCreator } from '../geometry/AcTrPointSymbolCreator'
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
 * Batched renderer for `THREE.LineSegments`.
 *
 * Multiple line geometries sharing compatible attribute layouts are packed into
 * one combined buffer to reduce draw calls.
 */
export class AcTrBatchedLine extends AcTrBatchedLineBase {
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

  get geometryCount() {
    return this._geometryCount
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
    validateGeometry(this.geometry, geometry, 'AcTrBatchedLine', true)
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

    this._geometryInitialized = false
    this.geometry.dispose()
  }

  /**
   * Returns per-geometry user metadata used by point-symbol regeneration.
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
   */
  resetGeometry(displayMode: number) {
    // Backup user data
    const userData = this.getUserData()

    // Reset states
    this.reset()

    const creator = AcTrPointSymbolCreator.instance
    userData.forEach(item => {
      if (item.position) {
        const geometry = creator.create(displayMode, item.position)
        if (geometry.line) {
          const geometryId = this.addGeometry(geometry.line)
          this.setGeometryInfo(geometryId, item)
        }
      }
    })
  }

  /**
   * Appends one geometry into the packed line buffer.
   */
  addGeometry(
    geometry: THREE.BufferGeometry,
    reservedVertexCount: number = -1,
    reservedIndexCount: number = -1
  ) {
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
   */
  setGeometryAt(geometryId: number, geometry: THREE.BufferGeometry) {
    if (geometryId >= this._geometryCount) {
      throw new Error('AcTrBatchedLine: Maximum geometry count reached.')
    }

    this._validateGeometry(geometry)

    const batchGeometry = this.geometry
    const geometryInfo = this._geometryInfo[geometryId]
    applyGeometryAt(geometryInfo, batchGeometry, geometry, 'AcTrBatchedLine')

    return geometryId
  }

  /**
   * Compacts active geometry ranges to reclaim gaps left by deletions.
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
      .filter(e => e.info.active)
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

  getGeometryAt(geometryId: number) {
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

    return this
  }
}
