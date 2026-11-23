import { AcDbBlockTableRecord, AcDbObjectId } from '@mlightcad/data-model'

import type { AcApContext } from '../../app/AcApContext.js'
import { AcEdCommand } from '../../editor/command/AcEdCommand.js'
import { AcEdOpenMode } from '../../editor/view/AcEdOpenMode.js'
import { AcApI18n } from '../../i18n/index.js'
import { acapMeasureTextWidth } from '../../util/AcApTextMeasure.js'
import {
  acapBuildMergedMText,
  acapIsTextOrMText
} from './acapMergeTextEntities.js'

/**
 * Merges selected TEXT and MTEXT entities into one MTEXT entity.
 *
 * Non-text entities in the selection are ignored. Sources are erased after the
 * merged MTEXT is appended to the same block space as the first text entity.
 *
 * Imports stay on leaf modules (not `editor/index` / `service/index` /
 * `AcApFontUtil`) so registration from `AcApDocManager` does not hit a CJS
 * cycle that leaves this class or `AcEdCommand` undefined. Selection helpers
 * and display-trait copying are loaded lazily for the same reason.
 */
export class AcApTxt2MtxtCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const [{ resolveSelectedEntities }, { AcApEntityService }] =
      await Promise.all([
        import('../../service/AcApEntitySelection.js'),
        import('../../service/AcApEntityService.js')
      ])
    const resolved = await resolveSelectedEntities(context, {
      promptKey: 'txt2mtxt'
    })
    if (!resolved) return

    const texts = resolved.entities.filter(acapIsTextOrMText)
    if (texts.length < 2) {
      this.showMessage(AcApI18n.t('jig.txt2mtxt.needTwo'), 'warning')
      return
    }

    const mtext = acapBuildMergedMText(texts, {
      measure: (text, height, fontPrimary, fontBig) =>
        acapMeasureTextWidth(text, fontPrimary, height, { bigFont: fontBig })
    })
    if (!mtext) {
      this.showMessage(AcApI18n.t('jig.txt2mtxt.mergeFailed'), 'warning')
      return
    }

    AcApEntityService.copyDisplayTraits(texts[0], mtext)

    const space = resolveOwnerSpace(context, texts[0].ownerId)
    space.appendEntity(mtext)

    const eraseIds = texts
      .map(entity => entity.objectId)
      .filter((id): id is AcDbObjectId => !!id)
    const erased = context.doc.entityService.eraseEntities(eraseIds)
    if (erased !== eraseIds.length) {
      // Abort the command undo transaction so the append + any partial erase
      // do not commit as a half-applied combine.
      this.showMessage(AcApI18n.t('jig.txt2mtxt.eraseFailed'), 'warning')
      throw new Error('TXT2MTXT: failed to erase all source text entities')
    }

    context.view.selectionSet.clear()
  }
}

/**
 * Returns the block table record that owns `ownerId`, or model space when the
 * owner cannot be resolved.
 *
 * Uses {@link AcDbDatabase.getObjectById} rather than `blockTable.getIdAt`,
 * which can miss valid layout BTRs when their parent is not the BlockTable.
 */
function resolveOwnerSpace(
  context: AcApContext,
  ownerId: AcDbObjectId
): AcDbBlockTableRecord {
  const owner = context.doc.database.getObjectById(ownerId)
  if (owner instanceof AcDbBlockTableRecord) return owner
  return context.doc.database.tables.blockTable.modelSpace
}
