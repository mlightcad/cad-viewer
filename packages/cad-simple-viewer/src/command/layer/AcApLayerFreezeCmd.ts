import { AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdOpenMode,
  AcEdPromptEntityOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { AcApLayerService } from '../../service'
import { AcApLayerMutationCmd } from './AcApLayerMutationCmd'

/**
 * Top-level keywords supported by the `LAYFRZ` entity selection prompt.
 */
type LayfrzKeyword = 'Settings' | 'Undo'

/**
 * Keywords available inside the `LAYFRZ` settings submenu.
 */
type LayfrzSettingsKeyword = 'Viewports' | 'BlockSelection'

/**
 * Persisted viewport handling modes for the `LAYFRZ` command.
 *
 * `Vpfreeze` is retained for AutoCAD parity even though the current viewer
 * falls back to the global freeze behavior.
 */
type LayfrzViewportMode = 'Freeze' | 'Vpfreeze'

/**
 * Strategies for resolving a target layer when a picked entity belongs to a
 * nested block reference.
 */
type LayfrzBlockSelectionMode = 'Block' | 'Entity' | 'None'

/**
 * Session-independent `LAYFRZ` options that are shared across command runs.
 */
interface LayfrzSettings {
  /** Viewport-related freeze behavior selected in the settings branch. */
  viewportMode: LayfrzViewportMode

  /** Nested block selection behavior selected in the settings branch. */
  blockSelectionMode: LayfrzBlockSelectionMode
}

/**
 * Undo snapshot for a single successful freeze operation.
 */
interface LayfrzHistoryEntry {
  /** Name of the layer whose frozen state changed. */
  layerName: string

  /** Whether the layer was already frozen before the command changed it. */
  wasFrozen: boolean
}

/**
 * Normalized result of the main `LAYFRZ` prompt.
 *
 * The command loop consumes this discriminated union so it can handle picked
 * entities and command keywords through the same control flow.
 */
type LayfrzPromptResult =
  | {
      /** Indicates that the user picked an entity. */
      type: 'entity'

      /** Object identifier of the picked entity. */
      objectId: AcDbObjectId
    }
  | {
      /** Indicates that the user entered a command keyword. */
      type: 'keyword'

      /** Recognized top-level keyword value. */
      keyword: LayfrzKeyword
    }

const DEFAULT_SETTINGS: LayfrzSettings = {
  viewportMode: 'Freeze',
  blockSelectionMode: 'None'
}

/**
 * AutoCAD-like `LAYFRZ` command.
 *
 * The command repeatedly asks the user to pick an entity and freezes the
 * corresponding layer. It also supports the AutoCAD-style `Settings` and
 * `Undo` branches during the same command session.
 *
 * Current viewer limitations:
 * - Only one global viewport is available, so `Vpfreeze` behaves like
 *   `Freeze`.
 * - Nested block/xref sub-entity picking is not exposed yet, so the block
 *   selection setting is stored for future use but does not currently change
 *   the resolved target layer.
 */
export class AcApLayerFreezeCmd extends AcApLayerMutationCmd {
  private static _settings: LayfrzSettings = { ...DEFAULT_SETTINGS }

  private _history: LayfrzHistoryEntry[] = []
  private _vpfreezeHintShown = false

  /**
   * Creates a write-enabled `LAYFRZ` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Runs the interactive freeze-layer workflow until the user cancels.
   *
   * The command keeps its per-run undo stack in memory and reuses the static
   * settings selected in previous `LAYFRZ` invocations.
   *
   * @param context - Active application context used to read and update the current drawing.
   * @returns Resolves when the command loop ends.
   */
  async execute(context: AcApContext) {
    this._history = []
    this._vpfreezeHintShown =
      AcApLayerFreezeCmd._settings.viewportMode !== 'Vpfreeze'

    while (true) {
      const action = await this.promptSelection()
      if (!action) return

      if (action.type === 'keyword') {
        if (action.keyword === 'Settings') {
          await this.runSettings()
        } else {
          this.runUndo(context)
        }
        continue
      }

      this.freezeEntityLayer(context, action.objectId)
    }
  }

  /**
   * Registers a localized keyword on an entity or keyword prompt.
   *
   * @param prompt - Prompt instance that should expose the keyword to the user.
   * @param key - I18n keyword identifier under `jig.layfrz.keywords`.
   */
  private addKeyword(
    prompt: AcEdPromptEntityOptions | AcEdPromptKeywordOptions,
    key:
      | 'settings'
      | 'undo'
      | 'viewports'
      | 'blockSelection'
      | 'freeze'
      | 'vpfreeze'
      | 'block'
      | 'entity'
      | 'none'
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.layfrz.keywords.${key}.display`),
      AcApI18n.t(`jig.layfrz.keywords.${key}.global`),
      AcApI18n.t(`jig.layfrz.keywords.${key}.local`)
    )
  }

  /**
   * Prompts for either a picked entity or one of the top-level command keywords.
   *
   * @returns Resolved selection or keyword action, or `undefined` when the user cancels.
   */
  private async promptSelection(): Promise<LayfrzPromptResult | undefined> {
    const prompt = new AcEdPromptEntityOptions(AcApI18n.t('jig.layfrz.prompt'))
    prompt.allowNone = true
    prompt.allowObjectOnLockedLayer = true
    prompt.setRejectMessage(AcApI18n.t('jig.layfrz.invalidSelection'))

    this.addKeyword(prompt, 'settings')
    this.addKeyword(prompt, 'undo')

    const result = await AcApDocManager.instance.editor.getEntity(prompt)
    if (result.status === AcEdPromptStatus.OK && result.objectId) {
      return {
        type: 'entity',
        objectId: result.objectId
      }
    }

    if (
      result.status === AcEdPromptStatus.Keyword &&
      (result.stringResult === 'Settings' || result.stringResult === 'Undo')
    ) {
      return {
        type: 'keyword',
        keyword: result.stringResult
      }
    }

    return undefined
  }

  /**
   * Opens the `Settings` branch and keeps prompting until the user exits it.
   *
   * @returns Resolves when the settings submenu is closed.
   */
  private async runSettings() {
    while (true) {
      const prompt = new AcEdPromptKeywordOptions(
        AcApI18n.t('jig.layfrz.settingsPrompt')
      )
      prompt.allowNone = true

      this.addKeyword(prompt, 'viewports')
      this.addKeyword(prompt, 'blockSelection')

      const result = await AcApDocManager.instance.editor.getKeywords(prompt)
      if (result.status !== AcEdPromptStatus.OK) return

      const keyword = result.stringResult as LayfrzSettingsKeyword | undefined
      if (!keyword) return

      if (keyword === 'Viewports') {
        await this.promptViewportMode()
      } else {
        await this.promptBlockSelectionMode()
      }
    }
  }

  /**
   * Prompts for the viewport-freeze mode to store for subsequent selections.
   *
   * `Vpfreeze` currently falls back to a global freeze because the viewer does
   * not expose per-viewport layer state.
   *
   * @returns Resolves when the prompt is dismissed or the setting is updated.
   */
  private async promptViewportMode() {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.layfrz.viewportPrompt')
    )
    prompt.allowNone = true

    const freeze = prompt.keywords.add(
      AcApI18n.t('jig.layfrz.keywords.freeze.display'),
      AcApI18n.t('jig.layfrz.keywords.freeze.global'),
      AcApI18n.t('jig.layfrz.keywords.freeze.local')
    )
    const vpfreeze = prompt.keywords.add(
      AcApI18n.t('jig.layfrz.keywords.vpfreeze.display'),
      AcApI18n.t('jig.layfrz.keywords.vpfreeze.global'),
      AcApI18n.t('jig.layfrz.keywords.vpfreeze.local')
    )

    prompt.keywords.default =
      AcApLayerFreezeCmd._settings.viewportMode === 'Vpfreeze'
        ? vpfreeze
        : freeze

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status !== AcEdPromptStatus.OK) return

    const keyword = result.stringResult as LayfrzViewportMode | undefined
    if (!keyword) return

    AcApLayerFreezeCmd._settings.viewportMode = keyword
    if (keyword === 'Vpfreeze') {
      this._vpfreezeHintShown = true
      this.showMessage(AcApI18n.t('jig.layfrz.vpfreezeFallback'))
    } else {
      this._vpfreezeHintShown = false
    }
  }

  /**
   * Prompts for how nested block selections should resolve their target layer.
   *
   * The chosen value is persisted for later use even though nested selection is
   * not yet implemented in the viewer.
   *
   * @returns Resolves when the prompt is dismissed or the setting is updated.
   */
  private async promptBlockSelectionMode() {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.layfrz.blockSelectionPrompt')
    )
    prompt.allowNone = true

    const block = prompt.keywords.add(
      AcApI18n.t('jig.layfrz.keywords.block.display'),
      AcApI18n.t('jig.layfrz.keywords.block.global'),
      AcApI18n.t('jig.layfrz.keywords.block.local')
    )
    const entity = prompt.keywords.add(
      AcApI18n.t('jig.layfrz.keywords.entity.display'),
      AcApI18n.t('jig.layfrz.keywords.entity.global'),
      AcApI18n.t('jig.layfrz.keywords.entity.local')
    )
    const none = prompt.keywords.add(
      AcApI18n.t('jig.layfrz.keywords.none.display'),
      AcApI18n.t('jig.layfrz.keywords.none.global'),
      AcApI18n.t('jig.layfrz.keywords.none.local')
    )

    prompt.keywords.default =
      AcApLayerFreezeCmd._settings.blockSelectionMode === 'Block'
        ? block
        : AcApLayerFreezeCmd._settings.blockSelectionMode === 'Entity'
          ? entity
          : none

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status !== AcEdPromptStatus.OK) return

    const keyword = result.stringResult as LayfrzBlockSelectionMode | undefined
    if (!keyword) return

    AcApLayerFreezeCmd._settings.blockSelectionMode = keyword
    this.showMessage(AcApI18n.t('jig.layfrz.nestedSelectionLimited'))
  }

  /**
   * Resolves the picked entity's layer and freezes it when allowed.
   *
   * The method validates the selection, prevents freezing the current layer,
   * records undo history, and clears the selection set after a successful edit.
   *
   * @param context - Active application context containing the current database and view.
   * @param objectId - Identifier of the entity selected by the user.
   */
  private freezeEntityLayer(context: AcApContext, objectId: AcDbObjectId) {
    const service = new AcApLayerService(context.doc.database)
    const result = service.freezeLayerByEntity(objectId)

    if (!result.ok) {
      switch (result.reason) {
        case 'invalid_selection':
          this.showMessage(AcApI18n.t('jig.layfrz.invalidSelection'), 'warning')
          return
        case 'layer_not_found':
          this.showMessage(
            `${AcApI18n.t('jig.layfrz.layerNotFound')}: ${result.layerName}`,
            'warning'
          )
          return
        case 'cannot_change_current':
          this.showMessage(
            AcApI18n.t('jig.layfrz.cannotFreezeCurrent'),
            'warning'
          )
          return
        case 'already_frozen':
          this.showMessage(
            `${AcApI18n.t('jig.layfrz.alreadyFrozen')}: ${result.layerName}`,
            'info'
          )
          return
      }
      return
    }

    if (
      AcApLayerFreezeCmd._settings.viewportMode === 'Vpfreeze' &&
      !this._vpfreezeHintShown
    ) {
      this.showMessage(AcApI18n.t('jig.layfrz.vpfreezeFallback'))
      this._vpfreezeHintShown = true
    }

    this._history.push({
      layerName: result.layerName,
      wasFrozen: result.previousFrozen ?? false
    })

    context.view.selectionSet.clear()
    this.showMessage(
      `${AcApI18n.t('jig.layfrz.frozen')}: ${result.layerName}`,
      'success'
    )
  }

  /**
   * Restores the most recently frozen layer state captured during this run.
   *
   * @param context - Active application context containing the current database and view.
   */
  private runUndo(context: AcApContext) {
    const history = this._history.pop()
    if (!history) {
      this.showMessage(AcApI18n.t('jig.layfrz.nothingToUndo'), 'warning')
      return
    }

    const service = new AcApLayerService(context.doc.database)
    if (!service.setLayerFrozenByName(history.layerName, history.wasFrozen)) {
      this.showMessage(
        `${AcApI18n.t('jig.layfrz.layerNotFound')}: ${history.layerName}`,
        'warning'
      )
      return
    }

    context.view.selectionSet.clear()
    this.showMessage(
      `${AcApI18n.t('jig.layfrz.restored')}: ${history.layerName}`,
      'success'
    )
  }
}
