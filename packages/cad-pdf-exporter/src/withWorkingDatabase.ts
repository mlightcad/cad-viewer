import {
  type AcDbDatabase,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

/**
 * Runs `fn` with `database` as the host working database, then restores the
 * previous one.
 *
 * The public getter throws when nothing has been set yet, which is the normal
 * headless case, so the previous value is taken from the backing field.
 */
export async function withWorkingDatabase<T>(
  database: AcDbDatabase,
  fn: () => Promise<T>
): Promise<T> {
  const host = acdbHostApplicationServices() as unknown as {
    workingDatabase: AcDbDatabase
    _workingDatabase: AcDbDatabase | null
  }
  const previous = host._workingDatabase
  host.workingDatabase = database
  try {
    return await fn()
  } finally {
    host._workingDatabase = previous
  }
}
