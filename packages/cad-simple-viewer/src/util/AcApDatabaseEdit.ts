import {
  AcDbDatabase,
  AcDbEntity,
  AcDbObject,
  AcDbObjectId,
  AcDbOpenMode
} from '@mlightcad/data-model'

import { eventBus } from '../editor/global/eventBus'

/**
 * Notifies UI listeners that undo/redo availability may have changed.
 */
export function acapNotifyUndoStackChanged(): void {
  eventBus.emit('undo-stack-changed', {})
}

/**
 * Returns true when the database transaction manager is actively recording changes.
 */
export function acapIsUndoRecording(db: AcDbDatabase): boolean {
  return db.transactionManager.isRecording()
}

function acapOpenObject<T extends AcDbObject>(
  db: AcDbDatabase,
  objectId: string,
  mode: AcDbOpenMode
): T | undefined {
  const tr = db.transactionManager.currentTransaction()
  if (tr) {
    const opened = tr.getObject<T>(objectId, mode)
    if (opened) {
      return opened
    }
  }
  return db.getObjectById(objectId) as T | undefined
}

/**
 * Opens a database object for read through the active transaction when present.
 */
export function acapOpenObjectForRead<T extends AcDbObject>(
  db: AcDbDatabase,
  objectId: string
): T | undefined {
  return acapOpenObject<T>(db, objectId, AcDbOpenMode.kForRead)
}

/**
 * Opens a database object for write through the active transaction when present.
 */
export function acapOpenObjectForWrite<T extends AcDbObject>(
  db: AcDbDatabase,
  objectId: string
): T | undefined {
  return acapOpenObject<T>(db, objectId, AcDbOpenMode.kForWrite)
}

/**
 * Opens an entity for read through the active transaction when present.
 */
export function acapOpenEntityForRead(
  db: AcDbDatabase,
  entityOrId: string | AcDbEntity
): AcDbEntity | undefined {
  const objectId =
    typeof entityOrId === 'string' ? entityOrId : entityOrId.objectId
  return acapOpenObjectForRead<AcDbEntity>(db, objectId)
}

/**
 * Opens an entity for write through the active transaction when present.
 */
export function acapOpenEntityForWrite(
  db: AcDbDatabase,
  entityOrId: string | AcDbEntity
): AcDbEntity | undefined {
  const objectId =
    typeof entityOrId === 'string' ? entityOrId : entityOrId.objectId
  return acapOpenObjectForWrite<AcDbEntity>(db, objectId)
}

/**
 * Erases entities through the active transaction when present.
 */
export function acapEraseEntities(
  db: AcDbDatabase,
  objectIds: AcDbObjectId[]
): void {
  objectIds.forEach(objectId => {
    const entity = acapOpenEntityForWrite(db, objectId)
    entity?.erase()
  })
}

/**
 * Runs a database mutation as one undoable operation.
 */
export function acapRunDatabaseEdit(
  db: AcDbDatabase,
  label: string,
  fn: () => void
): void {
  if (acapIsUndoRecording(db)) {
    fn()
    return
  }

  db.transactionManager.runUndoable(label, () => {
    fn()
  })
  acapNotifyUndoStackChanged()
}
