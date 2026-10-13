import { AcDbBlockTableRecord, AcDbDatabase } from '@mlightcad/data-model'

/**
 * Resolves the block table record id of the active paper-space layout.
 *
 * AutoCAD keeps the active sheet on the `*Paper_Space` block (other sheets are
 * `*Paper_SpaceN`). When that block is missing, fall back to a layout marked
 * `tabSelected`, then to any paper-space layout.
 *
 * @param database - Drawing whose layouts have already been read.
 * @returns Paper-space BTR id, or `undefined` when the drawing has none.
 */
export function resolveActivePaperSpaceBtrId(
  database: AcDbDatabase
): string | undefined {
  const blockTable = database.tables.blockTable
  const activePaper = blockTable.getAt(
    AcDbBlockTableRecord.PAPER_SPACE_NAME_PREFIX
  )
  if (activePaper) {
    return activePaper.objectId
  }

  const layoutTable = database.objects?.layout
  if (!layoutTable?.newIterator) {
    return undefined
  }

  const modelSpaceId = blockTable.modelSpace.objectId
  let fallback: string | undefined
  for (const layout of layoutTable.newIterator()) {
    const btrId = layout.blockTableRecordId
    if (!btrId || btrId === modelSpaceId) continue
    const btr = blockTable.getIdAt(btrId)
    if (!btr || !AcDbBlockTableRecord.isPaperSapceName(btr.name)) continue
    if (layout.tabSelected) return btrId
    if (!fallback) fallback = btrId
  }
  return fallback
}

/**
 * Aligns {@link AcDbDatabase.currentSpaceId} with `$TILEMODE` after a file read.
 *
 * The DXF/DWG header reader sets {@link AcDbDatabase.tilemode}, but
 * `currentSpaceId` still defaults to model space. Drawings saved in paper
 * space (`$TILEMODE = 0`) therefore opened on Model until the user switched
 * tabs — so the sheet looked like the model, and convert prioritized the
 * wrong layout.
 *
 * @param database - Database that has finished reading header and layouts.
 */
export function syncCurrentSpaceFromTileMode(database: AcDbDatabase): void {
  const modelSpaceId = database.tables.blockTable.modelSpace.objectId
  if (database.tilemode) {
    if (database.currentSpaceId !== modelSpaceId) {
      database.currentSpaceId = modelSpaceId
    }
    return
  }

  const paperBtrId = resolveActivePaperSpaceBtrId(database)
  if (paperBtrId && paperBtrId !== database.currentSpaceId) {
    database.currentSpaceId = paperBtrId
  }
}
