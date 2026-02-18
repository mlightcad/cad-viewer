import * as THREE from 'three'

import { AcTrCommonUtil } from '../util'
import {
  AcTrBatchedGeometryInfo,
  AcTrBatchGeometryUserData,
  ascIdSort,
  copyArrayContents,
  copyAttributeData
} from './AcTrBatchedGeometryInfo'

const _box = /*@__PURE__*/ new THREE.Box3()
const _sphere = /*@__PURE__*/ new THREE.Sphere()
const _vector = /*@__PURE__*/ new THREE.Vector3()
const _raycastObject = /*@__PURE__*/ new THREE.Mesh()
const _batchIntersects: THREE.Intersection[] = []

export class AcTrBatchedMesh extends THREE.Mesh {
  private static readonly GROWTH_FACTOR = 1.25
  boundingBox: THREE.Box3 | null = null
  boundingSphere: THREE.Sphere | null = null

  // cached user options
  private _maxVertexCount: number
  private _maxIndexCount: number

  // stores visible, active, and geometry id and reserved buffer ranges for geometries
  private _geometryInfo: AcTrBatchedGeometryInfo[] = []
  // geometry ids that have been set as inactive, and are available to be overwritten
  private _availableGeometryIds: number[] = []

  // used to track where the next point is that geometry should be inserted
  private _nextIndexStart = 0
  private _nextVertexStart = 0
  private _geometryCount = 0

  // flags
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

  get mappingStats() {
    const count = this._geometryInfo.length
    let size = 0
    if (count > 0) {
      size = AcTrCommonUtil.estimateObjectSize(this._geometryInfo[0])
    }

    return {
      count: count,
      size: count * size
    }
  }

  private _initializeGeometry(reference: THREE.BufferGeometry) {
    const geometry = this.geometry
    const maxVertexCount = this._maxVertexCount
    const maxIndexCount = this._maxIndexCount
    if (this._geometryInitialized === false) {
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

      if (reference.getIndex() !== null) {
        // Reserve last u16 index for primitive restart.
        const indexArray =
          maxVertexCount > 65535
            ? new Uint32Array(maxIndexCount)
            : new Uint16Array(maxIndexCount)

        geometry.setIndex(new THREE.BufferAttribute(indexArray, 1))
      }

      this._geometryInitialized = true
    }
  }

  // Make sure the geometry is compatible with the existing combined geometry attributes
  private _validateGeometry(geometry: THREE.BufferGeometry) {
    // check to ensure the geometries are using consistent attributes and indices
    const batchGeometry = this.geometry
    if (Boolean(geometry.getIndex()) !== Boolean(batchGeometry.getIndex())) {
      throw new Error(
        'AcTrBatchedMesh: All geometries must consistently have "index".'
      )
    }

    for (const attributeName in batchGeometry.attributes) {
      if (!geometry.hasAttribute(attributeName)) {
        throw new Error(
          `AcTrBatchedMesh: Added geometry missing "${attributeName}". All geometries must have consistent attributes.`
        )
      }

      const srcAttribute = geometry.getAttribute(attributeName)
      const dstAttribute = batchGeometry.getAttribute(attributeName)
      if (
        srcAttribute.itemSize !== dstAttribute.itemSize ||
        srcAttribute.normalized !== dstAttribute.normalized
      ) {
        throw new Error(
          'AcTrBatchedMesh: All attributes must have a consistent itemSize and normalized value.'
        )
      }
    }
  }

  private _resizeSpaceIfNeeded(geometry: THREE.BufferGeometry) {
    const index = geometry.getIndex()
    const hasIndex = index !== null
    let newMaxIndexCount = this._maxIndexCount
    if (hasIndex) {
      if (this.unusedIndexCount < index.count) {
        const requiredIndexCount = this._nextIndexStart + index.count
        newMaxIndexCount = Math.ceil(
          requiredIndexCount * AcTrBatchedMesh.GROWTH_FACTOR
        )
      }
    }

    const positionAttribute = geometry.getAttribute('position')
    let newMaxVertexCount = this._maxVertexCount
    if (positionAttribute) {
      if (this.unusedVertexCount < positionAttribute.count) {
        const requiredVertexCount =
          this._nextVertexStart + positionAttribute.count
        newMaxVertexCount = Math.ceil(
          requiredVertexCount * AcTrBatchedMesh.GROWTH_FACTOR
        )
      }
    }

    if (
      newMaxIndexCount > this._maxIndexCount ||
      newMaxVertexCount > this._maxVertexCount
    ) {
      this.setGeometrySize(newMaxVertexCount, newMaxIndexCount)
    }
  }

  validateGeometryId(geometryId: number) {
    const geometryInfoList = this._geometryInfo
    if (
      geometryId < 0 ||
      geometryId >= geometryInfoList.length ||
      geometryInfoList[geometryId].active === false
    ) {
      throw new Error(
        `AcTrBatchedMesh: Invalid geometryId ${geometryId}. Geometry is either out of range or has been deleted.`
      )
    }
  }

  computeBoundingBox() {
    if (this.boundingBox === null) {
      this.boundingBox = new THREE.Box3()
    }

    const boundingBox = this.boundingBox
    const geometryInfo = this._geometryInfo
    boundingBox.makeEmpty()
    for (let i = 0, l = geometryInfo.length; i < l; i++) {
      const geometry = geometryInfo[i]
      if (geometry.active === false) continue
      if (geometry.boundingBox != null) {
        boundingBox.union(geometry.boundingBox)
      }
    }
  }

  computeBoundingSphere() {
    if (this.boundingSphere === null) {
      this.boundingSphere = new THREE.Sphere()
    }

    const boundingSphere = this.boundingSphere
    const geometryInfo = this._geometryInfo
    boundingSphere.makeEmpty()
    for (let i = 0, l = geometryInfo.length; i < l; i++) {
      if (geometryInfo[i].active === false) continue
      this.getBoundingSphereAt(i, _sphere)
      boundingSphere.union(_sphere)
    }
  }

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

    const geometryInfo: AcTrBatchedGeometryInfo = {
      // geometry information
      vertexStart: -1,
      vertexCount: -1,
      reservedVertexCount: -1,

      indexStart: -1,
      indexCount: -1,
      reservedIndexCount: -1,

      // state
      boundingBox: null,
      active: true,
      visible: true
    }

    const geometryInfoList = this._geometryInfo
    geometryInfo.vertexStart = this._nextVertexStart
    geometryInfo.reservedVertexCount =
      reservedVertexCount === -1
        ? geometry.getAttribute('position').count
        : reservedVertexCount

    const index = geometry.getIndex()
    const hasIndex = index !== null
    if (hasIndex) {
      geometryInfo.indexStart = this._nextIndexStart
      geometryInfo.reservedIndexCount =
        reservedIndexCount === -1 ? index.count : reservedIndexCount
    }

    if (
      (geometryInfo.indexStart !== -1 &&
        geometryInfo.indexStart + geometryInfo.reservedIndexCount >
          this._maxIndexCount) ||
      geometryInfo.vertexStart + geometryInfo.reservedVertexCount >
        this._maxVertexCount
    ) {
      throw new Error(
        'AcTrBatchedMesh: Reserved space request exceeds the maximum buffer size.'
      )
    }

    // update id
    let geometryId
    if (this._availableGeometryIds.length > 0) {
      this._availableGeometryIds.sort(ascIdSort)

      geometryId = this._availableGeometryIds.shift() as number
      geometryInfoList[geometryId] = geometryInfo
    } else {
      geometryId = this._geometryCount
      this._geometryCount++
      geometryInfoList.push(geometryInfo)
    }

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

  setGeometryInfo(geometryId: number, userData: AcTrBatchGeometryUserData) {
    if (geometryId >= this._geometryCount) {
      throw new Error('AcTrBatchedMesh: Maximum geometry count reached.')
    }
    const geometryInfo = this._geometryInfo[geometryId]
    geometryInfo.objectId = userData.objectId
    geometryInfo.bboxIntersectionCheck = userData.bboxIntersectionCheck
  }

  setGeometryAt(geometryId: number, geometry: THREE.BufferGeometry) {
    if (geometryId >= this._geometryCount) {
      throw new Error('AcTrBatchedMesh: Maximum geometry count reached.')
    }

    this._validateGeometry(geometry)

    const batchGeometry = this.geometry
    const hasIndex = batchGeometry.getIndex() !== null
    const dstIndex = batchGeometry.getIndex()
    const srcIndex = geometry.getIndex()!
    const geometryInfo = this._geometryInfo[geometryId]
    if (
      (hasIndex && srcIndex.count > geometryInfo.reservedIndexCount) ||
      geometry.attributes.position.count > geometryInfo.reservedVertexCount
    ) {
      throw new Error(
        'AcTrBatchedMesh: Reserved space not large enough for provided geometry.'
      )
    }

    // copy geometry buffer data over
    const vertexStart = geometryInfo.vertexStart
    const reservedVertexCount = geometryInfo.reservedVertexCount
    geometryInfo.vertexCount = geometry.getAttribute('position').count

    for (const attributeName in batchGeometry.attributes) {
      // copy attribute data
      const srcAttribute = geometry.getAttribute(attributeName)
      const dstAttribute = batchGeometry.getAttribute(
        attributeName
      ) as THREE.BufferAttribute
      copyAttributeData(srcAttribute, dstAttribute, vertexStart)

      // fill the rest in with zeroes
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

    // copy index
    if (hasIndex && dstIndex) {
      const indexStart = geometryInfo.indexStart
      const reservedIndexCount = geometryInfo.reservedIndexCount
      geometryInfo.indexCount = geometry.getIndex()!.count

      // copy index data over
      for (let i = 0; i < srcIndex.count; i++) {
        dstIndex.setX(indexStart + i, vertexStart + srcIndex.getX(i))
      }

      // fill the rest in with zeroes
      for (let i = srcIndex.count, l = reservedIndexCount; i < l; i++) {
        dstIndex.setX(indexStart + i, vertexStart)
      }

      dstIndex.needsUpdate = true
      dstIndex.addUpdateRange(indexStart, geometryInfo.reservedIndexCount)
    }

    // lazily computed when needed by hit testing
    geometryInfo.boundingBox = null

    return geometryId
  }

  deleteGeometry(geometryId: number) {
    const geometryInfoList = this._geometryInfo
    if (
      geometryId >= geometryInfoList.length ||
      geometryInfoList[geometryId].active === false
    ) {
      return this
    }

    geometryInfoList[geometryId].active = false
    geometryInfoList[geometryId].visible = false
    this._availableGeometryIds.push(geometryId)

    return this
  }

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

  // get bounding box and compute it if it doesn't exist
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
      const { start, count } = this.getDrawRange(geometryInfo, index != null)
      for (
        let i = start, l = start + count;
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

  // get bounding sphere
  getBoundingSphereAt(geometryId: number, target: THREE.Sphere) {
    if (geometryId >= this._geometryCount) {
      return null
    }
    this.getBoundingBoxAt(geometryId, _box)
    _box.getBoundingSphere(target)
    return target
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

  getGeometryRangeAt(geometryId: number) {
    this.validateGeometryId(geometryId)
    return this._geometryInfo[geometryId]
  }

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

  getObjectAt(batchId: number) {
    const object = new THREE.Mesh()
    this._initializeRaycastObject(object)
    const geometryInfo = this._geometryInfo[batchId]
    const { start, count } = this.getDrawRange(geometryInfo)
    this._setRaycastObjectInfo(
      object,
      batchId,
      start,
      count
    )
    return object
  }

  private _initializeRaycastObject(raycastObject: THREE.Mesh) {
    const batchGeometry = this.geometry
    raycastObject.material = this.material
    raycastObject.geometry.index = batchGeometry.index
    raycastObject.geometry.attributes = batchGeometry.attributes
    if (raycastObject.geometry.boundingBox === null) {
      raycastObject.geometry.boundingBox = new THREE.Box3()
    }

    if (raycastObject.geometry.boundingSphere === null) {
      raycastObject.geometry.boundingSphere = new THREE.Sphere()
    }
    return raycastObject
  }

  private _setRaycastObjectInfo(
    raycastObject: THREE.Mesh,
    index: number,
    start: number,
    count: number
  ) {
    raycastObject.geometry.setDrawRange(start, count)

    // get the intersects
    this.getBoundingBoxAt(index, raycastObject.geometry.boundingBox!)
    this.getBoundingSphereAt(index, raycastObject.geometry.boundingSphere!)
  }

  private _resetRaycastObjectInfo(raycastObject: THREE.Mesh) {
    raycastObject.geometry.index = null
    raycastObject.geometry.attributes = {}
    raycastObject.geometry.setDrawRange(0, Infinity)
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

  intersectWith(
    geometryId: number,
    raycaster: THREE.Raycaster,
    intersects: THREE.Intersection[]
  ) {
    this._initializeRaycastObject(_raycastObject)
    this._intersectWith(geometryId, raycaster, intersects)
    this._resetRaycastObjectInfo(_raycastObject)
  }

  private _intersectWith(
    geometryId: number,
    raycaster: THREE.Raycaster,
    intersects: THREE.Intersection[]
  ) {
    const geometryInfo = this._geometryInfo[geometryId]
    if (!geometryInfo.visible || !geometryInfo.active) {
      return
    }

    if (geometryInfo.bboxIntersectionCheck) {
      this.getBoundingBoxAt(geometryId, _box)
      // Check for intersection with the bounding box
      if (raycaster.ray.intersectBox(_box, _vector)) {
        const distance = raycaster.ray.origin.distanceTo(_vector)
        // Push intersection details
        intersects.push({
          distance: distance,
          point: _vector.clone(),
          object: this,
          face: null,
          faceIndex: undefined,
          uv: undefined,
          batchId: geometryId,
          // @ts-expect-error THREE.Intersection doesn't have property 'objectId'
          objectId: geometryInfo.objectId
        })
      }
    } else {
      const { start, count } = this.getDrawRange(geometryInfo)
      this._setRaycastObjectInfo(
        _raycastObject,
        geometryId,
        start,
        count
      )
      _raycastObject.raycast(raycaster, _batchIntersects)

      // add batch id to the intersects
      for (let j = 0, l = _batchIntersects.length; j < l; j++) {
        const intersect = _batchIntersects[j]
        intersect.object = this
        intersect.batchId = geometryId
        // @ts-expect-error THREE.Intersection doesn't have property 'objectId'
        intersect.objectId = geometryInfo.objectId
        intersects.push(intersect)
      }

      _batchIntersects.length = 0
    }
  }

  raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    const geometryInfoList = this._geometryInfo
    this._initializeRaycastObject(_raycastObject)

    for (let i = 0, l = geometryInfoList.length; i < l; i++) {
      this._intersectWith(i, raycaster, intersects)
    }
    this._resetRaycastObjectInfo(_raycastObject)
  }

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

  dispose() {
    // Assuming the geometry is not shared with other meshes
    this.geometry.dispose()
    return this
  }

  private getDrawRange(
    geometryInfo: AcTrBatchedGeometryInfo,
    hasIndex: boolean = this.geometry.index != null
  ) {
    return hasIndex
      ? { start: geometryInfo.indexStart, count: geometryInfo.indexCount }
      : { start: geometryInfo.vertexStart, count: geometryInfo.vertexCount }
  }
}
