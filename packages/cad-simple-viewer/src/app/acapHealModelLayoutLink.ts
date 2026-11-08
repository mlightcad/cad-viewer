import { AcDbDatabase, AcDbObjectId } from '@mlightcad/data-model'

/**
 * Relinks the `Model` layout to the live `*Model_Space` BTR when they diverge.
 *
 * Some DWG converters match LAYOUT → BTR via stale `layoutId` / handle slots.
 * The Model layout can end up pointing at a handle that is no longer the
 * model-space block table record, while entities (and `currentSpaceId`) use
 * the real `*Model_Space` id. The viewer then activates that id with no
 * matching `AcTrLayoutView`, so zoom/pick crash and the canvas stays blank.
 *
 * @param database - Drawing whose layouts have already been read.
 * @returns The healed model-space object id (`blockTable.modelSpace`).
 */
export function acapHealModelLayoutLink(database: AcDbDatabase): AcDbObjectId {
  const modelSpace = database.tables.blockTable.modelSpace
  const modelLayout = database.objects.layout.getAt('Model')
  if (!modelLayout) {
    return modelSpace.objectId
  }

  if (modelLayout.blockTableRecordId !== modelSpace.objectId) {
    modelLayout.blockTableRecordId = modelSpace.objectId
  }
  if (modelSpace.layoutId !== modelLayout.objectId) {
    modelSpace.layoutId = modelLayout.objectId
  }

  return modelSpace.objectId
}
