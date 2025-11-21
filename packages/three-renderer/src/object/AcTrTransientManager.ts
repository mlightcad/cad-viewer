import * as THREE from 'three'

import { AcTrEntity } from './AcTrEntity'

/**
 * Manages transient AcTrEntity objects in a dedicated THREE.Group.
 */
export class AcTrTransientManager {
  private readonly scene: THREE.Scene
  private readonly transientGroup: THREE.Group

  /** Mapping from transient ID → AcTrEntity */
  private readonly entities: Map<string, AcTrEntity>

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.transientGroup = new THREE.Group()
    this.transientGroup.name = 'Transient_Object_Group'
    this.scene.add(this.transientGroup)

    this.entities = new Map()
  }

  /**
   * Clear all transient entities and their GPU resources.
   */
  clear(): void {
    for (const ent of this.entities.values()) {
      ent.dispose()
    }

    this.entities.clear()
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
      existing.dispose()
    }

    this.entities.set(key, entity)
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
      old.dispose()
    }

    this.entities.set(newEntity.objectId, newEntity)
    this.transientGroup.add(newEntity)
  }

  /**
   * Remove a transient entity by ID.
   */
  remove(id: string): void {
    const ent = this.entities.get(id)
    if (!ent) return

    this.transientGroup.remove(ent)
    AcTrEntity.disposeObject(ent)
    this.entities.delete(id)
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
