import { AcDbGroup } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptIntegerOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  acapCreateGroup,
  acapExplodeGroup,
  acapGetGroupByName,
  AcApGroupCreateError,
  acapListGroups,
  acapValidateGroupName
} from '../../service/AcApGroup'

/**
 * -GROUP — command-line group manager (list/create/add/remove/explode/…).
 */
export class AcApDashGroupCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor

    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.dashgroup.option')
    )
    const addKeyword = (
      key:
        | 'list'
        | 'create'
        | 'add'
        | 'remove'
        | 'explode'
        | 'rename'
        | 'selectable'
        | 'order'
    ) => {
      prompt.keywords.add(
        AcApI18n.t(`jig.dashgroup.keywords.${key}.display`),
        AcApI18n.t(`jig.dashgroup.keywords.${key}.global`),
        AcApI18n.t(`jig.dashgroup.keywords.${key}.local`)
      )
    }
    addKeyword('list')
    addKeyword('create')
    addKeyword('add')
    addKeyword('remove')
    addKeyword('explode')
    addKeyword('rename')
    addKeyword('selectable')
    addKeyword('order')

    const result = await editor.getKeywords(prompt)
    // Dedicated getKeywords resolves as OK (global name), not Keyword.
    if (
      (result.status !== AcEdPromptStatus.OK &&
        result.status !== AcEdPromptStatus.Keyword) ||
      !result.stringResult
    ) {
      return
    }

    switch (result.stringResult) {
      case '?':
      case 'List':
        this.listGroups(context)
        return
      case 'Create':
        await this.createGroup(context)
        return
      case 'Add':
        await this.modifyMembers(context, 'add')
        return
      case 'Remove':
        await this.modifyMembers(context, 'remove')
        return
      case 'Explode':
        await this.explodeGroup(context)
        return
      case 'Rename':
        await this.renameGroup(context)
        return
      case 'Selectable':
        await this.toggleSelectable(context)
        return
      case 'Order':
        await this.reorderGroup(context)
        return
      default:
        return
    }
  }

  private listGroups(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const groups = acapListGroups(context.doc.database, true)
    if (groups.length === 0) {
      editor.showMessage(AcApI18n.t('jig.dashgroup.empty'), 'info')
      return
    }
    for (const group of groups) {
      const selectable = group.selectable
        ? AcApI18n.t('jig.dashgroup.yes')
        : AcApI18n.t('jig.dashgroup.no')
      editor.showMessage(
        AcApI18n.t('jig.dashgroup.listEntry')
          .replace('{name}', group.name)
          .replace('{description}', group.description || '')
          .replace('{selectable}', selectable)
          .replace('{count}', String(group.numEntities())),
        'info'
      )
    }
  }

  private async createGroup(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const namePrompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.dashgroup.enterNameOrBlank')
    )
    namePrompt.allowSpaces = true
    const nameResult = await editor.getString(namePrompt)
    if (nameResult.status === AcEdPromptStatus.Cancel) return

    let unnamed = true
    let name: string | undefined
    if (nameResult.stringResult && nameResult.stringResult.trim()) {
      const validated = acapValidateGroupName(nameResult.stringResult)
      if (!validated) {
        editor.showMessage(AcApI18n.t('jig.group.invalidName'), 'warning')
        return
      }
      if (context.doc.database.objects.group.getAt(validated)) {
        editor.showMessage(AcApI18n.t('jig.group.nameExists'), 'warning')
        return
      }
      name = validated
      unnamed = false
    }

    const sel = await editor.getSelection(
      new AcEdPromptSelectionOptions(AcApI18n.t('jig.group.selectObjects'))
    )
    if (sel.status !== AcEdPromptStatus.OK || !sel.value?.count) return

    try {
      const group = acapCreateGroup(context.doc.database, {
        name,
        unnamed,
        entityIds: [...sel.value.ids]
      })
      editor.showMessage(
        AcApI18n.t('jig.group.created').replace('{name}', group.name),
        'info'
      )
    } catch (error) {
      if (error instanceof AcApGroupCreateError) {
        editor.showMessage(
          AcApI18n.t(
            error.code === 'nameExists'
              ? 'jig.group.nameExists'
              : 'jig.group.invalidName'
          ),
          'warning'
        )
        return
      }
      editor.showMessage(
        error instanceof Error ? error.message : String(error),
        'error'
      )
    }
  }

  private async promptGroup(context: AcApContext): Promise<AcDbGroup | null> {
    const editor = AcApDocManager.instance.editor
    const namePrompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.dashgroup.enterGroupName')
    )
    const nameResult = await editor.getString(namePrompt)
    if (
      nameResult.status !== AcEdPromptStatus.OK ||
      !nameResult.stringResult
    ) {
      return null
    }
    const group = acapGetGroupByName(
      context.doc.database,
      nameResult.stringResult
    )
    if (!group) {
      editor.showMessage(AcApI18n.t('jig.groupedit.notFound'), 'warning')
      return null
    }
    return group
  }

  private async modifyMembers(
    context: AcApContext,
    mode: 'add' | 'remove'
  ) {
    const editor = AcApDocManager.instance.editor
    const group = await this.promptGroup(context)
    if (!group) return
    const selPrompt = new AcEdPromptSelectionOptions(
      mode === 'add'
        ? AcApI18n.t('jig.groupedit.selectToAdd')
        : AcApI18n.t('jig.groupedit.selectToRemove')
    )
    if (mode === 'remove') {
      // Match GROUPEDIT Remove: pick individual members, not whole groups.
      context.view.selectionSet.clear()
      selPrompt.allowGroupSelection = false
    }
    const sel = await editor.getSelection(selPrompt)
    if (sel.status !== AcEdPromptStatus.OK || !sel.value) return
    if (mode === 'add') {
      group.append([...sel.value.ids])
      return
    }
    const memberIds = [...sel.value.ids].filter(id => group.has(id))
    if (memberIds.length > 0) group.remove(memberIds)
  }

  private async explodeGroup(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const group = await this.promptGroup(context)
    if (!group) return
    acapExplodeGroup(context.doc.database, group)
    editor.showMessage(
      AcApI18n.t('jig.ungroup.exploded').replace('{name}', group.name),
      'info'
    )
  }

  private async renameGroup(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const group = await this.promptGroup(context)
    if (!group) return
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
    if (
      context.doc.database.objects.group.getAt(validated) &&
      validated !== group.name
    ) {
      editor.showMessage(AcApI18n.t('jig.group.nameExists'), 'warning')
      return
    }
    group.setName(validated)
    group.anonymous = false
  }

  private async toggleSelectable(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const group = await this.promptGroup(context)
    if (!group) return
    group.selectable = !group.selectable
    const value = group.selectable
      ? AcApI18n.t('jig.dashgroup.yes')
      : AcApI18n.t('jig.dashgroup.no')
    editor.showMessage(
      AcApI18n.t('jig.dashgroup.selectableSet')
        .replace('{name}', group.name)
        .replace('{value}', value),
      'info'
    )
  }

  private async reorderGroup(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    const group = await this.promptGroup(context)
    if (!group) return

    const orderPrompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.dashgroup.orderOption')
    )
    orderPrompt.keywords.add(
      AcApI18n.t('jig.dashgroup.keywords.reverse.display'),
      AcApI18n.t('jig.dashgroup.keywords.reverse.global'),
      AcApI18n.t('jig.dashgroup.keywords.reverse.local')
    )
    orderPrompt.keywords.add(
      AcApI18n.t('jig.dashgroup.keywords.position.display'),
      AcApI18n.t('jig.dashgroup.keywords.position.global'),
      AcApI18n.t('jig.dashgroup.keywords.position.local')
    )
    const orderResult = await editor.getKeywords(orderPrompt)
    if (
      orderResult.status !== AcEdPromptStatus.OK &&
      orderResult.status !== AcEdPromptStatus.Keyword
    ) {
      return
    }

    if (orderResult.stringResult === 'Reverse') {
      group.reverse()
      return
    }

    const fromPrompt = new AcEdPromptIntegerOptions(
      AcApI18n.t('jig.dashgroup.fromPosition')
    )
    const fromResult = await editor.getInteger(fromPrompt)
    if (fromResult.status !== AcEdPromptStatus.OK || fromResult.value == null) {
      return
    }
    const toPrompt = new AcEdPromptIntegerOptions(
      AcApI18n.t('jig.dashgroup.toPosition')
    )
    const toResult = await editor.getInteger(toPrompt)
    if (toResult.status !== AcEdPromptStatus.OK || toResult.value == null) {
      return
    }
    group.transfer(fromResult.value, toResult.value, 1)
  }
}
