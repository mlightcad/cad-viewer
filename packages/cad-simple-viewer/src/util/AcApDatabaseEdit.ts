import { AcDbDatabase } from '@mlightcad/data-model'

import { eventBus } from '../editor/global/eventBus'

/**
 * Notifies UI listeners that undo/redo availability may have changed.
 */
export function acapNotifyUndoStackChanged(): void {
  eventBus.emit('undo-stack-changed', {})
}

/**
 * Application-layer shortcut for {@link AcDbDatabase.runDatabaseEdit} that also
 * notifies UI listeners when a new undo mark is created.
 */
export function acapRunDatabaseEdit(
  db: AcDbDatabase,
  label: string,
  fn: () => void
): void {
  const wasRecording = db.isUndoRecording()
  db.runDatabaseEdit(label, fn)
  if (!wasRecording) {
    acapNotifyUndoStackChanged()
  }
}
