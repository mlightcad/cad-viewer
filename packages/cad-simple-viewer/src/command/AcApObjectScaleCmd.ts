import {
  acdbAddAnnotationScaleToObject,
  acdbGetAnnotationScaleContexts,
  acdbListAnnotationScales,
  acdbRemoveAnnotationScaleFromObject,
  type AcDbEntity
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptKeywordOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../editor'
import { AcApI18n } from '../i18n'
import { resolveSelectedIds } from '../service'

/**
 * Adds or removes annotation scales on selected annotative objects
 * (`OBJECTSCALE`).
 */
export class AcApObjectScaleCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const ids = await resolveSelectedIds(context, 'objectscale')
    if (!ids?.length) return

    const db = context.doc.database
    const entities: AcDbEntity[] = []
    for (const id of ids) {
      const entity = db.tables.blockTable.getEntityById(id)
      if (entity) entities.push(entity)
    }
    if (entities.length === 0) return

    const actionPrompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.objectscale.action')
    )
    const addKey = actionPrompt.keywords.add(
      AcApI18n.t('jig.objectscale.keywords.add.display'),
      AcApI18n.t('jig.objectscale.keywords.add.global'),
      AcApI18n.t('jig.objectscale.keywords.add.local')
    )
    const deleteKey = actionPrompt.keywords.add(
      AcApI18n.t('jig.objectscale.keywords.delete.display'),
      AcApI18n.t('jig.objectscale.keywords.delete.global'),
      AcApI18n.t('jig.objectscale.keywords.delete.local')
    )
    const listKey = actionPrompt.keywords.add(
      AcApI18n.t('jig.objectscale.keywords.list.display'),
      AcApI18n.t('jig.objectscale.keywords.list.global'),
      AcApI18n.t('jig.objectscale.keywords.list.local')
    )
    actionPrompt.keywords.default = addKey

    const actionResult =
      await AcApDocManager.instance.editor.getKeywords(actionPrompt)
    if (actionResult.status !== AcEdPromptStatus.OK) return

    const keyword = actionResult.stringResult
    if (keyword === listKey.globalName) {
      this.listScales(entities)
      return
    }

    const scales = acdbListAnnotationScales(db)
    const scaleNames = scales.map(s => s.scaleName).filter(Boolean)
    const scalePrompt = new AcEdPromptStringOptions(
      `${AcApI18n.t('jig.objectscale.scaleName')} [${scaleNames.join(', ')}]`
    )
    if (db.cannoscale) {
      scalePrompt.defaultValue = db.cannoscale
      scalePrompt.useDefaultValue = true
    }
    const scaleResult =
      await AcApDocManager.instance.editor.getString(scalePrompt)
    if (scaleResult.status !== AcEdPromptStatus.OK || !scaleResult.stringResult) {
      return
    }
    const scaleName = scaleResult.stringResult.trim()
    if (!scaleName) return

    let changed = 0
    for (const entity of entities) {
      if (keyword === deleteKey.globalName) {
        if (acdbRemoveAnnotationScaleFromObject(entity, scaleName)) changed++
      } else if (keyword === addKey.globalName) {
        if (acdbAddAnnotationScaleToObject(entity, scaleName)) changed++
      }
    }

    AcApDocManager.instance.editor.showMessage(
      `${AcApI18n.t('jig.objectscale.done')}: ${changed}`
    )
    if (changed > 0) {
      AcApDocManager.instance.regen()
    }
  }

  private listScales(entities: AcDbEntity[]) {
    for (const entity of entities) {
      const contexts = acdbGetAnnotationScaleContexts(entity)
      const names =
        contexts.length > 0
          ? contexts.map(c => c.scale.scaleName).join(', ')
          : AcApI18n.t('jig.objectscale.none')
      AcApDocManager.instance.editor.showMessage(
        `${entity.type} (${entity.objectId}): ${names}`
      )
    }
  }
}
