import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdOpenMode,
  AcEdPromptKeywordOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApLayerService } from '../../service'
import { AcApLayerMutationCmd } from './AcApLayerMutationCmd'

type LayerTopKeyword =
  | '?'
  | 'Make'
  | 'Set'
  | 'New'
  | 'On'
  | 'Off'
  | 'Color'
  | 'Freeze'
  | 'Thaw'
  | 'Lock'
  | 'Unlock'
  | 'Description'

/**
 * AutoCAD-style command-line layer command (`-LAYER`).
 */
export class AcApLayerCmd extends AcApLayerMutationCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    while (true) {
      const action = await this.promptMainKeyword()
      if (!action) return

      switch (action) {
        case '?':
          this.listLayers(context)
          break
        case 'Make':
          await this.runMake(context)
          break
        case 'Set':
          await this.runSet(context)
          break
        case 'New':
          await this.runNew(context)
          break
        case 'On':
          await this.runOnOff(context, false)
          break
        case 'Off':
          await this.runOnOff(context, true)
          break
        case 'Color':
          await this.runColor(context)
          break
        case 'Freeze':
          await this.runFreeze(context, true)
          break
        case 'Thaw':
          await this.runFreeze(context, false)
          break
        case 'Lock':
          await this.runLock(context, true)
          break
        case 'Unlock':
          await this.runLock(context, false)
          break
        case 'Description':
          await this.runDescription(context)
          break
      }
    }
  }

  private layerService(context: AcApContext) {
    return new AcApLayerService(context.doc.database)
  }

  private async promptMainKeyword(): Promise<LayerTopKeyword | undefined> {
    const prompt = new AcEdPromptKeywordOptions(AcApI18n.t('jig.layer.main'))
    prompt.allowNone = true

    this.addKeyword(prompt, 'list')
    this.addKeyword(prompt, 'make')
    this.addKeyword(prompt, 'set')
    this.addKeyword(prompt, 'new')
    this.addKeyword(prompt, 'on')
    this.addKeyword(prompt, 'off')
    this.addKeyword(prompt, 'color')
    this.addKeyword(prompt, 'freeze')
    this.addKeyword(prompt, 'thaw')
    this.addKeyword(prompt, 'lock')
    this.addKeyword(prompt, 'unlock')
    this.addKeyword(prompt, 'description')

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status !== AcEdPromptStatus.OK) return undefined
    return result.stringResult as LayerTopKeyword | undefined
  }

  private addKeyword(
    prompt: AcEdPromptKeywordOptions,
    keyword:
      | 'list'
      | 'make'
      | 'set'
      | 'new'
      | 'on'
      | 'off'
      | 'color'
      | 'freeze'
      | 'thaw'
      | 'lock'
      | 'unlock'
      | 'description'
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.layer.keywords.${keyword}.display`),
      AcApI18n.t(`jig.layer.keywords.${keyword}.global`),
      AcApI18n.t(`jig.layer.keywords.${keyword}.local`)
    )
  }

  private listLayers(context: AcApContext) {
    const rows = this.layerService(context).getLayerSummaries()
    console.table(rows)
    this.showMessage(
      `${AcApI18n.t('jig.layer.listSummary')} (${rows.length})`,
      'info'
    )
  }

  private async promptLayerNames(
    message: string,
    context: AcApContext
  ): Promise<string[] | undefined> {
    const prompt = new AcEdPromptStringOptions(message)
    prompt.allowSpaces = false
    const result = await AcApDocManager.instance.editor.getString(prompt)
    if (result.status !== AcEdPromptStatus.OK) return undefined

    const service = this.layerService(context)
    const names = service.parseLayerNameInput(result.stringResult ?? '')
    if (!names.length) {
      this.showMessage(AcApI18n.t('jig.layer.emptyInput'), 'warning')
      return undefined
    }
    return names
  }

  private async promptSingleLayerName(
    message: string
  ): Promise<string | undefined> {
    const prompt = new AcEdPromptStringOptions(message)
    prompt.allowSpaces = true
    const result = await AcApDocManager.instance.editor.getString(prompt)
    if (result.status !== AcEdPromptStatus.OK) return undefined
    const name = (result.stringResult ?? '').trim()
    return name || undefined
  }

  private async runNew(context: AcApContext) {
    const names = await this.promptLayerNames(
      AcApI18n.t('jig.layer.newPrompt'),
      context
    )
    if (!names) return

    const { created, existed } = this.layerService(context).createLayers(names)

    if (created > 0) {
      this.showMessage(
        `${AcApI18n.t('jig.layer.created')}: ${created}`,
        'success'
      )
    }
    if (existed.length > 0) {
      this.showMessage(
        `${AcApI18n.t('jig.layer.alreadyExists')}: ${existed.join(', ')}`,
        'warning'
      )
    }
  }

  private async runSet(context: AcApContext) {
    const name = await this.promptSingleLayerName(
      AcApI18n.t('jig.layer.setPrompt')
    )
    if (!name) return

    if (!this.layerService(context).setCurrentLayer(name)) {
      this.showMessage(
        `${AcApI18n.t('jig.layer.notFound')}: ${name}`,
        'warning'
      )
    }
  }

  private async runMake(context: AcApContext) {
    const name = await this.promptSingleLayerName(
      AcApI18n.t('jig.layer.makePrompt')
    )
    if (!name) return

    this.layerService(context).makeLayer(name)
  }

  private async runOnOff(context: AcApContext, off: boolean) {
    const names = await this.promptLayerNames(
      off
        ? AcApI18n.t('jig.layer.offPrompt')
        : AcApI18n.t('jig.layer.onPrompt'),
      context
    )
    if (!names) return

    const service = this.layerService(context)
    const { missing } = service.resolveLayers(names)
    if (missing.length > 0) {
      this.showMessage(
        `${AcApI18n.t('jig.layer.notFound')}: ${missing.join(', ')}`,
        'warning'
      )
    }

    const { skippedCurrent } = service.setLayersVisibility(names, off)
    if (skippedCurrent.length > 0) {
      this.showMessage(AcApI18n.t('jig.layer.cannotChangeCurrent'), 'warning')
    }
  }

  private async runFreeze(context: AcApContext, freeze: boolean) {
    const names = await this.promptLayerNames(
      freeze
        ? AcApI18n.t('jig.layer.freezePrompt')
        : AcApI18n.t('jig.layer.thawPrompt'),
      context
    )
    if (!names) return

    const service = this.layerService(context)
    const { missing } = service.resolveLayers(names)
    if (missing.length > 0) {
      this.showMessage(
        `${AcApI18n.t('jig.layer.notFound')}: ${missing.join(', ')}`,
        'warning'
      )
    }

    const { skippedCurrent } = service.setLayersFrozen(names, freeze)
    if (skippedCurrent.length > 0) {
      this.showMessage(AcApI18n.t('jig.layer.cannotChangeCurrent'), 'warning')
    }
  }

  private async runLock(context: AcApContext, lock: boolean) {
    const names = await this.promptLayerNames(
      lock
        ? AcApI18n.t('jig.layer.lockPrompt')
        : AcApI18n.t('jig.layer.unlockPrompt'),
      context
    )
    if (!names) return

    const service = this.layerService(context)
    const { missing } = service.resolveLayers(names)
    if (missing.length > 0) {
      this.showMessage(
        `${AcApI18n.t('jig.layer.notFound')}: ${missing.join(', ')}`,
        'warning'
      )
    }

    service.setLayersLocked(names, lock)
  }

  private async runColor(context: AcApContext) {
    const names = await this.promptLayerNames(
      AcApI18n.t('jig.layer.colorLayerPrompt'),
      context
    )
    if (!names) return

    const service = this.layerService(context)
    const { layers, missing } = service.resolveLayers(names)
    if (missing.length > 0) {
      this.showMessage(
        `${AcApI18n.t('jig.layer.notFound')}: ${missing.join(', ')}`,
        'warning'
      )
    }
    if (layers.length === 0) return

    const colorPrompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.layer.colorValuePrompt')
    )
    colorPrompt.allowSpaces = false
    const colorResult =
      await AcApDocManager.instance.editor.getString(colorPrompt)
    if (colorResult.status !== AcEdPromptStatus.OK) return

    const color = service.parseColorInput(colorResult.stringResult ?? '')
    if (!color) {
      this.showMessage(AcApI18n.t('jig.layer.invalidColor'), 'warning')
      return
    }

    service.setLayersColor(names, color)
  }

  private async runDescription(context: AcApContext) {
    const name = await this.promptSingleLayerName(
      AcApI18n.t('jig.layer.descriptionLayerPrompt')
    )
    if (!name) return

    const descPrompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.layer.descriptionValuePrompt')
    )
    descPrompt.allowSpaces = true
    descPrompt.allowEmpty = true
    const result = await AcApDocManager.instance.editor.getString(descPrompt)
    if (result.status !== AcEdPromptStatus.OK) return

    if (
      !this.layerService(context).setLayerDescription(
        name,
        result.stringResult ?? ''
      )
    ) {
      this.showMessage(
        `${AcApI18n.t('jig.layer.notFound')}: ${name}`,
        'warning'
      )
    }
  }
}
