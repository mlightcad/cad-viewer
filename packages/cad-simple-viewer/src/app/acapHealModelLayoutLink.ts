import {
  AcDbBlockTableRecord,
  AcDbDatabase,
  AcDbObjectId
} from '@mlightcad/data-model'

/**
 * Relinks the `Model` layout to the live `*Model_Space` BTR when they diverge.
 *
 * Some DWG converters match LAYOUT → BTR via stale `layoutId` / handle slots.
 * The Model layout can end up pointing at a handle that is no longer the
 * model-space block table record, while entities (and `currentSpaceId`) use
 * the real `*Model_Space` id. The viewer then activates that id with no
 * matching `AcTrLayoutView`, so zoom/pick crash and the canvas stays blank.
 *
 * Also heals paper-space layouts whose `blockTableRecordId` is missing (common
 * on R14 and other files where LibreDWG leaves `BLOCK_RECORD.layout` empty
 * while `LAYOUT.paperSpaceTableId` was ignored). Without this, Layout tabs are
 * skipped and `$TILEMODE = 0` opens an empty paper BTR that never loads.
 *
 * @param database - Drawing whose layouts have already been read.
 * @returns The healed model-space object id (`blockTable.modelSpace`).
 */
export function acapHealModelLayoutLink(database: AcDbDatabase): AcDbObjectId {
  const modelSpace = database.tables.blockTable.modelSpace
  // Empty / partially mocked DBs (e.g. DocManager construction) may lack the
  // layout dictionary; treat that like a missing Model layout.
  const modelLayout = database.objects?.layout?.getAt('Model')
  if (!modelLayout) {
    return modelSpace.objectId
  }

  if (modelLayout.blockTableRecordId !== modelSpace.objectId) {
    modelLayout.blockTableRecordId = modelSpace.objectId
  }
  if (modelSpace.layoutId !== modelLayout.objectId) {
    modelSpace.layoutId = modelLayout.objectId
  }

  acapHealPaperLayoutLinks(database)

  return modelSpace.objectId
}

/**
 * True when `layoutId` still names a live layout (not a reminted-away handle
 * that an entity later claimed).
 */
function acapLayoutIdIsLive(
  database: AcDbDatabase,
  layoutId: string | undefined | null
): boolean {
  if (!layoutId) return false
  const layoutTable = database.objects?.layout
  if (!layoutTable?.getIdAt) {
    // Mocked DBs in unit tests may only expose newIterator / getAt.
    if (!layoutTable?.newIterator) return false
    for (const layout of layoutTable.newIterator()) {
      if (String(layout.objectId) === String(layoutId)) return true
    }
    return false
  }
  return layoutTable.getIdAt(layoutId) != null
}

/**
 * True when a paper BTR's `layoutId` blocks reclaiming it for `layout`.
 * Stale ids (entities / missing objects) do not count as claimed.
 */
function acapPaperBtrIsClaimedByOtherLayout(
  database: AcDbDatabase,
  btr: { layoutId?: string | null; objectId: string },
  layout: { objectId: string },
  claimedBtrIds: Set<AcDbObjectId>
): boolean {
  if (claimedBtrIds.has(btr.objectId)) return true
  if (!btr.layoutId) return false
  if (String(btr.layoutId) === String(layout.objectId)) return false
  return acapLayoutIdIsLive(database, btr.layoutId)
}

/**
 * Links paper-space layouts that have no (or an invalid) BTR id to unbound
 * `*Paper_Space*` block table records.
 *
 * Mirrors the DXF reader's `linkLayoutsToBlockTableRecords` fallback when
 * `BLOCK_RECORD.layout` / layoutId matching failed during DWG convert.
 *
 * @param database - Drawing whose layouts have already been read.
 */
export function acapHealPaperLayoutLinks(database: AcDbDatabase): void {
  const blockTable = database.tables?.blockTable
  const layoutTable = database.objects?.layout
  if (!blockTable?.newIterator || !layoutTable?.newIterator) {
    return
  }

  const modelSpaceId = blockTable.modelSpace.objectId
  const claimedBtrIds = new Set<AcDbObjectId>([modelSpaceId])

  for (const layout of layoutTable.newIterator()) {
    if (layout.layoutName === 'Model') continue
    const btrId = layout.blockTableRecordId
    if (!btrId) continue
    const btr = blockTable.getIdAt(btrId)
    // Only paper BTRs count as claimed owners — a layout that wrongly points
    // at *Model_Space must still be relinked in the second pass.
    if (!btr?.isPaperSapce) continue
    claimedBtrIds.add(btrId)
    if (!btr.layoutId || !acapLayoutIdIsLive(database, btr.layoutId)) {
      btr.layoutId = layout.objectId
    }
  }

  for (const layout of layoutTable.newIterator()) {
    if (layout.layoutName === 'Model') continue
    const existingId = layout.blockTableRecordId
    const existing = existingId ? blockTable.getIdAt(existingId) : undefined
    // Keep only links that already resolve to a paper-space BTR.
    if (existing?.isPaperSapce) {
      continue
    }

    let linked = false
    // Prefer the canonical active sheet name first (`*Paper_Space`).
    const primaryPaper = blockTable.getAt(
      AcDbBlockTableRecord.PAPER_SPACE_NAME_PREFIX
    )
    if (
      primaryPaper &&
      !acapPaperBtrIsClaimedByOtherLayout(
        database,
        primaryPaper,
        layout,
        claimedBtrIds
      )
    ) {
      layout.blockTableRecordId = primaryPaper.objectId
      primaryPaper.layoutId = layout.objectId
      claimedBtrIds.add(primaryPaper.objectId)
      linked = true
    }

    if (linked) continue

    for (const btr of blockTable.newIterator()) {
      if (!btr.isPaperSapce) continue
      if (
        acapPaperBtrIsClaimedByOtherLayout(database, btr, layout, claimedBtrIds)
      ) {
        continue
      }
      layout.blockTableRecordId = btr.objectId
      btr.layoutId = layout.objectId
      claimedBtrIds.add(btr.objectId)
      break
    }
  }
}
