import { AcDbGroup, AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptEntityOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  acapExplodeAllGroups,
  acapExplodeGroup,
  acapFindGroupsContaining,
  acapFindGroupsContainingAny,
  acapGetGroupByName
} from '../../service/AcApGroup'

/**
 * UNGROUP — remove group definition(s); entities remain in the drawing.
 *
 * Matches AutoCAD noun-verb: with a group already selected, Ungroup /
 * `UNGROUP` explodes that group immediately (see Autodesk “To Ungroup
 * Objects”: select a group, then Home → Groups → Ungroup).
 */
export class AcApUngroupCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database
    const selectionSet = context.view.selectionSet
    const preselectedIds = [...selectionSet.ids]

    // AutoCAD: select group first, then UNGROUP — no further pick.
    if (preselectedIds.length > 0) {
      const groups = acapFindGroupsContainingAny(db, preselectedIds)
      if (groups.length === 0) {
        editor.showMessage(AcApI18n.t('jig.ungroup.notInGroup'), 'warning')
        return
      }
      await this.explodeGroups(context, groups, preselectedIds[0])
      selectionSet.clear()
      return
    }

    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.ungroup.selectOrOption')
    )
    prompt.keywords.add(
      AcApI18n.t('jig.ungroup.keywords.name.display'),
      AcApI18n.t('jig.ungroup.keywords.name.global'),
      AcApI18n.t('jig.ungroup.keywords.name.local')
    )
    prompt.keywords.add(
      AcApI18n.t('jig.ungroup.keywords.all.display'),
      AcApI18n.t('jig.ungroup.keywords.all.global'),
      AcApI18n.t('jig.ungroup.keywords.all.local')
    )
    prompt.allowNone = true

    const result = await editor.getKeywords(prompt)
    if (result.status === AcEdPromptStatus.Cancel) return

    if (
      (result.status === AcEdPromptStatus.OK ||
        result.status === AcEdPromptStatus.Keyword) &&
      result.stringResult === 'All'
    ) {
      const count = acapExplodeAllGroups(db)
      editor.showMessage(
        AcApI18n.t('jig.ungroup.explodedCount').replace(
          '{count}',
          String(count)
        ),
        'info'
      )
      return
    }

    if (
      (result.status === AcEdPromptStatus.OK ||
        result.status === AcEdPromptStatus.Keyword) &&
      result.stringResult === 'Name'
    ) {
      const namePrompt = new AcEdPromptStringOptions(
        AcApI18n.t('jig.ungroup.enterName')
      )
      const nameResult = await editor.getString(namePrompt)
      if (
        nameResult.status !== AcEdPromptStatus.OK ||
        !nameResult.stringResult
      ) {
        return
      }
      const group = acapGetGroupByName(db, nameResult.stringResult)
      if (!group) {
        editor.showMessage(AcApI18n.t('jig.ungroup.notFound'), 'warning')
        return
      }
      this.explodeOne(context, group)
      return
    }

    const entityPrompt = new AcEdPromptEntityOptions(
      AcApI18n.t('jig.ungroup.selectGroup')
    )
    const picked = await editor.getEntity(entityPrompt)
    if (picked.status !== AcEdPromptStatus.OK || !picked.objectId) return

    const groups = acapFindGroupsContaining(db, picked.objectId)
    if (groups.length === 0) {
      editor.showMessage(AcApI18n.t('jig.ungroup.notInGroup'), 'warning')
      return
    }

    await this.explodeGroups(context, groups, picked.objectId)
  }

  private explodeOne(context: AcApContext, group: AcDbGroup) {
    const editor = AcApDocManager.instance.editor
    acapExplodeGroup(context.doc.database, group)
    editor.showMessage(
      AcApI18n.t('jig.ungroup.exploded').replace('{name}', group.name),
      'info'
    )
  }

  /**
   * Explodes one group, or Accept/Next when an object belongs to several.
   * Independent groups in a multi-object selection are all exploded.
   */
  private async explodeGroups(
    context: AcApContext,
    groups: AcDbGroup[],
    seedId: AcDbObjectId
  ) {
    if (groups.length === 1) {
      this.explodeOne(context, groups[0])
      return
    }

    const multiMembership = groups.every(g => g.has(seedId))
    if (!multiMembership) {
      for (const group of groups) {
        this.explodeOne(context, group)
      }
      return
    }

    const editor = AcApDocManager.instance.editor
    let index = 0
    while (true) {
      const group = groups[index]
      const multi = new AcEdPromptKeywordOptions(
        AcApI18n.t('jig.ungroup.multiGroup').replace('{name}', group.name)
      )
      multi.keywords.add(
        AcApI18n.t('jig.ungroup.keywords.accept.display'),
        AcApI18n.t('jig.ungroup.keywords.accept.global'),
        AcApI18n.t('jig.ungroup.keywords.accept.local')
      )
      multi.keywords.add(
        AcApI18n.t('jig.ungroup.keywords.next.display'),
        AcApI18n.t('jig.ungroup.keywords.next.global'),
        AcApI18n.t('jig.ungroup.keywords.next.local')
      )
      const multiResult = await editor.getKeywords(multi)
      if (multiResult.status === AcEdPromptStatus.Cancel) return
      if (
        (multiResult.status === AcEdPromptStatus.OK ||
          multiResult.status === AcEdPromptStatus.Keyword) &&
        multiResult.stringResult === 'Next'
      ) {
        index = (index + 1) % groups.length
        continue
      }
      this.explodeOne(context, group)
      return
    }
  }
}
