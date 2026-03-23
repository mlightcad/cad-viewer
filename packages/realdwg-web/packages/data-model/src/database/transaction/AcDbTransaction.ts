import { AcDbObject, AcDbObjectId, AcDbOpenMode } from '../../base'

/**
 * Represents a single database transaction.
 *
 * A transaction records the original state of opened objects so that
 * changes can be committed or rolled back.
 *
 * This class is normally not instantiated directly by users.
 */
export class AcDbTransaction {
  /** Objects opened in this transaction */
  private readonly openedObjects = new Map<AcDbObjectId, AcDbObject>()

  /** Snapshots of objects before modification */
  private readonly originalStates = new Map<AcDbObjectId, unknown>()

  /**
   * Records an object opening.
   *
   * @param objectId - Object identifier
   * @param mode - Open mode
   * @param openErased - Whether erased objects are allowed
   */
  getObject<T extends AcDbObject>(
    objectId: AcDbObjectId,
    mode: AcDbOpenMode,
    openErased = false
  ): T | undefined {
    if (!this.openedObjects.has(objectId)) {
      const obj = this.lookupObject<T>(objectId, openErased)
      this.openedObjects.set(objectId, obj)

      if (mode === AcDbOpenMode.kForWrite) {
        // Deep snapshot for rollback
        this.originalStates.set(obj.objectId, structuredClone(obj))
      }
      return obj
    }
    return undefined
  }

  /**
   * Commits this transaction.
   * After commit, rollback data is discarded.
   */
  commit(): void {
    this.originalStates.clear()
    this.openedObjects.clear()
  }

  /**
   * Aborts this transaction and restores all modified objects.
   */
  abort(): void {
    for (const [id, snapshot] of this.originalStates) {
      const obj = this.openedObjects.get(id)
      if (obj) {
        Object.assign(obj, snapshot)
      }
    }

    this.originalStates.clear()
    this.openedObjects.clear()
  }

  /**
   * Internal object lookup hook.
   *
   * You should connect this to your database or object table.
   */
  protected lookupObject<T extends AcDbObject>(
    objectId: AcDbObjectId,
    _openErased: boolean
  ): T {
    throw new Error(`lookupObject(${objectId}) not implemented`)
  }
}
