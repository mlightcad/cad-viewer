import type { AcDbDatabase } from '@mlightcad/data-model'

import type { CadSession } from './CadSession'

/**
 * Runs `fn` as one undoable edit through the session.
 *
 * Uses {@link CadSession.runEdit} when the host provides it, otherwise
 * `database.runDatabaseEdit`.
 *
 * @param session - Session that may override edit handling.
 * @param database - Database being edited.
 * @param label - Undo label.
 * @param fn - Mutation callback.
 * @returns The value returned by `fn`.
 */
export function runSessionEdit<T>(
  session: CadSession,
  database: AcDbDatabase,
  label: string,
  fn: () => T
): T {
  let result!: T
  const body = () => {
    result = fn()
  }
  if (session.runEdit) {
    session.runEdit(database, label, body)
  } else {
    database.runDatabaseEdit(label, body)
  }
  return result
}
