import {
  AcDbAttributeDefinition,
  type AcDbDatabase,
  log
} from '@mlightcad/data-model'

/**
 * Hides attribute definitions (ATTDEF) stored inside named block definitions
 * so they are no longer drawn when the block is expanded by an INSERT.
 *
 * AutoCAD display semantics only show the ATTRIB values attached to each
 * INSERT; the ATTDEF entities inside the block definition are templates that
 * are never drawn outside the block editor. SolidWorks DXF exports write the
 * actual field values into the ATTDEF default text, and the data-model
 * renderer draws that default text when expanding the block — producing a
 * duplicate "ghost" copy of title-block values (名称/材料/图号 etc.) offset a
 * few millimeters from the ATTRIB values.
 *
 * Loose ATTDEFs living directly in model/paper space are left untouched so the
 * upstream tag-placeholder rendering behavior is preserved.
 *
 * Emits one console log when anything was hidden so integrators can confirm
 * the normalization actually ran (guards against stale dev-server caches).
 *
 * @param database - The drawing database to normalize.
 * @returns The number of ATTDEF entities hidden.
 */
export function suppressAttdefsInBlockDefinitions(
  database: AcDbDatabase
): number {
  let hidden = 0
  for (const record of database.tables.blockTable.newIterator()) {
    if (record.isModelSapce || record.isPaperSapce) {
      continue
    }
    for (const entity of record.newIterator()) {
      if (entity.dxfTypeName !== 'ATTDEF') {
        continue
      }
      const attdef = entity as AcDbAttributeDefinition
      if (!attdef.isInvisible) {
        attdef.isInvisible = true
        hidden++
      }
    }
  }
  if (hidden > 0) {
    log.info(
      `[AcApDocument] Suppressed ${hidden} ATTDEF(s) in block definitions ` +
        '(they duplicated INSERT attribute values during block expansion)'
    )
  }
  return hidden
}
