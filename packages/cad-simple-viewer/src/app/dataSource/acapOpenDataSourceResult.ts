import { eventBus } from '../../editor/global/eventBus.js'
import { AcEdOpenMode } from '../../editor/view/AcEdOpenMode.js'
import type { AcApOpenDatabaseOptions } from '../AcApOpenDatabaseOptions.js'
import type { AcApDataSourceFile } from './AcApDataSource.js'

/**
 * Opens a file obtained from a data source via {@link AcApDocManager}.
 *
 * Uses `openUrl` when {@link AcApDataSourceFile.url} is set; otherwise
 * `openDocument` with {@link AcApDataSourceFile.content}.
 *
 * @param file - Result from {@link AcApDataSource.pick}
 * @param options - Optional open options (defaults come from DocManager)
 */
export async function acapOpenDataSourceResult(
  file: AcApDataSourceFile,
  options?: AcApOpenDatabaseOptions
): Promise<void> {
  const { AcApDocManager } = await import('../AcApDocManager.js')
  const dm = AcApDocManager.instance
  const openOptions: AcApOpenDatabaseOptions =
    options ?? (await dm.resolveOpenDocumentDefaults())

  eventBus.emit('open-local-file-started', {
    mode: openOptions.mode ?? AcEdOpenMode.Read
  })

  if (file.url) {
    await dm.openUrl(file.url, openOptions)
    return
  }

  if (!file.content) {
    const { log } = await import('@mlightcad/data-model')
    log.error('Data source file has neither content nor url:', file.name)
    return
  }

  await dm.openDocument(file.name, file.content, openOptions)
}
