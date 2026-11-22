import { AcDbBlockTableRecord, AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app/index.js'
import { AcEdCommand, AcEdOpenMode } from '../../editor/index.js'
import { AcApI18n } from '../../i18n/index.js'
import {
  AcApEntityService,
  resolveSelectedEntities
} from '../../service/index.js'
import { AcApFontUtil } from '../../util/AcApFontUtil.js'
import {
  acapBuildMergedMText,
  acapIsTextOrMText
} from './acapMergeTextEntities.js'

/**
 * Merges selected TEXT and MTEXT entities into one MTEXT entity.
 *
 * Non-text entities in the selection are ignored. Sources are erased after the
 * merged MTEXT is appended to the same block space as the first text entity.
 */
export class AcApTxt2MtxtCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const resolved = await resolveSelectedEntities(context, {
      promptKey: 'txt2mtxt'
    })
    if (!resolved) return

    const texts = resolved.entities.filter(acapIsTextOrMText)
    if (texts.length < 2) {
      AcApDocManager.instance.editor.showMessage(
        AcApI18n.t('jig.txt2mtxt.needTwo'),
        'warning'
      )
      return
    }

    const mtext = acapBuildMergedMText(texts, {
      measure: (text, height, fontPrimary, fontBig) =>
        AcApFontUtil.measureTextWidth(text, fontPrimary, height, fontBig)
    })
    if (!mtext) {
      AcApDocManager.instance.editor.showMessage(
        AcApI18n.t('jig.txt2mtxt.mergeFailed'),
        'warning'
      )
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
      AcApDocManager.instance.editor.showMessage(
        AcApI18n.t('jig.txt2mtxt.eraseFailed'),
        'warning'
      )
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
