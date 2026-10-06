import type { AcApDataSourceMenuItem } from './acapBuildDataSourceMenu'
import type { AcApDataSource, AcApDataSourceFile } from './AcApDataSource'

/**
 * Runs a menu action against an already-resolved {@link AcApDataSource}.
 *
 * Prefer this on landing pages that own a {@link AcApDataSourceManager} before
 * {@link AcApDocManager} exists. For in-viewer Open menus, use
 * {@link acapRunDataSourceMenuAction} which also opens the returned file.
 *
 * Never chains sign-in into pick.
 *
 * @param source - Data source that owns {@link AcApDataSourceMenuItem.sourceId}
 * @param item - Menu item from {@link acapBuildDataSourceMenu}
 * @returns Picked file for `pick`; `undefined` for sign-in / sign-out
 */
export async function acapInvokeDataSourceMenuAction(
  source: AcApDataSource,
  item: AcApDataSourceMenuItem
): Promise<AcApDataSourceFile | null | undefined> {
  if (source.id !== item.sourceId) {
    return undefined
  }

  if (item.action === 'sign-in') {
    await source.signIn()
    return undefined
  }

  if (item.action === 'sign-out') {
    await source.signOut()
    return undefined
  }

  return source.pick()
}
