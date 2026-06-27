import { AcDbLayerTableRecord, AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdOpenMode,
  AcEdPromptEntityOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApLaydelEntitySnapshot, AcApLayerService } from '../../service'
import { AcApLayerMutationCmd } from './AcApLayerMutationCmd'

/**
 * Top-level keywords supported by the main `LAYDEL` entity selection prompt.
 */
type LaydelMainKeyword = 'Name' | 'Undo'

/**
 * Keywords supported by the layer-name branch of `LAYDEL`.
 */
type LaydelNameKeyword = '?' | 'Undo'

/**
 * Normalized result of the first `LAYDEL` prompt.
 *
 * The command can either receive an entity selection or a keyword that
 * switches the workflow into another branch.
 */
type LaydelMainAction =
  | {
      /** Indicates that the user picked an entity to infer the target layer. */
      type: 'entity'

      /** Object identifier of the picked entity. */
      objectId: AcDbObjectId
    }
  | {
      /** Indicates that the user entered a top-level command keyword. */
      type: 'keyword'

      /** Recognized main-branch keyword value. */
      keyword: LaydelMainKeyword
    }

/**
 * Normalized result of the layer-name prompt inside the `Name` branch.
 */
type LaydelNameAction =
  | {
      /** Indicates that the user entered a concrete layer name. */
      type: 'name'

      /** Layer name typed by the user after trimming surrounding whitespace. */
      layerName: string
    }
  | {
      /** Indicates that the user entered a keyword in the name branch. */
      type: 'keyword'

      /** Recognized name-branch keyword value. */
      keyword: LaydelNameKeyword
    }

interface LaydelHistoryEntry {
  layer: AcDbLayerTableRecord
  entities: AcApLaydelEntitySnapshot[]
}

/**
 * AutoCAD-like `LAYDEL` command.
 *
 * Supported workflows:
 * - Pick an entity to delete its layer and every object on that layer.
 * - Switch to the `Name` branch to delete a layer by name.
 * - Use `Undo` to restore the most recently deleted layer in the current
 *   command session.
 */
export class AcApLayerDelCmd extends AcApLayerMutationCmd {
  private _history: LaydelHistoryEntry[] = []

  /**
   * Creates a write-enabled `LAYDEL` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Runs the interactive layer deletion workflow until the user cancels.
   *
   * The command supports both entity-based and name-based deletion paths and
   * keeps an in-memory undo history for the current command session only.
   *
   * @param context - Active application context used to inspect and mutate the drawing.
   * @returns Resolves when the command loop ends.
   */
  async execute(context: AcApContext) {
    this._history = []

    while (true) {
      const action = await this.promptMainAction()
      if (!action) return

      if (action.type === 'keyword') {
        if (action.keyword === 'Name') {
          await this.runNameBranch(context)
        } else {
          this.runUndo(context)
        }
        continue
      }

      this.deleteLayerByEntity(context, action.objectId)
    }
  }

  /**
   * Registers a localized keyword on an entity or string prompt.
   *
   * @param prompt - Prompt instance that should expose the keyword.
   * @param keyword - I18n keyword identifier under `jig.laydel.keywords`.
   */
  private addKeyword(
    prompt: AcEdPromptEntityOptions | AcEdPromptStringOptions,
    keyword: 'name' | 'undo' | 'list'
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.laydel.keywords.${keyword}.display`),
      AcApI18n.t(`jig.laydel.keywords.${keyword}.global`),
      AcApI18n.t(`jig.laydel.keywords.${keyword}.local`)
    )
  }

  /**
   * Prompts for the main `LAYDEL` action.
   *
   * Users can either pick an entity to infer the target layer or switch to a
   * keyword branch such as `Name` or `Undo`.
   *
   * @returns Resolved action, or `undefined` when the prompt is canceled.
   */
  private async promptMainAction(): Promise<LaydelMainAction | undefined> {
    const prompt = new AcEdPromptEntityOptions(
      AcApI18n.t('jig.laydel.selectPrompt')
    )
    prompt.allowNone = true
    prompt.allowObjectOnLockedLayer = true
    prompt.setRejectMessage(AcApI18n.t('jig.laydel.invalidSelection'))
    this.addKeyword(prompt, 'name')
    this.addKeyword(prompt, 'undo')

    const result = await AcApDocManager.instance.editor.getEntity(prompt)
    if (result.status === AcEdPromptStatus.OK && result.objectId) {
      return { type: 'entity', objectId: result.objectId }
    }

    if (
      result.status === AcEdPromptStatus.Keyword &&
      (result.stringResult === 'Name' || result.stringResult === 'Undo')
    ) {
      return { type: 'keyword', keyword: result.stringResult }
    }

    return undefined
  }

  /**
   * Runs the layer-name branch until the user exits that submenu.
   *
   * @param context - Active application context used to list, delete, or restore layers.
   * @returns Resolves when the name submenu ends.
   */
  private async runNameBranch(context: AcApContext) {
    while (true) {
      const action = await this.promptLayerNameAction()
      if (!action) return

      if (action.type === 'keyword') {
        if (action.keyword === '?') {
          this.listLayers(context)
        } else {
          this.runUndo(context)
        }
        continue
      }

      this.deleteLayerByName(context, action.layerName)
    }
  }

  /**
   * Prompts for a layer name or one of the name-branch keywords.
   *
   * @returns Resolved name action, or `undefined` when canceled or left blank.
   */
  private async promptLayerNameAction(): Promise<LaydelNameAction | undefined> {
    const prompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.laydel.namePrompt')
    )
    prompt.allowSpaces = true
    prompt.allowEmpty = true
    this.addKeyword(prompt, 'list')
    this.addKeyword(prompt, 'undo')

    const result = await AcApDocManager.instance.editor.getString(prompt)
    if (
      result.status === AcEdPromptStatus.Keyword &&
      (result.stringResult === '?' || result.stringResult === 'Undo')
    ) {
      return { type: 'keyword', keyword: result.stringResult }
    }

    if (result.status !== AcEdPromptStatus.OK) return undefined

    const layerName = (result.stringResult ?? '').trim()
    if (!layerName) return undefined

    return { type: 'name', layerName }
  }

  /**
   * Prints a snapshot of all current layers to the console and notifies the UI.
   *
   * @param context - Active application context providing access to the layer table.
   */
  private listLayers(context: AcApContext) {
    const rows = new AcApLayerService(context.doc.database).getLayerSummaries()
    console.table(rows)
    this.showMessage(AcApI18n.t('jig.laydel.layerListSummary'), 'info')
  }

  /**
   * Resolves the selected entity's layer name and delegates to layer deletion by name.
   *
   * @param context - Active application context containing the current database.
   * @param objectId - Identifier of the entity selected by the user.
   */
  private deleteLayerByEntity(context: AcApContext, objectId: AcDbObjectId) {
    const entity =
      context.doc.database.tables.blockTable.getEntityById(objectId)
    const layerName = entity?.layer?.trim()

    if (!layerName) {
      this.showMessage(AcApI18n.t('jig.laydel.invalidSelection'), 'warning')
      return
    }

    this.deleteLayerByName(context, layerName)
  }

  /**
   * Deletes a layer and every entity currently assigned to it.
   *
   * The removed layer record and cloned entities are stored in `_history` so
   * that `Undo` can reconstruct the previous state during the same run.
   *
   * @param context - Active application context containing the drawing to mutate.
   * @param layerName - Name of the layer to remove.
   */
  private deleteLayerByName(context: AcApContext, layerName: string) {
    const result = new AcApLayerService(context.doc.database).deleteLayer(
      layerName
    )

    if (!result.ok) {
      switch (result.reason) {
        case 'not_found':
          this.showMessage(
            `${AcApI18n.t('jig.laydel.layerNotFound')}: ${layerName}`
          )
          return
        case 'layer_0':
          this.showMessage(
            AcApI18n.t('jig.laydel.cannotDeleteZeroLayer'),
            'warning'
          )
          return
        case 'current_layer':
          this.showMessage(
            AcApI18n.t('jig.laydel.cannotDeleteCurrent'),
            'warning'
          )
          return
      }
    }

    this._history.push({
      layer: result.layer,
      entities: result.entities
    })

    context.view.selectionSet.clear()
    AcApDocManager.instance.regen()
    this.showMessage(
      `${AcApI18n.t('jig.laydel.deleted')}: ${result.layerName}`,
      'success'
    )
  }

  private runUndo(context: AcApContext) {
    const entry = this._history.pop()
    if (!entry) {
      this.showMessage(AcApI18n.t('jig.laydel.nothingToUndo'), 'warning')
      return
    }

    new AcApLayerService(context.doc.database).restoreDeletedLayer(
      entry.layer,
      entry.entities
    )

    context.view.selectionSet.clear()
    AcApDocManager.instance.regen()
    this.showMessage(
      `${AcApI18n.t('jig.laydel.restored')}: ${entry.layer.name}`,
      'success'
    )
  }
}
