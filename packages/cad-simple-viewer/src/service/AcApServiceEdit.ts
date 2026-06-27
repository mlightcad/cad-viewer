import { AcDbDatabase } from '@mlightcad/data-model'

import { acapRunDatabaseEdit } from '../util/AcApDatabaseEdit'

/** Default undo label for layer table edits. */
export const LAYER_EDIT_LABEL = 'Layer'

/** Default undo label for entity edits outside commands. */
export const ENTITY_EDIT_LABEL = 'Entity'

/**
 * Runs a database mutation with undo support when not already inside a command transaction.
 *
 * When a command has started an undo transaction via {@link AcEdCommand.trigger},
 * the callback runs directly to avoid nested undo marks.
 *
 * @param db - Database to mutate.
 * @param label - Undo group label shown in the undo stack.
 * @param fn - Mutation callback.
 * @returns The value returned by `fn`.
 */
export function acapRunServiceEdit<T>(
  db: AcDbDatabase,
  label: string,
  fn: () => T
): T {
  if (db.transactionManager?.hasTransaction()) {
    return fn()
  }

  if (typeof db.runDatabaseEdit !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[cad-simple-viewer] acapRunServiceEdit("${label}"): database.runDatabaseEdit is unavailable; mutation ran without undo support.`
      )
    }
    return fn()
  }

  let result!: T
  acapRunDatabaseEdit(db, label, () => {
    result = fn()
  })
  return result
}
