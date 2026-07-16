import {
  AcDbDatabase,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

/**
 * Runs work against a secondary (non-document) database while temporarily
 * making it the host application working database.
 *
 * Detached object construction historically fell back to
 * `workingDatabase.generateHandle()`. When the host document is recording an
 * undo transaction (e.g. during XATTACH), that minted non-TEMP handles owned by
 * the host and caused `assertOpenForWrite` failures while converting the
 * secondary file. Switching workingDatabase for the duration of the secondary
 * read keeps symbol-table import mutations against the correct database.
 *
 * Always restores the previous working database, even when `fn` throws.
 */
export async function acapWithSecondaryDatabase<T>(
  secondaryDb: AcDbDatabase,
  fn: () => Promise<T> | T
): Promise<T> {
  const services = acdbHostApplicationServices() as unknown as {
    workingDatabase: AcDbDatabase
    _workingDatabase: AcDbDatabase | null
  }
  const previous = services._workingDatabase
  services.workingDatabase = secondaryDb
  try {
    return await fn()
  } finally {
    services._workingDatabase = previous
  }
}
