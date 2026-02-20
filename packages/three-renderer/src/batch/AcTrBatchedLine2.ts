import * as THREE from 'three'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import {
  AcTrBatchGeometryUserData,
  AcTrVertexBatchGeometryInfo,
  copyArrayContents,
  copyAttributeData
} from './AcTrBatchedGeometryInfo'
import {
  assertReservedCapacity,
  createAcTrBatchedMixin,
  createGeometryState,
  growCapacityIfNeeded,
  reserveGeometryId,
  resolveReservedCount
} from './AcTrBatchedMixin'

type AcTrBatchedLine2GeometryInfo = AcTrVertexBatchGeometryInfo

const _box = /*@__PURE__*/ new THREE.Box3()
const _vector = /*@__PURE__*/ new THREE.Vector3()
const _vector2 = /*@__PURE__*/ new THREE.Vector3()
const _batchIntersects: THREE.Intersection[] = []
const _raycastObject = /*@__PURE__*/ new LineSegments2(
  new LineSegmentsGeometry()
)

const AcTrBatchedLine2Base =
  createAcTrBatchedMixin<AcTrBatchedLine2GeometryInfo>(LineSegments2, {
    typeName: 'AcTrBatchedLine2',
    createObject: () => new LineSegments2(new LineSegmentsGeometry()),
    getDrawRange: (_instance, geometryInfo) => ({
      start: geometryInfo.vertexStart,
      count: geometryInfo.vertexCount
    })
  })

/**
 * Batched renderer for `LineSegments2` wide-line geometries.
 *
 * This class packs many `LineSegmentsGeometry` segment ranges into one shared
 * GPU buffer and renders them via one `LineSegments2` object per material.
 */
export class AcTrBatchedLine2 extends AcTrBatchedLine2Base {
  private static readonly GROWTH_FACTOR = 1.25

  /** Current allocated segment capacity. */
  private _maxSegmentCount: number
  /** Next free segment offset for appended geometries. */
  private _nextSegmentStart = 0
  /** Whether packed segment buffers have been allocated. */
  private _geometryInitialized = false

  constructor(maxSegmentCount: number = 1000, material?: THREE.Material) {
    super(new LineSegmentsGeometry(), material)
    this.frustumCulled = false
    this._maxSegmentCount = maxSegmentCount
  }

  get geometryCount() {
    return this._geometryCount
  }

  get unusedSegmentCount() {
    return this._maxSegmentCount - this._nextSegmentStart
  }

  private _initializeGeometry(reference: LineSegmentsGeometry) {
    if (this._geometryInitialized) {
      return
    }
    ;(this.geometry as LineSegmentsGeometry).setPositions(
      new Float32Array(this._maxSegmentCount * 6)
    )
    this._copyStaticAttributes(reference)
    this._geometryInitialized = true
  }

  private _copyStaticAttributes(
    reference: LineSegmentsGeometry,
    target: LineSegmentsGeometry = this.geometry as LineSegmentsGeometry
  ) {
    const dstGeometry = target
    const srcIndex = reference.getIndex()
    if (srcIndex) {
      dstGeometry.setIndex(srcIndex.clone())
    }

    for (const key in reference.attributes) {
      if (key === 'instanceStart' || key === 'instanceEnd') continue
      dstGeometry.setAttribute(key, reference.getAttribute(key).clone())
    }
  }

  private _validateGeometry(geometry: LineSegmentsGeometry) {
    const start = geometry.getAttribute('instanceStart')
    const end = geometry.getAttribute('instanceEnd')
    if (!start || !end) {
      throw new Error(
        'AcTrBatchedLine2: Geometry must have "instanceStart" and "instanceEnd" attributes.'
      )
    }
    if (
      start.itemSize !== 3 ||
      end.itemSize !== 3 ||
      start.count !== end.count
    ) {
      throw new Error(
        'AcTrBatchedLine2: Invalid line segment attributes. Expected matching vec3 instanceStart/instanceEnd.'
      )
    }
  }

  private _resizeSpaceIfNeeded(geometry: LineSegmentsGeometry) {
    const segmentCount = geometry.getAttribute('instanceStart').count
    const newMaxSegmentCount = growCapacityIfNeeded({
      currentMaxCount: this._maxSegmentCount,
      nextStart: this._nextSegmentStart,
      requiredCount: segmentCount,
      growthFactor: AcTrBatchedLine2.GROWTH_FACTOR
    })

    if (newMaxSegmentCount > this._maxSegmentCount) {
      this.setGeometrySize(newMaxSegmentCount)
    }
  }

  /**
   * Resets batched state and releases current geometry buffers.
   */
  reset() {
    this.boundingBox = null
    this.boundingSphere = null
    this._geometryInfo = []
    this._availableGeometryIds = []
    this._nextSegmentStart = 0
    this._geometryCount = 0
    this._geometryInitialized = false
    this.geometry.dispose()
  }

  /**
   * Appends one source line-segment geometry into the packed segment buffer.
   */
  addGeometry(
    geometry: LineSegmentsGeometry,
    reservedSegmentCount: number = -1
  ) {
    this._initializeGeometry(geometry)
    this._validateGeometry(geometry)
    this._resizeSpaceIfNeeded(geometry)

    const segmentCount = geometry.getAttribute('instanceStart').count
    const geometryInfo: AcTrBatchedLine2GeometryInfo = {
      vertexStart: this._nextSegmentStart,
      vertexCount: -1,
      reservedVertexCount: resolveReservedCount(
        reservedSegmentCount,
        segmentCount
      ),
      ...createGeometryState()
    }

    assertReservedCapacity({
      typeName: 'AcTrBatchedLine2',
      maxVertexCount: this._maxSegmentCount,
      vertexStart: geometryInfo.vertexStart,
      reservedVertexCount: geometryInfo.reservedVertexCount
    })

    const { geometryId, geometryCount } = reserveGeometryId(
      this._availableGeometryIds,
      this._geometryInfo,
      this._geometryCount,
      geometryInfo
    )
    this._geometryCount = geometryCount

    this.setGeometryAt(geometryId, geometry)

    this._nextSegmentStart =
      geometryInfo.vertexStart + geometryInfo.reservedVertexCount
    this._syncDrawRange()

    return geometryId
  }

  /**
   * Assigns entity metadata for a packed geometry id.
   */
  setGeometryInfo(geometryId: number, userData: AcTrBatchGeometryUserData) {
    if (geometryId >= this._geometryCount) {
      throw new Error('AcTrBatchedLine2: Maximum geometry count reached.')
    }
    const geometryInfo = this._geometryInfo[geometryId]
    geometryInfo.objectId = userData.objectId
    geometryInfo.bboxIntersectionCheck = userData.bboxIntersectionCheck
  }

  /**
   * Rewrites segment data for an existing packed geometry id.
   */
  setGeometryAt(geometryId: number, geometry: LineSegmentsGeometry) {
    if (geometryId >= this._geometryCount) {
      throw new Error('AcTrBatchedLine2: Maximum geometry count reached.')
    }
    this._validateGeometry(geometry)

    const geometryInfo = this._geometryInfo[geometryId]
    const segmentCount = geometry.getAttribute('instanceStart').count
    if (segmentCount > geometryInfo.reservedVertexCount) {
      throw new Error(
        'AcTrBatchedLine2: Reserved space not large enough for provided geometry.'
      )
    }

    const dstStart = this.geometry.getAttribute('instanceStart')
    const dstEnd = this.geometry.getAttribute('instanceEnd')
    const srcStart = geometry.getAttribute('instanceStart')
    const srcEnd = geometry.getAttribute('instanceEnd')
    const segmentStart = geometryInfo.vertexStart

    copyAttributeData(srcStart, dstStart, segmentStart)
    copyAttributeData(srcEnd, dstEnd, segmentStart)

    for (
      let i = segmentCount, l = geometryInfo.reservedVertexCount;
      i < l;
      i++
    ) {
      const index = segmentStart + i
      for (let c = 0; c < 3; c++) {
        dstStart.setComponent(index, c, 0)
        dstEnd.setComponent(index, c, 0)
      }
    }

    dstStart.needsUpdate = true
    dstEnd.needsUpdate = true

    geometryInfo.vertexCount = segmentCount
    geometryInfo.boundingBox = null

    return geometryId
  }

  /**
   * Compacts active segment ranges to remove holes left by deletions.
   */
  optimize() {
    const packed = this._getPackedSegmentArray()
    let nextSegmentStart = 0

    const entries = this._geometryInfo
      .map((info, id) => ({ info, id }))
      .filter(e => e.info.active)
      .sort((a, b) => a.info.vertexStart - b.info.vertexStart)

    for (const { info } of entries) {
      const oldStart = info.vertexStart
      const count = info.reservedVertexCount
      if (oldStart !== nextSegmentStart) {
        packed.copyWithin(
          nextSegmentStart * 6,
          oldStart * 6,
          (oldStart + count) * 6
        )
      }
      info.vertexStart = nextSegmentStart
      nextSegmentStart += count
    }

    for (let i = nextSegmentStart * 6, l = packed.length; i < l; i++) {
      packed[i] = 0
    }

    this._nextSegmentStart = nextSegmentStart
    this._syncDrawRange()
    this._availableGeometryIds.length = 0

    const instanceStart = this.geometry.getAttribute('instanceStart')
    const instanceEnd = this.geometry.getAttribute('instanceEnd')
    instanceStart.needsUpdate = true
    instanceEnd.needsUpdate = true

    return this
  }

  /**
   * Returns cached per-geometry bounds, computing lazily when missing.
   */
  getBoundingBoxAt(geometryId: number, target: THREE.Box3) {
    if (geometryId >= this._geometryCount) {
      return null
    }

    const geometryInfo = this._geometryInfo[geometryId]
    if (geometryInfo.boundingBox === null) {
      const box = new THREE.Box3()
      const start = this.geometry.getAttribute('instanceStart')
      const end = this.geometry.getAttribute('instanceEnd')
      for (
        let i = geometryInfo.vertexStart,
          l = geometryInfo.vertexStart + geometryInfo.vertexCount;
        i < l;
        i++
      ) {
        box.expandByPoint(_vector.fromBufferAttribute(start, i))
        box.expandByPoint(_vector2.fromBufferAttribute(end, i))
      }
      geometryInfo.boundingBox = box
    }

    target.copy(geometryInfo.boundingBox)
    return target
  }

  /**
   * Returns per-geometry bounding sphere derived from cached bounding box.
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
   * Resizes packed segment capacity while preserving existing segment data.
   */
  setGeometrySize(maxSegmentCount: number) {
    const oldGeometry = this.geometry as LineSegmentsGeometry
    const oldPacked = this._getPackedSegmentArray()

    this._maxSegmentCount = maxSegmentCount
    this.geometry = new LineSegmentsGeometry()
    ;(this.geometry as LineSegmentsGeometry).setPositions(
      new Float32Array(maxSegmentCount * 6)
    )

    const newPacked = this._getPackedSegmentArray()
    copyArrayContents(oldPacked, newPacked)
    this._copyStaticAttributes(oldGeometry)
    this._geometryInitialized = true
    this._syncDrawRange()
    oldGeometry.dispose()
  }

  /**
   * Builds a standalone `LineSegments2` object for one packed geometry id.
   */
  getObjectAt(batchId: number) {
    const info = this._geometryInfo[batchId]
    const geometry = this._createSubGeometry(
      info.vertexStart,
      info.vertexCount,
      true
    )
    const object = new LineSegments2(geometry, this.material as LineMaterial)
    this.getBoundingBoxAt(
      batchId,
      object.geometry.boundingBox ?? new THREE.Box3()
    )
    this.getBoundingSphereAt(
      batchId,
      object.geometry.boundingSphere ?? new THREE.Sphere()
    )
    return object
  }

  /**
   * Raycasts one packed geometry id.
   */
  intersectWith(
    geometryId: number,
    raycaster: THREE.Raycaster,
    intersects: THREE.Intersection[]
  ) {
    this._intersectWith(geometryId, raycaster, intersects)
  }

  /**
   * Raycasts all packed geometry ids.
   */
  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    for (let i = 0, l = this._geometryInfo.length; i < l; i++) {
      this._intersectWith(i, raycaster, intersects)
    }
  }

  /**
   * Deep-copies packed geometry state and bounds.
   */
  copy(source: AcTrBatchedLine2) {
    super.copy(source)
    this.geometry = source.geometry.clone()
    this.boundingBox = source.boundingBox ? source.boundingBox.clone() : null
    this.boundingSphere = source.boundingSphere
      ? source.boundingSphere.clone()
      : null
    this._geometryInfo = source._geometryInfo.map(info => ({
      ...info,
      boundingBox: info.boundingBox ? info.boundingBox.clone() : null
    }))
    this._maxSegmentCount = source._maxSegmentCount
    this._geometryCount = source._geometryCount
    this._nextSegmentStart = source._nextSegmentStart
    this._geometryInitialized = source._geometryInitialized
    return this
  }

  /**
   * Disposes packed geometry resources.
   */
  dispose() {
    this.geometry.dispose()
    return this
  }

  /**
   * Internal raycast implementation for one packed geometry id.
   */
  _intersectWith(
    geometryId: number,
    raycaster: THREE.Raycaster,
    intersects: THREE.Intersection[]
  ) {
    const geometryInfo = this._geometryInfo[geometryId]
    if (!geometryInfo.active || !geometryInfo.visible) {
      return
    }

    if (geometryInfo.bboxIntersectionCheck) {
      this.getBoundingBoxAt(geometryId, _box)
      if (raycaster.ray.intersectBox(_box, _vector)) {
        const distance = raycaster.ray.origin.distanceTo(_vector)
        ;(
          intersects as Array<
            THREE.Intersection & { batchId?: number; objectId?: string }
          >
        ).push({
          distance,
          point: _vector.clone(),
          object: this,
          face: null,
          faceIndex: undefined,
          uv: undefined,
          batchId: geometryId,
          objectId: geometryInfo.objectId
        })
      }
      return
    }

    const geometry = this._createSubGeometry(
      geometryInfo.vertexStart,
      geometryInfo.vertexCount,
      false
    )
    _raycastObject.geometry = geometry
    _raycastObject.material = this.material as LineMaterial
    _raycastObject.raycast(raycaster, _batchIntersects)

    for (let i = 0, l = _batchIntersects.length; i < l; i++) {
      const intersect = _batchIntersects[i]
      ;(
        intersect as THREE.Intersection & {
          batchId?: number
          objectId?: string
        }
      ).batchId = geometryId
      ;(
        intersect as THREE.Intersection & {
          batchId?: number
          objectId?: string
        }
      ).objectId = geometryInfo.objectId
      intersect.object = this
      intersects.push(intersect)
    }
    _batchIntersects.length = 0
    geometry.dispose()
  }

  /**
   * Creates a temporary sub-geometry view/copy for raycast/highlight purposes.
   */
  private _createSubGeometry(
    start: number,
    count: number,
    stableCopy: boolean
  ) {
    const packed = this._getPackedSegmentArray()
    const segmentArray = stableCopy
      ? packed.slice(start * 6, (start + count) * 6)
      : packed.subarray(start * 6, (start + count) * 6)
    const geometry = new LineSegmentsGeometry()
    geometry.setPositions(segmentArray)
    this._copyStaticAttributes(this.geometry as LineSegmentsGeometry, geometry)
    return geometry
  }

  /**
   * Returns packed segment array `[sx,sy,sz, ex,ey,ez, ...]`.
   */
  private _getPackedSegmentArray() {
    const instanceStart = this.geometry.getAttribute('instanceStart') as
      | THREE.InterleavedBufferAttribute
      | THREE.InstancedBufferAttribute
    if ('data' in instanceStart && instanceStart.data?.array) {
      return instanceStart.data.array as Float32Array
    }
    const instanceEnd = this.geometry.getAttribute('instanceEnd')
    const count = instanceStart.count
    const array = new Float32Array(count * 6)
    for (let i = 0, p = 0; i < count; i++) {
      array[p++] = instanceStart.getComponent(i, 0)
      array[p++] = instanceStart.getComponent(i, 1)
      array[p++] = instanceStart.getComponent(i, 2)
      array[p++] = instanceEnd.getComponent(i, 0)
      array[p++] = instanceEnd.getComponent(i, 1)
      array[p++] = instanceEnd.getComponent(i, 2)
    }
    return array
  }

  /**
   * Synchronizes rendered instance count with active packed segment range.
   */
  private _syncDrawRange() {
    ;(this.geometry as THREE.InstancedBufferGeometry).instanceCount =
      this._nextSegmentStart
  }
}
