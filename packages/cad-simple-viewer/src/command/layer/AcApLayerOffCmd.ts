import { AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptEntityOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptStatus
} from '../../editor'
import { eventBus } from '../../editor/global/eventBus'
import { AcApI18n } from '../../i18n'

/**
 * Top-level keywords supported by the `LAYOFF` entity selection prompt.
 */
type LayoffKeyword = 'Settings' | 'Undo'

/**
 * Keywords available inside the `LAYOFF` settings submenu.
 */
type LayoffSettingsKeyword = 'Viewports' | 'BlockSelection'

/**
 * Persisted viewport handling modes for the `LAYOFF` command.
 *
 * `Vpfreeze` is retained for AutoCAD parity even though the current viewer
 * falls back to the global off behavior.
 */
type LayoffViewportMode = 'Off' | 'Vpfreeze'

/**
 * Strategies for resolving a target layer when a picked entity belongs to a
 * nested block reference.
 */
type LayoffBlockSelectionMode = 'Block' | 'Entity' | 'None'

/**
 * Session-independent `LAYOFF` options that are shared across command runs.
 */
interface LayoffSettings {
  /** Viewport-related layer-off behavior selected in the settings branch. */
  viewportMode: LayoffViewportMode

  /** Nested block selection behavior selected in the settings branch. */
  blockSelectionMode: LayoffBlockSelectionMode
}

/**
 * Undo snapshot for a single successful layer-off operation.
 */
interface LayoffHistoryEntry {
  /** Name of the layer whose visibility state changed. */
  layerName: string

  /** Whether the layer was already off before the command changed it. */
  wasOff: boolean
}

/**
 * Normalized result of the main `LAYOFF` prompt.
 *
 * The command loop consumes this discriminated union so it can handle picked
 * entities and command keywords through the same control flow.
 */
type LayoffPromptResult =
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
      keyword: LayoffKeyword
    }

const DEFAULT_SETTINGS: LayoffSettings = {
  viewportMode: 'Off',
  blockSelectionMode: 'None'
}

/**
 * AutoCAD-like `LAYOFF` command.
 *
 * The command repeatedly asks the user to pick an entity and turns off the
 * corresponding layer. It also supports AutoCAD-style `Settings` and `Undo`
 * branches during the same command session.
 *
 * Current viewer limitations:
 * - Only one global viewport is available, so `Vpfreeze` behaves like `Off`.
 * - Nested block/xref sub-entity picking is not exposed yet, so the block
 *   selection setting is stored for future use but does not currently change
 *   the resolved target layer.
 */
export class AcApLayoffCmd extends AcEdCommand {
  private static _settings: LayoffSettings = { ...DEFAULT_SETTINGS }

  private _history: LayoffHistoryEntry[] = []
  private _vpfreezeHintShown = false

  /**
   * Creates a write-enabled `LAYOFF` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Runs the interactive turn-layer-off workflow until the user cancels.
   *
   * The command keeps an in-memory undo stack for the current invocation and
   * reuses the static settings chosen in previous `LAYOFF` runs.
   *
   * @param context - Active application context used to read and update the current drawing.
   * @returns Resolves when the command loop ends.
   */
  async execute(context: AcApContext) {
    this._history = []
    this._vpfreezeHintShown =
      AcApLayoffCmd._settings.viewportMode !== 'Vpfreeze'

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

      this.turnOffEntityLayer(context, action.objectId)
    }
  }

  /**
   * Sends a localized status message through the shared editor event bus.
   *
   * @param message - Text to display to the user.
   * @param type - Visual severity used by the host notification UI.
   */
  private notify(
    message: string,
    type: 'success' | 'warning' | 'info' = 'info'
  ) {
    eventBus.emit('message', { message, type })
  }

  /**
   * Registers a localized keyword on an entity or keyword prompt.
   *
   * @param prompt - Prompt instance that should expose the keyword to the user.
   * @param key - I18n keyword identifier under `jig.layoff.keywords`.
   */
  private addKeyword(
    prompt: AcEdPromptEntityOptions | AcEdPromptKeywordOptions,
    key:
      | 'settings'
      | 'undo'
      | 'viewports'
      | 'blockSelection'
      | 'off'
      | 'vpfreeze'
      | 'block'
      | 'entity'
      | 'none'
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.layoff.keywords.${key}.display`),
      AcApI18n.t(`jig.layoff.keywords.${key}.global`),
      AcApI18n.t(`jig.layoff.keywords.${key}.local`)
    )
  }

  /**
   * Prompts for either a picked entity or one of the top-level command keywords.
   *
   * @returns Resolved selection or keyword action, or `undefined` when the user cancels.
   */
  private async promptSelection(): Promise<LayoffPromptResult | undefined> {
    const prompt = new AcEdPromptEntityOptions(AcApI18n.t('jig.layoff.prompt'))
    prompt.allowNone = true
    prompt.allowObjectOnLockedLayer = true
    prompt.setRejectMessage(AcApI18n.t('jig.layoff.invalidSelection'))

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
        AcApI18n.t('jig.layoff.settingsPrompt')
      )
      prompt.allowNone = true

      this.addKeyword(prompt, 'viewports')
      this.addKeyword(prompt, 'blockSelection')

      const result = await AcApDocManager.instance.editor.getKeywords(prompt)
      if (result.status !== AcEdPromptStatus.OK) return

      const keyword = result.stringResult as LayoffSettingsKeyword | undefined
      if (!keyword) return

      if (keyword === 'Viewports') {
        await this.promptViewportMode()
      } else {
        await this.promptBlockSelectionMode()
      }
    }
  }

  /**
   * Prompts for the viewport-specific off mode to persist for later selections.
   *
   * `Vpfreeze` currently falls back to a global off state because the viewer
   * does not expose per-viewport layer visibility.
   *
   * @returns Resolves when the prompt is dismissed or the setting is updated.
   */
  private async promptViewportMode() {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.layoff.viewportPrompt')
    )
    prompt.allowNone = true

    const off = prompt.keywords.add(
      AcApI18n.t('jig.layoff.keywords.off.display'),
      AcApI18n.t('jig.layoff.keywords.off.global'),
      AcApI18n.t('jig.layoff.keywords.off.local')
    )
    const vpfreeze = prompt.keywords.add(
      AcApI18n.t('jig.layoff.keywords.vpfreeze.display'),
      AcApI18n.t('jig.layoff.keywords.vpfreeze.global'),
      AcApI18n.t('jig.layoff.keywords.vpfreeze.local')
    )

    prompt.keywords.default =
      AcApLayoffCmd._settings.viewportMode === 'Vpfreeze' ? vpfreeze : off

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status !== AcEdPromptStatus.OK) return

    const keyword = result.stringResult as LayoffViewportMode | undefined
    if (!keyword) return

    AcApLayoffCmd._settings.viewportMode = keyword
    if (keyword === 'Vpfreeze') {
      this._vpfreezeHintShown = true
      this.notify(AcApI18n.t('jig.layoff.vpfreezeFallback'))
    } else {
      this._vpfreezeHintShown = false
    }
  }

  /**
   * Prompts for how nested block selections should resolve their target layer.
   *
   * The chosen value is persisted for future parity with AutoCAD even though
   * nested selection handling is not implemented yet.
   *
   * @returns Resolves when the prompt is dismissed or the setting is updated.
   */
  private async promptBlockSelectionMode() {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.layoff.blockSelectionPrompt')
    )
    prompt.allowNone = true

    const block = prompt.keywords.add(
      AcApI18n.t('jig.layoff.keywords.block.display'),
      AcApI18n.t('jig.layoff.keywords.block.global'),
      AcApI18n.t('jig.layoff.keywords.block.local')
    )
    const entity = prompt.keywords.add(
      AcApI18n.t('jig.layoff.keywords.entity.display'),
      AcApI18n.t('jig.layoff.keywords.entity.global'),
      AcApI18n.t('jig.layoff.keywords.entity.local')
    )
    const none = prompt.keywords.add(
      AcApI18n.t('jig.layoff.keywords.none.display'),
      AcApI18n.t('jig.layoff.keywords.none.global'),
      AcApI18n.t('jig.layoff.keywords.none.local')
    )

    prompt.keywords.default =
      AcApLayoffCmd._settings.blockSelectionMode === 'Block'
        ? block
        : AcApLayoffCmd._settings.blockSelectionMode === 'Entity'
          ? entity
          : none

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status !== AcEdPromptStatus.OK) return

    const keyword = result.stringResult as LayoffBlockSelectionMode | undefined
    if (!keyword) return

    AcApLayoffCmd._settings.blockSelectionMode = keyword
    this.notify(AcApI18n.t('jig.layoff.nestedSelectionLimited'))
  }

  /**
   * Resolves the picked entity's layer and turns it off when allowed.
   *
   * The method validates the selection, prevents turning off the current layer,
   * records undo history, and clears the selection set after a successful edit.
   *
   * @param context - Active application context containing the current database and view.
   * @param objectId - Identifier of the entity selected by the user.
   */
  private turnOffEntityLayer(context: AcApContext, objectId: AcDbObjectId) {
    const db = context.doc.database
    const entity = db.tables.blockTable.getEntityById(objectId)
    const layerName = entity?.layer?.trim()

    if (!layerName) {
      this.notify(AcApI18n.t('jig.layoff.invalidSelection'), 'warning')
      return
    }

    const layer = db.tables.layerTable.getAt(layerName)
    if (!layer) {
      this.notify(
        `${AcApI18n.t('jig.layoff.layerNotFound')}: ${layerName}`,
        'warning'
      )
      return
    }

    if (layer.name === db.clayer) {
      this.notify(AcApI18n.t('jig.layoff.cannotTurnOffCurrent'), 'warning')
      return
    }

    if (layer.isOff) {
      this.notify(
        `${AcApI18n.t('jig.layoff.alreadyOff')}: ${layer.name}`,
        'info'
      )
      return
    }

    if (
      AcApLayoffCmd._settings.viewportMode === 'Vpfreeze' &&
      !this._vpfreezeHintShown
    ) {
      this.notify(AcApI18n.t('jig.layoff.vpfreezeFallback'))
      this._vpfreezeHintShown = true
    }

    this._history.push({
      layerName: layer.name,
      wasOff: layer.isOff
    })

    layer.isOff = true
    context.view.selectionSet.clear()
    this.notify(
      `${AcApI18n.t('jig.layoff.turnedOff')}: ${layer.name}`,
      'success'
    )
  }

  /**
   * Restores the most recently changed layer-off state captured during this run.
   *
   * @param context - Active application context containing the current database and view.
   */
  private runUndo(context: AcApContext) {
    const history = this._history.pop()
    if (!history) {
      this.notify(AcApI18n.t('jig.layoff.nothingToUndo'), 'warning')
      return
    }

    const layer = context.doc.database.tables.layerTable.getAt(
      history.layerName
    )
    if (!layer) {
      this.notify(
        `${AcApI18n.t('jig.layoff.layerNotFound')}: ${history.layerName}`,
        'warning'
      )
      return
    }

    layer.isOff = history.wasOff
    context.view.selectionSet.clear()
    this.notify(
      `${AcApI18n.t('jig.layoff.restored')}: ${layer.name}`,
      'success'
    )
  }
}
