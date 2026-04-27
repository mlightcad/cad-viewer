import { AcDbLayerTableRecord, AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdMessageType,
  AcEdOpenMode,
  AcEdPromptKeywordOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  AcApLayerIsoLayerSnapshot,
  AcApLayerIsoLayerState,
  AcApLayerIsoState,
  getLayerIsoState,
  isSameLayerIsoState
} from './AcApLayerIsoState'

/**
 * Top-level keywords accepted by the `LAYISO` selection prompt.
 */
type LayisoKeyword = 'Settings'

/**
 * Settings for non-isolated layers.
 */
type LayisoIsolationMode = 'Off' | 'LockAndFade'

/**
 * Viewport handling mode used when non-isolated layers are hidden.
 */
type LayisoOffMode = 'Off' | 'Vpfreeze'

/**
 * Persisted `LAYISO` settings shared across command invocations.
 */
interface LayisoSettings {
  /** Whether non-isolated layers are hidden or locked/faded. */
  isolationMode: LayisoIsolationMode

  /** Viewport behavior used by the `Off` isolation mode. */
  offMode: LayisoOffMode
}

/**
 * Normalized result of the main `LAYISO` prompt.
 */
type LayisoPromptResult =
  | {
      /** Indicates that the user selected objects. */
      type: 'selection'

      /** Selected entity ids. */
      objectIds: AcDbObjectId[]
    }
  | {
      /** Indicates that the user entered a top-level keyword. */
      type: 'keyword'

      /** Recognized top-level keyword value. */
      keyword: LayisoKeyword
    }

const DEFAULT_SETTINGS: LayisoSettings = {
  isolationMode: 'Off',
  offMode: 'Off'
}

/**
 * AutoCAD-like `LAYISO` command.
 *
 * The command isolates the layers of selected objects. Non-isolated layers are
 * either turned off or locked, depending on the persisted `Settings` choice.
 *
 * Current viewer limitations:
 * - Per-viewport layer freezing is not represented, so `Vpfreeze` falls back to
 *   global layer-off behavior.
 * - Locked-layer fading is not rendered, so `Lock and fade` falls back to
 *   locking non-isolated layers without changing their visibility.
 */
export class AcApLayerIsoCmd extends AcEdCommand {
  private static _settings: LayisoSettings = { ...DEFAULT_SETTINGS }

  private _vpfreezeHintShown = false
  private _lockFadeHintShown = false

  /**
   * Creates a write-enabled `LAYISO` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Runs the isolate-layer workflow.
   *
   * Preselected entities are consumed immediately. Otherwise the command keeps
   * prompting until the user either changes settings, selects objects, or
   * cancels the command.
   *
   * @param context - Active application context used to update layer states.
   * @returns Resolves when layer isolation is applied or the command exits.
   */
  async execute(context: AcApContext) {
    this._vpfreezeHintShown = AcApLayerIsoCmd._settings.offMode !== 'Vpfreeze'
    this._lockFadeHintShown =
      AcApLayerIsoCmd._settings.isolationMode !== 'LockAndFade'

    const preselectedIds = context.view.selectionSet.ids
    if (preselectedIds.length > 0) {
      this.isolateSelectedObjectLayers(context, preselectedIds)
      return
    }

    while (true) {
      const action = await this.promptSelection()
      if (!action) return

      if (action.type === 'keyword') {
        await this.runSettings()
        continue
      }

      this.isolateSelectedObjectLayers(context, action.objectIds)
      return
    }
  }

  /**
   * Sends a localized status message through the command-line output.
   *
   * @param message - Text to display to the user.
   * @param type - Visual severity mapped to command-line message styles.
   */
  private notify(message: string, type: AcEdMessageType = 'info') {
    AcApDocManager.instance.editor.showMessage(message, type)
  }

  /**
   * Registers a localized keyword on a prompt.
   *
   * @param prompt - Prompt instance that should expose the keyword.
   * @param key - I18n keyword identifier under `jig.layiso.keywords`.
   */
  private addKeyword(
    prompt: AcEdPromptSelectionOptions | AcEdPromptKeywordOptions,
    key: 'settings' | 'off' | 'lockAndFade' | 'vpfreeze'
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.layiso.keywords.${key}.display`),
      AcApI18n.t(`jig.layiso.keywords.${key}.global`),
      AcApI18n.t(`jig.layiso.keywords.${key}.local`)
    )
  }

  /**
   * Prompts for selected entities or the `Settings` keyword.
   *
   * @returns Selection or keyword action, or `undefined` when canceled.
   */
  private async promptSelection(): Promise<LayisoPromptResult | undefined> {
    const prompt = new AcEdPromptSelectionOptions(
      AcApI18n.t('jig.layiso.prompt')
    )

    this.addKeyword(prompt, 'settings')

    const result = await AcApDocManager.instance.editor.getSelection(prompt)
    if (result.status === AcEdPromptStatus.OK) {
      return {
        type: 'selection',
        objectIds: result.value?.ids ?? []
      }
    }

    if (
      result.status === AcEdPromptStatus.Keyword &&
      result.stringResult === 'Settings'
    ) {
      return {
        type: 'keyword',
        keyword: result.stringResult
      }
    }

    return undefined
  }

  /**
   * Opens the `Settings` branch for choosing how non-isolated layers behave.
   *
   * @returns Resolves when the setting prompt is dismissed or updated.
   */
  private async runSettings() {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.layiso.settingsPrompt')
    )
    prompt.allowNone = true

    const off = prompt.keywords.add(
      AcApI18n.t('jig.layiso.keywords.off.display'),
      AcApI18n.t('jig.layiso.keywords.off.global'),
      AcApI18n.t('jig.layiso.keywords.off.local')
    )
    const lockAndFade = prompt.keywords.add(
      AcApI18n.t('jig.layiso.keywords.lockAndFade.display'),
      AcApI18n.t('jig.layiso.keywords.lockAndFade.global'),
      AcApI18n.t('jig.layiso.keywords.lockAndFade.local')
    )

    prompt.keywords.default =
      AcApLayerIsoCmd._settings.isolationMode === 'LockAndFade'
        ? lockAndFade
        : off

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status !== AcEdPromptStatus.OK) return

    const keyword = result.stringResult as LayisoIsolationMode | undefined
    if (!keyword) return

    AcApLayerIsoCmd._settings.isolationMode = keyword
    if (keyword === 'Off') {
      await this.promptOffMode()
      return
    }

    this._lockFadeHintShown = true
    this.notify(AcApI18n.t('jig.layiso.lockFadeFallback'))
  }

  /**
   * Prompts for viewport behavior used by the `Off` isolation mode.
   *
   * `Vpfreeze` falls back to ordinary layer-off behavior because the viewer has
   * no per-viewport layer state.
   *
   * @returns Resolves when the prompt is dismissed or the setting is updated.
   */
  private async promptOffMode() {
    const prompt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.layiso.offModePrompt')
    )
    prompt.allowNone = true

    const off = prompt.keywords.add(
      AcApI18n.t('jig.layiso.keywords.off.display'),
      AcApI18n.t('jig.layiso.keywords.off.global'),
      AcApI18n.t('jig.layiso.keywords.off.local')
    )
    const vpfreeze = prompt.keywords.add(
      AcApI18n.t('jig.layiso.keywords.vpfreeze.display'),
      AcApI18n.t('jig.layiso.keywords.vpfreeze.global'),
      AcApI18n.t('jig.layiso.keywords.vpfreeze.local')
    )

    prompt.keywords.default =
      AcApLayerIsoCmd._settings.offMode === 'Vpfreeze' ? vpfreeze : off

    const result = await AcApDocManager.instance.editor.getKeywords(prompt)
    if (result.status !== AcEdPromptStatus.OK) return

    const keyword = result.stringResult as LayisoOffMode | undefined
    if (!keyword) return

    AcApLayerIsoCmd._settings.offMode = keyword
    if (keyword === 'Vpfreeze') {
      this._vpfreezeHintShown = true
      this.notify(AcApI18n.t('jig.layiso.vpfreezeFallback'))
    } else {
      this._vpfreezeHintShown = false
    }
  }

  /**
   * Sets or clears the frozen bit while preserving other layer flags.
   *
   * @param layer - Target layer table record.
   * @param frozen - Whether the layer should be marked frozen.
   */
  private setLayerFrozen(layer: AcDbLayerTableRecord, frozen: boolean) {
    const flags = layer.standardFlags ?? 0
    layer.standardFlags = frozen ? flags | 0x01 : flags & ~0x01
  }

  /**
   * Sets or clears the locked bit while preserving other layer flags.
   *
   * @param layer - Target layer table record.
   * @param locked - Whether the layer should be marked locked.
   */
  private setLayerLocked(layer: AcDbLayerTableRecord, locked: boolean) {
    const flags = layer.standardFlags ?? 0
    layer.standardFlags = locked ? flags | 0x04 : flags & ~0x04
  }

  /**
   * Resolves selected entities to layer names and applies isolation.
   *
   * @param context - Active application context containing database and view.
   * @param objectIds - Entity ids selected by the user.
   */
  private isolateSelectedObjectLayers(
    context: AcApContext,
    objectIds: AcDbObjectId[]
  ) {
    const layerNames = this.collectSelectedLayerNames(context, objectIds)
    if (layerNames.length === 0) {
      this.notify(AcApI18n.t('jig.layiso.noLayers'), 'warning')
      return
    }

    const db = context.doc.database
    const table = db.tables.layerTable
    const targetNames = new Set(layerNames)
    const targetLayer = table.getAt(layerNames[0])
    const currentLayerBefore = db.clayer
    const beforeStates = new Map<string, AcApLayerIsoLayerState>()

    for (const layer of table.newIterator()) {
      beforeStates.set(layer.name, getLayerIsoState(layer))
    }

    if (targetLayer) {
      db.clayer = targetLayer.name
    }

    const affectedLayerNames = new Set<string>()

    for (const layer of table.newIterator()) {
      if (targetNames.has(layer.name)) {
        if (layer.isOff) {
          layer.isOff = false
          affectedLayerNames.add(layer.name)
        }
        if (layer.isFrozen) {
          this.setLayerFrozen(layer, false)
          affectedLayerNames.add(layer.name)
        }
        if (layer.isLocked) {
          this.setLayerLocked(layer, false)
          affectedLayerNames.add(layer.name)
        }
        continue
      }

      if (AcApLayerIsoCmd._settings.isolationMode === 'Off') {
        if (!layer.isOff) {
          layer.isOff = true
          affectedLayerNames.add(layer.name)
        }
        continue
      }

      if (!layer.isLocked) {
        this.setLayerLocked(layer, true)
        affectedLayerNames.add(layer.name)
      }
    }

    const snapshots: AcApLayerIsoLayerSnapshot[] = []
    for (const layer of table.newIterator()) {
      const before = beforeStates.get(layer.name)
      if (!before) continue

      const isolated = getLayerIsoState(layer)
      if (!isSameLayerIsoState(before, isolated)) {
        snapshots.push({
          name: layer.name,
          before,
          isolated
        })
      }
    }

    AcApLayerIsoState.set({
      currentLayerBefore,
      currentLayerAfter: db.clayer,
      layers: snapshots
    })

    if (
      AcApLayerIsoCmd._settings.isolationMode === 'Off' &&
      AcApLayerIsoCmd._settings.offMode === 'Vpfreeze' &&
      !this._vpfreezeHintShown
    ) {
      this.notify(AcApI18n.t('jig.layiso.vpfreezeFallback'))
      this._vpfreezeHintShown = true
    }

    if (
      AcApLayerIsoCmd._settings.isolationMode === 'LockAndFade' &&
      !this._lockFadeHintShown
    ) {
      this.notify(AcApI18n.t('jig.layiso.lockFadeFallback'))
      this._lockFadeHintShown = true
    }

    context.view.selectionSet.clear()
    this.notify(
      `${AcApI18n.t('jig.layiso.isolated')}: ${layerNames.join(', ')} (${AcApI18n.t('jig.layiso.affectedLayers')}: ${affectedLayerNames.size})`,
      'success'
    )
  }

  /**
   * Collects distinct layer names from selected entity ids.
   *
   * @param context - Active application context containing the drawing database.
   * @param objectIds - Selected entity identifiers.
   * @returns Layer names resolved from valid selected entities.
   */
  private collectSelectedLayerNames(
    context: AcApContext,
    objectIds: AcDbObjectId[]
  ) {
    const db = context.doc.database
    const names = new Set<string>()
    const missing = new Set<string>()

    objectIds.forEach(objectId => {
      const entity = db.tables.blockTable.getEntityById(objectId)
      const layerName = entity?.layer?.trim()
      if (!layerName) return

      const layer = db.tables.layerTable.getAt(layerName)
      if (layer) {
        names.add(layer.name)
      } else {
        missing.add(layerName)
      }
    })

    if (missing.size > 0) {
      this.notify(
        `${AcApI18n.t('jig.layiso.layerNotFound')}: ${[...missing].join(', ')}`,
        'warning'
      )
    }

    return [...names]
  }
}
