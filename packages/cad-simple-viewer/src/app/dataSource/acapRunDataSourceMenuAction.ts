import { AcApDocManager } from '../AcApDocManager'
import type { AcApOpenDatabaseOptions } from '../AcApOpenDatabaseOptions'
import type { AcApDataSourceMenuItem } from './acapBuildDataSourceMenu'
import type { AcApDataSourceManager } from './AcApDataSourceManager'
import { acapInvokeDataSourceMenuAction } from './acapInvokeDataSourceMenuAction'
import { acapOpenDataSourceResult } from './acapOpenDataSourceResult'

/**
 * Runs the action associated with a data-source menu item and opens pick results.
 *
 * Never chains sign-in into pick — that would open a second popup after an
 * `await` and get blocked by the browser.
 *
 * @param item - Menu item from {@link acapBuildDataSourceMenu}
 * @param options - Optional open options for pick results
 * @param manager - Optional registry (defaults to DocManager's dataSourceManager)
 */
export async function acapRunDataSourceMenuAction(
  item: AcApDataSourceMenuItem,
  options?: AcApOpenDatabaseOptions,
  manager?: AcApDataSourceManager
): Promise<void> {
  const dsm =
    manager ?? AcApDocManager.tryGetInstance()?.dataSourceManager
  const source = dsm?.get(item.sourceId)
  if (!source) return

  const file = await acapInvokeDataSourceMenuAction(source, item)
  if (item.action !== 'pick' || !file) return
  await acapOpenDataSourceResult(file, options)
}
