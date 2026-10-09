import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

import { AcTrBufferGeometryUtil, AcTrMaterialUtil } from '../util'
import {
  HIGHLIGHT_HOVER_COLOR,
  HIGHLIGHT_SELECT_COLOR
} from '../util/AcTrMaterialUtil'
import { getSceneDrawableUserData } from '../util/AcTrObjectUserData'
import type { AcTrBatchHighlightKind } from './highlight'

/**
 * Drawable families that can share one block-template geometry across INSERTs.
 *
 * Hairlines, meshes, and points are GPU-instanced. Fat lines (`LineSegments2`)
 * already use segment instancing, so each INSERT keeps its own object and only
 * the geometry buffer is shared.
 */
export type AcTrSharedGeometryKind = 'line' | 'mesh' | 'points' | 'line2'

const INITIAL_CAPACITY = 32

const _relative = /*@__PURE__*/ new THREE.Matrix4()
const _full = /*@__PURE__*/ new THREE.Matrix4()
const _originInverse = /*@__PURE__*/ new THREE.Matrix4()
const _originTranslation = /*@__PURE__*/ new THREE.Matrix4()
const _local = /*@__PURE__*/ new THREE.Matrix4()
const _scratchBox = /*@__PURE__*/ new THREE.Box3()
const _hiddenMatrix = /*@__PURE__*/ new THREE.Matrix4().makeScale(0, 0, 0)

interface InstancedDrawable extends THREE.Object3D {
  instanceMatrix: THREE.InstancedBufferAttribute
  instanceColor: THREE.InstancedBufferAttribute | null
  morphTexture: THREE.Texture | null
  count: number
  isInstancedMesh: boolean
  material: THREE.Material | THREE.Material[]
  geometry: THREE.BufferGeometry
}

/**
 * One shared block-template geometry drawn at many INSERT transforms.
 *
 * Vertex data is stored once. Each INSERT contributes a matrix (and, for fat
 * lines, an object that references that buffer) instead of a deep copy.
 */
export class AcTrSharedGeometryBatch extends THREE.Object3D {
  readonly kind: AcTrSharedGeometryKind
  /** Template geometry id used to group later INSERTs onto this batch. */
  readonly sourceUuid: string
  private readonly _geometry: THREE.BufferGeometry
  private _material: THREE.Material
  private readonly _origin: THREE.Vector3
  private readonly _localBox = new THREE.Box3()
  private _drawable: InstancedDrawable | null = null
  private _line2Objects: Array<LineSegments2 | null> = []
  private _capacity = 0
  private _count = 0
  private _alive!: Uint8Array
  private _bboxOnly!: Uint8Array
  private _objectIds: Array<string | undefined> = []
  private _hiddenMatrices = new Map<number, Float32Array>()
  /** Relative matrices for fat-line instances (no GPU instance buffer). */
  private _cpuRelative: Float32Array | null = null
  private _selected = new Set<number>()
  private _hovered = new Set<number>()
  private readonly _highlights = new Map<number, THREE.Object3D>()
  private readonly _raycastScratch: THREE.Object3D

  /**
   * @param geometry - Owned geometry clone. Not disposed by this batch.
   * @param material - Layer material shared with the style cache.
   * @param origin - World translation used to keep instance matrices small.
   * @param kind - Primitive family of `geometry`.
   * @param sourceUuid - UUID of the block-template geometry this batch serves.
   */
  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    origin: THREE.Vector3,
    kind: AcTrSharedGeometryKind,
    sourceUuid: string
  ) {
    super()
    this._geometry = geometry
    this._material = material
    this._origin = origin.clone()
    this.kind = kind
    this.sourceUuid = sourceUuid
    this.matrixAutoUpdate = false
    AcTrBufferGeometryUtil.safeComputeBoundingBox(geometry)
    if (geometry.boundingBox) {
      this._localBox.copy(geometry.boundingBox)
    }
    this._raycastScratch = this.createDrawable(geometry, material)
    this._raycastScratch.matrixAutoUpdate = false
    this._raycastScratch.frustumCulled = false
    if (kind === 'line2') {
      return
    }
    this._drawable = this.createInstanced(geometry, material, INITIAL_CAPACITY)
    this._capacity = INITIAL_CAPACITY
    this._alive = new Uint8Array(INITIAL_CAPACITY)
    this._bboxOnly = new Uint8Array(INITIAL_CAPACITY)
    this._drawable.position.copy(this._origin)
    this._drawable.matrixAutoUpdate = false
    this._drawable.updateMatrix()
    this._drawable.frustumCulled = false
    this._drawable.raycast = () => {
      /* Picking goes through intersectWith so one shared buffer is not
       * tested as if it sat only at the batch origin. */
    }
    this.add(this._drawable)
  }

  get origin() {
    return this._origin
  }

  get materialId() {
    return this._material.id
  }

  get material() {
    return this._material
  }

  set material(material: THREE.Material) {
    this._material = material
    if (this._drawable) {
      this._drawable.material = material
    }
    ;(this._raycastScratch as THREE.Mesh).material = material
    for (const line of this._line2Objects) {
      if (line) {
        ;(line as unknown as THREE.Mesh).material = material
      }
    }
  }

  /** Number of live INSERT slots, including ones hidden but not deleted. */
  get instanceCount() {
    let count = 0
    for (let i = 0; i < this._count; i++) {
      if (this._alive[i]) count++
    }
    return count
  }

  /**
   * Appends one INSERT of this geometry.
   *
   * @param matrixWorld - World matrix of the drawable leaf.
   * @param objectId - Database id of the owning INSERT.
   * @param bboxOnly - When true, ray tests use the transformed bounds only.
   * @returns Stable slot index.
   */
  addInstance(
    matrixWorld: THREE.Matrix4,
    objectId: string,
    bboxOnly: boolean
  ) {
    const index = this._count
    this.ensureCapacity(index + 1)
    this._count++
    this._alive[index] = 1
    this._bboxOnly[index] = bboxOnly ? 1 : 0
    this._objectIds[index] = objectId
    this.writeRelative(index, matrixWorld)
    if (this.kind === 'line2') {
      this._line2Objects[index] = this.createLine2(index)
    } else if (this._drawable) {
      this._drawable.count = this._count
    }
    if (bboxOnly) {
      const target = this._line2Objects[index] ?? this._drawable
      if (target) {
        getSceneDrawableUserData(target).bboxIntersectionCheck = true
      }
    }
    return index
  }

  /**
   * @param geometryId - Slot index returned by {@link addInstance}.
   * @param value - Desired visibility.
   * @returns This batch.
   */
  setVisibleAt(geometryId: number, value: boolean) {
    if (!this.isAlive(geometryId)) {
      return this
    }
    const attribute = this._drawable?.instanceMatrix
    if (!attribute) {
      const line = this._line2Objects[geometryId]
      if (line) line.visible = value
      if (!value) this.removeHighlight(geometryId)
      return this
    }
    const offset = geometryId * 16
    const array = attribute.array as Float32Array
    if (value) {
      const saved = this._hiddenMatrices.get(geometryId)
      if (saved) {
        array.set(saved, offset)
        this._hiddenMatrices.delete(geometryId)
      }
    } else if (!this._hiddenMatrices.has(geometryId)) {
      const saved = new Float32Array(16)
      saved.set(array.subarray(offset, offset + 16))
      this._hiddenMatrices.set(geometryId, saved)
      _hiddenMatrix.toArray(array, offset)
      this.removeHighlight(geometryId)
    }
    attribute.needsUpdate = true
    return this
  }

  /**
   * @param geometryId - Slot index to query.
   * @returns `true` when the slot is visible.
   */
  getVisibleAt(geometryId: number) {
    if (!this.isAlive(geometryId)) return false
    if (this.kind === 'line2') {
      return this._line2Objects[geometryId]?.visible !== false
    }
    return !this._hiddenMatrices.has(geometryId)
  }

  /**
   * Hides one slot and drops its highlight. The shared geometry stays.
   *
   * @param geometryId - Slot index to remove.
   */
  deleteGeometry(geometryId: number) {
    if (!this.isAlive(geometryId)) return
    this.setVisibleAt(geometryId, false)
    this._alive[geometryId] = 0
    this._selected.delete(geometryId)
    this._hovered.delete(geometryId)
    this.removeHighlight(geometryId)
    const line = this._line2Objects[geometryId]
    if (line) {
      line.geometry = null as unknown as LineSegmentsGeometry
      line.removeFromParent()
      this._line2Objects[geometryId] = null
    }
  }

  /** Shared geometry is not packed, so there is nothing to compact. */
  optimize() {}

  /**
   * Tints one INSERT by adding a small overlay that references the shared
   * geometry. The template buffer is not copied.
   *
   * @returns `true` when the highlight state changed.
   */
  setHighlightAt(
    geometryId: number,
    kind: AcTrBatchHighlightKind,
    enabled: boolean
  ) {
    if (!this.isAlive(geometryId)) return false
    const set = kind === 'select' ? this._selected : this._hovered
    const had = set.has(geometryId)
    if (enabled) set.add(geometryId)
    else set.delete(geometryId)
    if (had === enabled && this._highlights.has(geometryId) === enabled) {
      return false
    }
    this.syncHighlight(geometryId)
    return true
  }

  /** Highlight overlays update immediately inside {@link setHighlightAt}. */
  flushHighlightMask() {}

  /**
   * Compare tint is applied by the overlay path via {@link getObjectAt}.
   *
   * @returns `false` so the packed-slot compare mask is left unused.
   */
  setCompareRoleAt(_geometryId: number, _role: unknown) {
    return false
  }

  /**
   * Packed compare uniforms do not apply to shared template geometry.
   * Entity compare overlays are built from {@link getObjectAt}.
   */
  setCompareDisplayColors(_options: {
    enabled: boolean
    baseColor?: number
    deletedColor?: number
    addedColor?: number
    modifiedColor?: number
  }) {}

  /**
   * @param _roles - Compare roles keyed by entity id. Unused.
   * @returns This batch.
   */
  applyPackedCompareRoles(_roles: ReadonlyMap<string, unknown>) {
    return this
  }

  /**
   * Ray-tests one INSERT slot against the shared geometry.
   *
   * @param geometryId - Slot index to test.
   * @param raycaster - World-space ray.
   * @param intersects - Output intersection list.
   */
  intersectWith(
    geometryId: number,
    raycaster: THREE.Raycaster,
    intersects: THREE.Intersection[]
  ) {
    if (!this.isAlive(geometryId) || !this.getVisibleAt(geometryId)) return
    this.composeFullMatrix(geometryId, _full)
    if (this._bboxOnly[geometryId]) {
      _scratchBox.copy(this._localBox).applyMatrix4(_full)
      const hit = raycaster.ray.intersectBox(_scratchBox, _hitPoint)
      if (!hit) return
      intersects.push({
        distance: raycaster.ray.origin.distanceTo(hit),
        point: hit.clone(),
        object: this
      })
      return
    }
    if (this.kind === 'line2') {
      const line = this._line2Objects[geometryId]
      if (!line) return
      line.updateWorldMatrix(true, false)
      const hits = raycaster.intersectObject(line, false)
      for (let i = 0; i < hits.length; i++) intersects.push(hits[i])
      return
    }
    const scratch = this._raycastScratch
    // Line/Points raycast divides the world threshold by `object.scale`.
    // Column lengths stay positive under a mirrored INSERT; Matrix4.decompose
    // negates one axis and inflates the tolerance by about 3×.
    assignPositiveColumnScale(_full, scratch.scale)
    scratch.matrixWorld.copy(_full)
    scratch.matrixWorldNeedsUpdate = false
    const hits = raycaster.intersectObject(scratch, false)
    for (let i = 0; i < hits.length; i++) intersects.push(hits[i])
  }

  /**
   * Builds a standalone view of one slot for highlight and preview overlays.
   *
   * The returned object aliases {@link _geometry}. Callers must not dispose it.
   *
   * @param batchId - Slot index.
   * @returns A drawable placed at the INSERT transform, relative to this batch.
   */
  getObjectAt(batchId: number) {
    this.composeLocalMatrix(batchId, _full)
    const object = this.createDrawable(this._geometry, this._material)
    object.matrix.copy(_full)
    object.matrixAutoUpdate = false
    object.matrixWorld.copy(_full)
    object.matrixWorldNeedsUpdate = false
    getSceneDrawableUserData(object).sharesTemplateGeometry = true
    return object
  }

  /**
   * Unions world-space bounds of visible slots into `target`.
   *
   * @param target - Destination box. Not cleared.
   * @param options - Optional object-id filters used by layer extent queries.
   */
  unionActiveVisibleBoundingBoxInto(
    target: THREE.Box3,
    options?: {
      excludeObjectIds?: ReadonlySet<string>
      includeObjectIds?: ReadonlySet<string>
    }
  ) {
    if (this._drawable) this._drawable.updateWorldMatrix(true, false)
    for (let i = 0; i < this._count; i++) {
      if (!this._alive[i] || !this.getVisibleAt(i)) continue
      const objectId = this._objectIds[i]
      if (objectId && options?.excludeObjectIds?.has(objectId)) continue
      if (
        options?.includeObjectIds &&
        (!objectId || !options.includeObjectIds.has(objectId))
      ) {
        continue
      }
      this.composeFullMatrix(i, _full)
      _scratchBox.copy(this._localBox).applyMatrix4(_full)
      target.union(_scratchBox)
    }
  }

  /**
   * Detaches GPU instances and fat-line objects.
   *
   * The shared geometry clone is owned by {@link AcTrBatchedGroup} and is not
   * disposed here.
   */
  disposeSharedInstances() {
    for (const highlight of this._highlights.values()) {
      this.disposeOverlay(highlight)
    }
    this._highlights.clear()
    for (const line of this._line2Objects) {
      if (!line) continue
      line.geometry = null as unknown as LineSegmentsGeometry
      line.removeFromParent()
    }
    this._line2Objects = []
    if (this._drawable) {
      this._drawable.removeFromParent()
      const drawable = this._drawable as unknown as {
        dispose?: () => void
        dispatchEvent: (event: { type: string }) => void
      }
      // Frees the instance-matrix GPU buffer. Does not release the shared
      // geometry; that clone is owned by AcTrBatchedGroup.
      if (drawable.dispose) drawable.dispose()
      else drawable.dispatchEvent({ type: 'dispose' })
      this._drawable = null
    }
    this.removeFromParent()
  }

  private isAlive(index: number) {
    return index >= 0 && index < this._count && this._alive[index] === 1
  }

  private ensureCapacity(needed: number) {
    if (this.kind === 'line2' && this._alive == null) {
      this._capacity = INITIAL_CAPACITY
      this._alive = new Uint8Array(this._capacity)
      this._bboxOnly = new Uint8Array(this._capacity)
      this._cpuRelative = new Float32Array(this._capacity * 16)
    }
    if (needed <= this._capacity) return
    let next = Math.max(this._capacity, INITIAL_CAPACITY)
    while (next < needed) next *= 2
    const alive = new Uint8Array(next)
    const bboxOnly = new Uint8Array(next)
    alive.set(this._alive)
    bboxOnly.set(this._bboxOnly)
    this._alive = alive
    this._bboxOnly = bboxOnly
    if (this._cpuRelative) {
      const relative = new Float32Array(next * 16)
      relative.set(this._cpuRelative)
      this._cpuRelative = relative
    }
    this._capacity = next
    if (!this._drawable) return
    const previous = this._drawable.instanceMatrix
    const attribute = new THREE.InstancedBufferAttribute(
      new Float32Array(next * 16),
      16
    )
    attribute.setUsage(THREE.DynamicDrawUsage)
    attribute.array.set(previous.array as Float32Array)
    this._drawable.instanceMatrix = attribute
  }

  private writeRelative(index: number, matrixWorld: THREE.Matrix4) {
    _originInverse.makeTranslation(
      -this._origin.x,
      -this._origin.y,
      -this._origin.z
    )
    _relative.multiplyMatrices(_originInverse, matrixWorld)
    if (this._cpuRelative) {
      _relative.toArray(this._cpuRelative, index * 16)
    }
    const attribute = this._drawable?.instanceMatrix
    if (!attribute) return
    _relative.toArray(attribute.array as Float32Array, index * 16)
    attribute.needsUpdate = true
  }

  private readRelative(index: number, target: THREE.Matrix4) {
    const saved = this._hiddenMatrices.get(index)
    if (saved) return target.fromArray(saved)
    if (this._cpuRelative) return target.fromArray(this._cpuRelative, index * 16)
    const attribute = this._drawable?.instanceMatrix
    if (attribute) {
      target.fromArray(attribute.array as Float32Array, index * 16)
    }
    return target
  }

  /** Matrix relative to this batch (parented under the layer group). */
  private composeLocalMatrix(index: number, target: THREE.Matrix4) {
    this.readRelative(index, _relative)
    _originTranslation.makeTranslation(
      this._origin.x,
      this._origin.y,
      this._origin.z
    )
    return target.multiplyMatrices(_originTranslation, _relative)
  }

  /**
   * World matrix of one slot.
   *
   * Instance matrices are relative to the origin. The instanced drawable's
   * world matrix already applies that origin, so the product is the INSERT
   * transform captured at add time.
   */
  private composeFullMatrix(index: number, target: THREE.Matrix4) {
    this.readRelative(index, _relative)
    if (this._drawable) {
      this._drawable.updateWorldMatrix(true, false)
      return target.multiplyMatrices(this._drawable.matrixWorld, _relative)
    }
    this.composeLocalMatrix(index, _local)
    this.updateWorldMatrix(true, false)
    return target.multiplyMatrices(this.matrixWorld, _local)
  }

  private createLine2(index: number) {
    this.composeLocalMatrix(index, _full)
    const line = new LineSegments2(
      this._geometry as LineSegmentsGeometry,
      this._material as never
    )
    line.matrix.copy(_full)
    line.matrixAutoUpdate = false
    line.matrixWorldNeedsUpdate = true
    line.frustumCulled = false
    getSceneDrawableUserData(line).sharesTemplateGeometry = true
    this.add(line)
    return line
  }

  private syncHighlight(index: number) {
    this.removeHighlight(index)
    if (!this.getVisibleAt(index)) return
    const selected = this._selected.has(index)
    const hovered = this._hovered.has(index)
    if (!selected && !hovered) return
    this.composeLocalMatrix(index, _full)
    const overlay = this.createDrawable(this._geometry, this._material)
    overlay.matrix.copy(_full)
    overlay.matrixAutoUpdate = false
    overlay.renderOrder = 10000
    overlay.raycast = () => {}
    const material = overlay.material
    if (material && !Array.isArray(material)) {
      overlay.material = material.clone()
      AcTrMaterialUtil.setMaterialColor(
        overlay.material,
        selected ? HIGHLIGHT_SELECT_COLOR : HIGHLIGHT_HOVER_COLOR
      )
    }
    getSceneDrawableUserData(overlay).sharesTemplateGeometry = true
    this.add(overlay)
    this._highlights.set(index, overlay)
  }

  private removeHighlight(index: number) {
    const overlay = this._highlights.get(index)
    if (!overlay) return
    this.disposeOverlay(overlay)
    this._highlights.delete(index)
  }

  private disposeOverlay(overlay: THREE.Object3D) {
    if ('material' in overlay && overlay.material instanceof THREE.Material) {
      overlay.material.dispose()
    }
    if ('geometry' in overlay) {
      ;(overlay as THREE.Mesh).geometry = null as unknown as THREE.BufferGeometry
    }
    overlay.removeFromParent()
  }

  private createInstanced(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    capacity: number
  ): InstancedDrawable {
    if (this.kind === 'mesh') {
      const mesh = new THREE.InstancedMesh(geometry, material, capacity)
      mesh.count = 0
      mesh.frustumCulled = false
      return mesh
    }
    const object =
      this.kind === 'points'
        ? new THREE.Points(geometry, material)
        : new THREE.LineSegments(geometry, material)
    const instanced = object as unknown as InstancedDrawable
    instanced.isInstancedMesh = true
    instanced.instanceMatrix = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 16),
      16
    )
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    // Match InstancedMesh. An undefined instanceColor still passes
    // `!== null` and the renderer tries to upload it.
    instanced.instanceColor = null
    instanced.morphTexture = null
    instanced.count = 0
    instanced.frustumCulled = false
    return instanced
  }

  private createDrawable(
    geometry: THREE.BufferGeometry,
    material: THREE.Material
  ) {
    if (this.kind === 'mesh') return new THREE.Mesh(geometry, material)
    if (this.kind === 'points') return new THREE.Points(geometry, material)
    if (this.kind === 'line2') {
      return new LineSegments2(geometry as LineSegmentsGeometry, material as never)
    }
    return new THREE.LineSegments(geometry, material)
  }
}

const _hitPoint = /*@__PURE__*/ new THREE.Vector3()

/**
 * Writes the absolute length of each matrix column into `target`.
 *
 * Line and point raycasts divide the world pick threshold by the average of
 * `object.scale`. A mirrored INSERT has a negative determinant; using the
 * signed scale from {@link THREE.Matrix4.decompose} makes that average too
 * small and the pick sloppy.
 *
 * @param matrix - World matrix of one INSERT slot.
 * @param target - Scale vector consumed by the raycast scratch object.
 */
function assignPositiveColumnScale(matrix: THREE.Matrix4, target: THREE.Vector3) {
  const e = matrix.elements
  const sx = Math.hypot(e[0], e[1], e[2])
  const sy = Math.hypot(e[4], e[5], e[6])
  const sz = Math.hypot(e[8], e[9], e[10])
  if (sx + sy + sz === 0) {
    target.set(1, 1, 1)
    return
  }
  target.set(sx, sy, sz)
}
