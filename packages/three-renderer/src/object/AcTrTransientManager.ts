import * as THREE from 'three'

import { AcTrMTextRenderer } from '../renderer/AcTrMTextRenderer'
import { AcTrEntity } from './AcTrEntity'

/**
 * Manages transient AcTrEntity objects in a dedicated THREE.Group.
 */
export class AcTrTransientManager {
  private readonly scene: THREE.Scene
  private readonly transientGroup: THREE.Group

  /** Mapping from transient ID → AcTrEntity */
  private readonly entities: Map<string, AcTrEntity>
  /** World matrix captured when each transient was published. */
  private readonly _baselineMatrices = new Map<string, THREE.Matrix4>()
  private readonly _composedMatrix = new THREE.Matrix4()

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.transientGroup = new THREE.Group()
    this.transientGroup.name = 'Transient_Object_Group'
    this.scene.add(this.transientGroup)

    this.entities = new Map()
  }

  /**
   * Drops scene-level mesh-glyph InstancedMesh slots for a transient id.
   * Jig/preview draws may have enqueued placements under the shared objectId
   * before skip flags applied; clearing on replace/remove prevents trails.
   */
  private clearMeshGlyphInstances(objectId: string): void {
    if (!objectId) return
    AcTrMTextRenderer.getInstance().removeMeshGlyphInstances(objectId)
  }

  /**
   * Clear all transient entities and their GPU resources.
   */
  clear(): void {
    for (const ent of this.entities.values()) {
      this.clearMeshGlyphInstances(ent.objectId)
      ent.dispose()
    }

    this.entities.clear()
    this._baselineMatrices.clear()
    this.transientGroup.clear()
  }

  /**
   * Add a transient entity. If the ID already exists, the previous one is replaced.
   *
   * @param entity The AcTrEntity to add.
   */
  add(entity: AcTrEntity): void {
    const key = entity.objectId

    const existing = this.entities.get(key)
    if (existing) {
      this.transientGroup.remove(existing)
      this.clearMeshGlyphInstances(key)
      existing.dispose()
    }

    this.entities.set(key, entity)
    this._baselineMatrices.set(key, entity.matrix.clone())
    this.transientGroup.add(entity)
  }

  /**
   * Replace an existing transient entity with a new one. The new entity should have the same
   * object id with the old entity.
   */
  update(newEntity: AcTrEntity): void {
    const old = this.entities.get(newEntity.objectId)

    if (old) {
      this.transientGroup.remove(old)
      this.clearMeshGlyphInstances(newEntity.objectId)
      old.dispose()
    }

    this.entities.set(newEntity.objectId, newEntity)
    this._baselineMatrices.set(newEntity.objectId, newEntity.matrix.clone())
    this.transientGroup.add(newEntity)
  }

  /**
   * Remove a transient entity by ID.
   */
  remove(id: string): void {
    const ent = this.entities.get(id)
    if (!ent) {
      // Still clear mesh glyphs: a stale asyncDraw may have enqueued under this
      // id without ever publishing into the transient map.
      this.clearMeshGlyphInstances(id)
      return
    }

    this.transientGroup.remove(ent)
    this.clearMeshGlyphInstances(id)
    AcTrEntity.disposeObject(ent)
    this.entities.delete(id)
    this._baselineMatrices.delete(id)
  }

  /**
   * Applies world transforms to existing transient entities without reconverting
   * them or replacing GPU resources.
   *
   * Preview jigs pass a delta transform (move, rotate, copy). When the transient
   * already carries a block-reference INSERT matrix, compose
   * `delta * baseline` instead of replacing the baseline so preview geometry
   * stays in WCS.
   */
  applyTransforms(
    transforms: ReadonlyArray<{ id: string; matrix: THREE.Matrix4 }>
  ): boolean {
    let updated = false
    for (const { id, matrix } of transforms) {
      const ent = this.entities.get(id)
      if (!ent) {
        continue
      }
      const baseline = this._baselineMatrices.get(id)
      const composed = this._composedMatrix.copy(matrix)
      if (baseline) {
        composed.multiply(baseline)
      }
      if (ent.matrix.equals(composed)) {
        continue
      }
      ent.matrix.copy(composed)
      ent.matrixAutoUpdate = false
      ent.updateMatrixWorld(true)
      updated = true
    }
    return updated
  }

  /**
   * Retrieve a transient entity by ID.
   */
  get(id: string): AcTrEntity | undefined {
    return this.entities.get(id)
  }

  /**
   * Check whether a transient entity exists.
   */
  has(id: string): boolean {
    return this.entities.has(id)
  }

  /**
   * Show or hide all transient objects.
   */
  setVisible(visible: boolean): void {
    this.transientGroup.visible = visible
  }

  /**
   * Destroy the manager and release all GPU resources.
   */
  dispose(): void {
    this.clear()
    this.scene.remove(this.transientGroup)
  }
}
