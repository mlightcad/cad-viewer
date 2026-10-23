import type { MeshGlyphPlacement } from '@mlightcad/mtext-renderer'
import * as THREE from 'three'

import type { AcTrBatchHighlightKind } from './highlight'
import {
  AcTrMaterialUtil,
  HIGHLIGHT_HOVER_COLOR,
  HIGHLIGHT_SELECT_COLOR
} from '../util/AcTrMaterialUtil'
import { getSceneDrawableUserData } from '../util/AcTrObjectUserData'

const _matrix = /*@__PURE__*/ new THREE.Matrix4()
const _world = /*@__PURE__*/ new THREE.Matrix4()
const _box = /*@__PURE__*/ new THREE.Box3()
const _hitPoint = /*@__PURE__*/ new THREE.Vector3()
const _hiddenMatrix = /*@__PURE__*/ new THREE.Matrix4().makeScale(0, 0, 0)

export interface AcTrMeshGlyphEnqueueMeta {
  /** Database object id of the owning TEXT/MTEXT entity. */
  objectId: string
  /** AutoCAD layer name — InstancedMesh is parented under this layer group. */
  layerName: string
  /** When false, slots are scale-hidden immediately after flush. */
  visible?: boolean
}

interface GlyphBatchBucket {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  layerName: string
  /** World-space column-major matrices. */
  matrices: Float32Array[]
  objectIds: string[]
}

interface LiveSlot {
  mesh: THREE.InstancedMesh
  index: number
  /** Saved matrix while hidden (scale-0 trick). */
  hiddenSaved?: Float32Array
}

/**
 * Scene-level InstancedMesh builder for TrueType mesh glyphs.
 *
 * Unit glyph geometries stay in the mtext-renderer cache. Each placement
 * contributes a world-space 4×4 matrix, avoiding per-entity `mergeMesh`
 * vertex bake on text-heavy drawings.
 *
 * Buckets are keyed by `geometry × material × layer` and parented under the
 * layer group so layer on/off works. Per-entity hide uses the same scale-0
 * instance-matrix trick as {@link AcTrSharedGeometryBatch}. Selection/hover
 * uses cloned-geometry overlays (same pattern as shared INSERT batches).
 */
export class AcTrMeshGlyphWorldBatch {
  private readonly _buckets = new Map<string, GlyphBatchBucket>()
  private _root: THREE.Group | null = null
  private _placementCount = 0
  /** objectId → instance slots after {@link flush}. */
  private readonly _slotsByObjectId = new Map<string, LiveSlot[]>()
  /**
   * World-space AABB per selectable objectId, rebuilt on {@link flush}.
   * Used for picking when spatial-index child boxes omit stolen mesh glyphs.
   */
  private readonly _worldPickBoxByObjectId = new Map<string, THREE.Box3>()
  /** objectIds that should start hidden once slots exist. */
  private readonly _startHiddenObjectIds = new Set<string>()
  private readonly _selectedIds = new Set<string>()
  private readonly _hoveredIds = new Set<string>()
  /** Active highlight overlays keyed by entity object id. */
  private readonly _highlightsByObjectId = new Map<string, THREE.Object3D[]>()

  get placementCount(): number {
    return this._placementCount
  }

  get bucketCount(): number {
    return this._buckets.size
  }

  /**
   * Queues placements already converted to **world space** (caller bakes
   * MTextObject.position / entity hierarchy into each matrix).
   */
  enqueue(
    worldMatrices: readonly Float32Array[],
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    meta: AcTrMeshGlyphEnqueueMeta
  ): void {
    if (worldMatrices.length === 0 || !geometry) {
      return
    }
    const layerName = meta.layerName || '0'
    const key = `${geometry.uuid}\0${material.uuid}\0${layerName}`
    let bucket = this._buckets.get(key)
    if (!bucket) {
      bucket = {
        geometry,
        material,
        layerName,
        matrices: [],
        objectIds: []
      }
      this._buckets.set(key, bucket)
    }
    for (const matrixElements of worldMatrices) {
      bucket.matrices.push(matrixElements)
      bucket.objectIds.push(meta.objectId)
      this._placementCount++
    }
    if (meta.visible === false) {
      this._startHiddenObjectIds.add(meta.objectId)
    }
  }

  /**
   * Builds InstancedMeshes. Prefer parenting under the layer group via
   * `resolveLayerParent`; falls back to `fallbackParent`.
   */
  flush(
    fallbackParent: THREE.Object3D,
    resolveLayerParent?: (layerName: string) => THREE.Object3D | undefined | null
  ): THREE.Group | null {
    if (this._buckets.size === 0) {
      return this._root
    }

    if (!this._root) {
      this._root = new THREE.Group()
      this._root.name = 'AcTrMeshGlyphWorldBatch'
      // Keep a bookkeeping root; real meshes hang under layer groups when possible.
      fallbackParent.add(this._root)
    }

    for (const bucket of this._buckets.values()) {
      const count = bucket.matrices.length
      if (count === 0) {
        continue
      }
      const mesh = new THREE.InstancedMesh(bucket.geometry, bucket.material, count)
      mesh.frustumCulled = false
      mesh.name = `meshGlyph:${bucket.layerName}`
      // Picking goes through {@link intersectsObjectId} so hits map to objectId.
      mesh.raycast = () => {}
      getSceneDrawableUserData(mesh).sharesTemplateGeometry = true
      getSceneDrawableUserData(mesh).bboxIntersectionCheck = true
      // Layer name is encoded in mesh.name / bucket parenting; keep userData typed.

      if (!bucket.geometry.boundingBox) {
        bucket.geometry.computeBoundingBox()
      }
      const local = bucket.geometry.boundingBox
      const meshWorldBox = new THREE.Box3()

      for (let i = 0; i < count; i++) {
        _matrix.fromArray(bucket.matrices[i])
        mesh.setMatrixAt(i, _matrix)
        const objectId = bucket.objectIds[i]
        let slots = this._slotsByObjectId.get(objectId)
        if (!slots) {
          slots = []
          this._slotsByObjectId.set(objectId, slots)
        }
        slots.push({ mesh, index: i })

        if (local && !local.isEmpty()) {
          _box.copy(local).applyMatrix4(_matrix)
          meshWorldBox.union(_box)
          let pickBox = this._worldPickBoxByObjectId.get(objectId)
          if (!pickBox) {
            pickBox = new THREE.Box3()
            this._worldPickBoxByObjectId.set(objectId, pickBox)
          }
          pickBox.union(_box)
        }
      }
      mesh.instanceMatrix.needsUpdate = true
      if (!meshWorldBox.isEmpty()) {
        mesh.boundingBox = meshWorldBox
      }

      const layerParent = resolveLayerParent?.(bucket.layerName)
      ;(layerParent ?? this._root).add(mesh)
    }

    this._buckets.clear()
    this._placementCount = 0

    if (this._startHiddenObjectIds.size > 0) {
      for (const objectId of this._startHiddenObjectIds) {
        this.setVisibleByObjectId(objectId, false)
      }
      this._startHiddenObjectIds.clear()
    }

    return this._root
  }

  /**
   * Ray-tests mesh-glyph instances for one entity using the world AABB cached
   * at {@link flush}. InstancedMeshes are not in {@link AcTrBatchedGroup} slots.
   */
  intersectsObjectId(objectId: string, raycaster: THREE.Raycaster): boolean {
    if (this._startHiddenObjectIds.has(objectId)) {
      return false
    }
    const pickBox = this._worldPickBoxByObjectId.get(objectId)
    if (!pickBox || pickBox.isEmpty()) {
      return false
    }
    // Hidden entities keep a pick box but scale-0 every slot.
    const slots = this._slotsByObjectId.get(objectId)
    if (!slots?.length) {
      return false
    }
    let anyVisible = false
    for (const slot of slots) {
      if (!slot.hiddenSaved) {
        anyVisible = true
        break
      }
    }
    if (!anyVisible) {
      return false
    }
    return raycaster.ray.intersectBox(pickBox, _hitPoint) !== null
  }

  /**
   * Object ids whose world pick AABB intersects `box` (2D paper/WCS query).
   * Used when spatial-index child boxes omit mesh-glyph text.
   */
  queryObjectIdsIntersectingBox(box: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }): string[] {
    const ids: string[] = []
    for (const [objectId, pickBox] of this._worldPickBoxByObjectId) {
      if (pickBox.isEmpty()) continue
      if (
        pickBox.max.x < box.minX ||
        pickBox.min.x > box.maxX ||
        pickBox.max.y < box.minY ||
        pickBox.min.y > box.maxY
      ) {
        continue
      }
      const slots = this._slotsByObjectId.get(objectId)
      if (!slots?.length || slots.every(s => !!s.hiddenSaved)) {
        continue
      }
      ids.push(objectId)
    }
    return ids
  }

  /** Snapshot of world pick boxes after the latest flush (for spatial-index sync). */
  getWorldPickBoxes(): ReadonlyMap<string, THREE.Box3> {
    return this._worldPickBoxByObjectId
  }

  /**
   * Shows or hides all glyph instances belonging to one entity (scale-0).
   * @returns `true` when at least one slot was updated.
   */
  setVisibleByObjectId(objectId: string, visible: boolean): boolean {
    const slots = this._slotsByObjectId.get(objectId)
    if (!slots?.length) {
      return false
    }
    let changed = false
    for (const slot of slots) {
      if (this.writeSlotVisible(slot, visible)) {
        changed = true
      }
    }
    if (changed) {
      // Hidden entities must not keep selection overlays.
      if (!visible) {
        this.clearHighlights(objectId)
      } else {
        this.syncHighlightForObject(objectId)
      }
    }
    return changed
  }

  /**
   * Tints all mesh-glyph instances for one entity via overlay meshes.
   * Select wins over hover when both are active.
   *
   * @returns `true` when highlight state changed.
   */
  setHighlightByObjectId(
    objectId: string,
    kind: AcTrBatchHighlightKind,
    enabled: boolean
  ): boolean {
    if (!objectId || !this._slotsByObjectId.has(objectId)) {
      return false
    }
    const set = kind === 'select' ? this._selectedIds : this._hoveredIds
    const had = set.has(objectId)
    if (enabled) {
      set.add(objectId)
    } else {
      set.delete(objectId)
    }
    if (had === enabled) {
      // Still refresh when the other kind may have changed effective color.
      const hasOverlay = this._highlightsByObjectId.has(objectId)
      const wantOverlay =
        this._selectedIds.has(objectId) || this._hoveredIds.has(objectId)
      if (hasOverlay === wantOverlay) {
        return false
      }
    }
    this.syncHighlightForObject(objectId)
    return true
  }

  /** Hides and forgets slots for a removed entity. */
  removeByObjectId(objectId: string): boolean {
    const slots = this._slotsByObjectId.get(objectId)
    const hadSlots = !!slots?.length
    this._selectedIds.delete(objectId)
    this._hoveredIds.delete(objectId)
    this.clearHighlights(objectId)
    // Scale-0 every live slot before dropping the map entry so forgotten
    // instances cannot stay visible after grip move / entity rebuild.
    if (slots) {
      for (const slot of slots) {
        this.writeSlotVisible(slot, false)
      }
    }
    this._slotsByObjectId.delete(objectId)
    this._worldPickBoxByObjectId.delete(objectId)
    this._startHiddenObjectIds.delete(objectId)
    return hadSlots
  }

  /** Drops GPU objects and queued placements. */
  dispose(): void {
    for (const objectId of [...this._highlightsByObjectId.keys()]) {
      this.clearHighlights(objectId)
    }
    if (this._root) {
      // Meshes may live under layer groups, not only under _root.
      const meshes = new Set<THREE.InstancedMesh>()
      for (const slots of this._slotsByObjectId.values()) {
        for (const slot of slots) {
          meshes.add(slot.mesh)
        }
      }
      this._root.traverse(obj => {
        const mesh = obj as THREE.InstancedMesh
        if (mesh.isInstancedMesh) {
          meshes.add(mesh)
        }
      })
      for (const mesh of meshes) {
        mesh.removeFromParent()
        mesh.dispose()
      }
      this._root.removeFromParent()
      this._root = null
    }
    this._buckets.clear()
    this._slotsByObjectId.clear()
    this._worldPickBoxByObjectId.clear()
    this._startHiddenObjectIds.clear()
    this._selectedIds.clear()
    this._hoveredIds.clear()
    this._placementCount = 0
  }

  /**
   * Converts local placements under `anchor` into world-space matrices.
   * Call after `anchor` is parented and `updateMatrixWorld` has run.
   */
  static bakeWorldMatrices(
    anchor: THREE.Object3D,
    placements: readonly MeshGlyphPlacement[]
  ): Array<{ geometry: THREE.BufferGeometry; matrixElements: Float32Array }> {
    anchor.updateMatrixWorld(true)
    const out: Array<{
      geometry: THREE.BufferGeometry
      matrixElements: Float32Array
    }> = []
    for (const placement of placements) {
      _matrix.fromArray(placement.matrixElements)
      _world.multiplyMatrices(anchor.matrixWorld, _matrix)
      out.push({
        geometry: placement.geometry,
        matrixElements: new Float32Array(_world.elements)
      })
    }
    return out
  }

  /**
   * Union of transformed unit-glyph AABBs in the space of `anchor.matrixWorld`
   * (typically entity-local after invert), for selection boxes.
   */
  static expandBoxFromPlacements(
    target: THREE.Box3,
    placements: readonly MeshGlyphPlacement[],
    anchorMatrixWorld?: THREE.Matrix4
  ): void {
    for (const placement of placements) {
      const geom = placement.geometry
      if (!geom.boundingBox) {
        geom.computeBoundingBox()
      }
      const local = geom.boundingBox
      if (!local || local.isEmpty()) {
        continue
      }
      _matrix.fromArray(placement.matrixElements)
      if (anchorMatrixWorld) {
        _world.multiplyMatrices(anchorMatrixWorld, _matrix)
        _box.copy(local).applyMatrix4(_world)
      } else {
        _box.copy(local).applyMatrix4(_matrix)
      }
      target.union(_box)
    }
  }

  private writeSlotVisible(slot: LiveSlot, visible: boolean): boolean {
    const attribute = slot.mesh.instanceMatrix
    const array = attribute.array as Float32Array
    const offset = slot.index * 16
    if (visible) {
      if (!slot.hiddenSaved) {
        return false
      }
      array.set(slot.hiddenSaved, offset)
      slot.hiddenSaved = undefined
      attribute.needsUpdate = true
      return true
    }
    if (slot.hiddenSaved) {
      return false
    }
    const saved = new Float32Array(16)
    saved.set(array.subarray(offset, offset + 16))
    slot.hiddenSaved = saved
    _hiddenMatrix.toArray(array, offset)
    attribute.needsUpdate = true
    return true
  }

  private syncHighlightForObject(objectId: string): void {
    this.clearHighlights(objectId)
    const selected = this._selectedIds.has(objectId)
    const hovered = this._hoveredIds.has(objectId)
    if (!selected && !hovered) {
      return
    }
    const slots = this._slotsByObjectId.get(objectId)
    if (!slots?.length) {
      return
    }
    const color = selected ? HIGHLIGHT_SELECT_COLOR : HIGHLIGHT_HOVER_COLOR
    const overlays: THREE.Object3D[] = []
    for (const slot of slots) {
      if (slot.hiddenSaved) {
        continue
      }
      // Clone geometry so a non-instanced overlay does not retire the shared
      // unit-glyph buffer used by InstancedMesh (same hazard as INSERT batches).
      const geometry = slot.mesh.geometry.clone()
      const sourceMaterial = slot.mesh.material
      const material = AcTrMaterialUtil.cloneMaterial(
        sourceMaterial as THREE.Material | THREE.Material[]
      ) as THREE.Material
      AcTrMaterialUtil.setMaterialColor(material, color)
      const overlay = new THREE.Mesh(geometry, material)
      const array = slot.mesh.instanceMatrix.array as Float32Array
      overlay.matrix.fromArray(array, slot.index * 16)
      overlay.matrixAutoUpdate = false
      overlay.frustumCulled = false
      overlay.renderOrder = 10000
      overlay.raycast = () => {}
      getSceneDrawableUserData(overlay).sharesTemplateGeometry = false
      const parent = slot.mesh.parent
      if (parent) {
        parent.add(overlay)
      } else if (this._root) {
        this._root.add(overlay)
      }
      overlays.push(overlay)
    }
    if (overlays.length > 0) {
      this._highlightsByObjectId.set(objectId, overlays)
    }
  }

  private clearHighlights(objectId: string): void {
    const overlays = this._highlightsByObjectId.get(objectId)
    if (!overlays) {
      return
    }
    for (const overlay of overlays) {
      overlay.removeFromParent()
      const mesh = overlay as THREE.Mesh
      mesh.geometry?.dispose()
      const material = mesh.material
      if (Array.isArray(material)) {
        for (const m of material) {
          m.dispose()
        }
      } else {
        material?.dispose()
      }
    }
    this._highlightsByObjectId.delete(objectId)
  }
}
