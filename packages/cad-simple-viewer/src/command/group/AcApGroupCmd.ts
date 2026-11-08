import { AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptKeywordOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  acapCreateGroup,
  AcApGroupCreateError,
  acapValidateGroupName
} from '../../service/AcApGroup'

/**
 * GROUP — create a named or unnamed group from selected objects.
 *
 * AutoCAD prompt without preselection is
 * `Select objects or [Name/Description]:` — pick on the canvas, or type a
 * keyword. Using {@link AcEdInputManager.getSelection} (not getKeywords)
 * keeps canvas pick / Escape working.
 */
export class AcApGroupCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const editor = AcApDocManager.instance.editor
    let name: string | undefined
    let description = ''
    let unnamed = true

    let entityIds: AcDbObjectId[] = [...context.view.selectionSet.ids]

    if (entityIds.length > 0) {
      // Noun-verb: optional Name / Description, Enter creates unnamed group.
      const quick = new AcEdPromptKeywordOptions(
        AcApI18n.t('jig.group.createOrOption')
      )
      this.addNameDescriptionKeywords(quick)
      quick.allowNone = true
      const quickResult = await editor.getKeywords(quick)
      if (quickResult.status === AcEdPromptStatus.Cancel) return
      // Dedicated getKeywords resolves as OK (global name), not Keyword.
      if (
        (quickResult.status === AcEdPromptStatus.OK ||
          quickResult.status === AcEdPromptStatus.Keyword) &&
        quickResult.stringResult === 'Name'
      ) {
        const named = await this.promptName(context)
        if (!named) return
        name = named
        unnamed = false
      } else if (
        (quickResult.status === AcEdPromptStatus.OK ||
          quickResult.status === AcEdPromptStatus.Keyword) &&
        quickResult.stringResult === 'Description'
      ) {
        description = (await this.promptDescription()) ?? ''
      }
    } else {
      // Verb-noun: select objects (with optional Name / Description keywords).
      while (entityIds.length === 0) {
        const selPrompt = new AcEdPromptSelectionOptions(
          AcApI18n.t('jig.group.selectOrOption')
        )
        this.addNameDescriptionKeywords(selPrompt)
        const selResult = await editor.getSelection(selPrompt)

        if (selResult.status === AcEdPromptStatus.Cancel) return

        if (selResult.status === AcEdPromptStatus.Keyword) {
          if (selResult.stringResult === 'Name') {
            const named = await this.promptName(context)
            if (!named) return
            name = named
            unnamed = false
            continue
          }
          if (selResult.stringResult === 'Description') {
            description = (await this.promptDescription()) ?? description
            continue
          }
          return
        }

        if (
          selResult.status !== AcEdPromptStatus.OK ||
          !selResult.value ||
          selResult.value.count === 0
        ) {
          return
        }
        entityIds = [...selResult.value.ids]
      }
    }

    if (entityIds.length === 0) return

    try {
      const group = acapCreateGroup(context.doc.database, {
        name,
        description,
        unnamed,
        entityIds
      })
      editor.showMessage(
        AcApI18n.t('jig.group.created').replace('{name}', group.name),
        'info'
      )
      context.view.selectionSet.clear()
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

  private addNameDescriptionKeywords(
    prompt: AcEdPromptSelectionOptions | AcEdPromptKeywordOptions
  ) {
    prompt.keywords.add(
      AcApI18n.t('jig.group.keywords.name.display'),
      AcApI18n.t('jig.group.keywords.name.global'),
      AcApI18n.t('jig.group.keywords.name.local')
    )
    prompt.keywords.add(
      AcApI18n.t('jig.group.keywords.description.display'),
      AcApI18n.t('jig.group.keywords.description.global'),
      AcApI18n.t('jig.group.keywords.description.local')
    )
  }

  private async promptName(
    context: AcApContext
  ): Promise<string | undefined> {
    const editor = AcApDocManager.instance.editor
    const namePrompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.group.enterName')
    )
    const nameResult = await editor.getString(namePrompt)
    if (
      nameResult.status !== AcEdPromptStatus.OK ||
      !nameResult.stringResult
    ) {
      return undefined
    }
    const validated = acapValidateGroupName(nameResult.stringResult)
    if (!validated) {
      editor.showMessage(AcApI18n.t('jig.group.invalidName'), 'warning')
      return undefined
    }
    if (context.doc.database.objects.group.getAt(validated)) {
      editor.showMessage(AcApI18n.t('jig.group.nameExists'), 'warning')
      return undefined
    }
    return validated
  }

  private async promptDescription(): Promise<string | undefined> {
    const editor = AcApDocManager.instance.editor
    const descPrompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.group.enterDescription')
    )
    const descResult = await editor.getString(descPrompt)
    if (
      descResult.status === AcEdPromptStatus.OK &&
      descResult.stringResult
    ) {
      return descResult.stringResult
    }
    return undefined
  }
}
