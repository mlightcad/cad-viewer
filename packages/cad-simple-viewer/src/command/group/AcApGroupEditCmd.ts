import { AcDbGroup, AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptEntityOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  acapFindGroupsContaining,
  acapGetGroupByName,
  acapValidateGroupName
} from '../../service/AcApGroup'

/**
 * GROUPEDIT — add/remove objects or rename a group.
 */
export class AcApGroupEditCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const db = context.doc.database

    const pickPrompt = new AcEdPromptEntityOptions(
      AcApI18n.t('jig.groupedit.selectGroup')
    )
    const picked = await editor.getEntity(pickPrompt)
    if (picked.status === AcEdPromptStatus.Cancel) return

    let group: AcDbGroup | undefined
    if (picked.status === AcEdPromptStatus.OK && picked.objectId) {
      const groups = acapFindGroupsContaining(db, picked.objectId)
      if (groups.length === 0) {
        // Fall through to name prompt when the pick misses a group member.
      } else if (groups.length === 1) {
        group = groups[0]
      } else {
        group = await this.resolveMultiGroup(groups, picked.objectId)
        if (!group) return
      }
    }

    if (!group) {
      // Allow typing a name when the pick misses.
      const namePrompt = new AcEdPromptStringOptions(
        AcApI18n.t('jig.groupedit.enterName')
      )
      const nameResult = await editor.getString(namePrompt)
      if (
        nameResult.status !== AcEdPromptStatus.OK ||
        !nameResult.stringResult
      ) {
        return
      }
      group = acapGetGroupByName(db, nameResult.stringResult)
    }

    if (!group) {
      editor.showMessage(AcApI18n.t('jig.groupedit.notFound'), 'warning')
      return
    }

    const actionPrompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.groupedit.action').replace('{name}', group.name)
    )
    actionPrompt.keywords.add(
      AcApI18n.t('jig.groupedit.keywords.add.display'),
      AcApI18n.t('jig.groupedit.keywords.add.global'),
      AcApI18n.t('jig.groupedit.keywords.add.local')
    )
    actionPrompt.keywords.add(
      AcApI18n.t('jig.groupedit.keywords.remove.display'),
      AcApI18n.t('jig.groupedit.keywords.remove.global'),
      AcApI18n.t('jig.groupedit.keywords.remove.local')
    )
    actionPrompt.keywords.add(
      AcApI18n.t('jig.groupedit.keywords.rename.display'),
      AcApI18n.t('jig.groupedit.keywords.rename.global'),
      AcApI18n.t('jig.groupedit.keywords.rename.local')
    )

    const action = await editor.getKeywords(actionPrompt)
    // Dedicated getKeywords resolves as OK (global name), not Keyword.
    if (
      (action.status !== AcEdPromptStatus.OK &&
        action.status !== AcEdPromptStatus.Keyword) ||
      !action.stringResult
    ) {
      return
    }

    if (action.stringResult === 'Add') {
      const sel = await editor.getSelection(
        new AcEdPromptSelectionOptions(AcApI18n.t('jig.groupedit.selectToAdd'))
      )
      if (sel.status !== AcEdPromptStatus.OK || !sel.value) return
      group.append([...sel.value.ids])
      return
    }

    if (action.stringResult === 'Remove') {
      // AutoCAD: "Select grouped objects to remove from the current group."
      // Individual members must be pickable, so suppress PICKSTYLE group
      // expansion for this prompt (same practical effect as Ctrl+Shift+A).
      context.view.selectionSet.clear()
      const removePrompt = new AcEdPromptSelectionOptions(
        AcApI18n.t('jig.groupedit.selectToRemove')
      )
      removePrompt.allowGroupSelection = false
      const sel = await editor.getSelection(removePrompt)
      if (sel.status !== AcEdPromptStatus.OK || !sel.value) return
      const memberIds = [...sel.value.ids].filter(id => group.has(id))
      if (memberIds.length > 0) group.remove(memberIds)
      return
    }

    if (action.stringResult === 'Rename') {
      const namePrompt = new AcEdPromptStringOptions(
        AcApI18n.t('jig.groupedit.newName')
      )
      const nameResult = await editor.getString(namePrompt)
      if (
        nameResult.status !== AcEdPromptStatus.OK ||
        !nameResult.stringResult
      ) {
        return
      }
      const validated = acapValidateGroupName(nameResult.stringResult)
      if (!validated) {
        editor.showMessage(AcApI18n.t('jig.group.invalidName'), 'warning')
        return
      }
      if (db.objects.group.getAt(validated) && validated !== group.name) {
        editor.showMessage(AcApI18n.t('jig.group.nameExists'), 'warning')
        return
      }
      group.setName(validated)
      group.anonymous = false
    }
  }

  /**
   * Accept/Next when the picked object belongs to several groups.
   */
  private async resolveMultiGroup(
    groups: AcDbGroup[],
    _seedId: AcDbObjectId
  ): Promise<AcDbGroup | undefined> {
    const editor = AcApDocManager.instance.editor
    let index = 0
    while (true) {
      const candidate = groups[index]
      const multi = new AcEdPromptKeywordOptions(
        AcApI18n.t('jig.groupedit.multiGroup').replace(
          '{name}',
          candidate.name
        )
      )
      multi.keywords.add(
        AcApI18n.t('jig.groupedit.keywords.accept.display'),
        AcApI18n.t('jig.groupedit.keywords.accept.global'),
        AcApI18n.t('jig.groupedit.keywords.accept.local')
      )
      multi.keywords.add(
        AcApI18n.t('jig.groupedit.keywords.next.display'),
        AcApI18n.t('jig.groupedit.keywords.next.global'),
        AcApI18n.t('jig.groupedit.keywords.next.local')
      )
      const multiResult = await editor.getKeywords(multi)
      if (multiResult.status === AcEdPromptStatus.Cancel) return undefined
      if (
        (multiResult.status === AcEdPromptStatus.OK ||
          multiResult.status === AcEdPromptStatus.Keyword) &&
        multiResult.stringResult === 'Next'
      ) {
        index = (index + 1) % groups.length
        continue
      }
      return candidate
    }
  }
}
