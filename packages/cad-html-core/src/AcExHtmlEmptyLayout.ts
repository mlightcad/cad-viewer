import { type AcDbDatabase, AcDbViewport } from '@mlightcad/data-model'
import { AcTrViewportView } from '@mlightcad/three-renderer'

/**
 * True when a paper-space block has no content other than AutoCAD's default
 * `*Paper_Space` viewport. Model space is never treated as empty.
 *
 * Used to skip blank paper tabs when {@link AcExHtmlBuildSnapshotOptions.exportEmptyLayouts}
 * is `false`.
 *
 * @param database - Open drawing database.
 * @param blockTableRecordId - Layout block-table-record id.
 * @param modelSpaceBtrId - Model-space block id (always kept).
 */
export function acexHtmlIsEmptyPaperSpaceLayout(
  database: AcDbDatabase,
  blockTableRecordId: string,
  modelSpaceBtrId: string
): boolean {
  if (blockTableRecordId === modelSpaceBtrId) {
    return false
  }
  const block = database.tables.blockTable.getIdAt(blockTableRecordId)
  if (!block?.newIterator) {
    return true
  }
  for (const entity of block.newIterator()) {
    if (entity instanceof AcDbViewport) {
      if (AcTrViewportView.isDefaultPaperSpaceViewport(entity)) {
        continue
      }
      return false
    }
    return false
  }
  return true
}
