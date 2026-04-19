import {
  AcCmColor,
  AcCmColorMethod,
  AcDbLayerTableRecord
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptKeywordOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { eventBus } from '../../editor/global/eventBus'
import { AcApI18n } from '../../i18n'

/**
 * Top-level keywords accepted by the `-LAYER` command main prompt.
 *
 * Each value maps to one command-line branch and mirrors the interaction
 * style used by AutoCAD's no-dialog layer command.
 */
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
 *
 * This command intentionally avoids any dialog UI and keeps all interactions
 * in command line prompts.
 */
export class AcApLayerCmd extends AcEdCommand {
  /**
   * Creates a command-line `-LAYER` command instance.
   *
   * The command is registered as a write-mode command because layer operations
   * can modify database state (current layer, visibility, lock state, color,
   * descriptions, and table records).
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Runs the interactive `-LAYER` loop.
   *
   * The command keeps prompting for top-level options until the user cancels
   * or confirms an empty input. Each selected keyword dispatches to one
   * dedicated branch handler.
   *
   * @param context - Active application context containing view and document.
   * @returns Resolves when the command exits.
   */
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

  /**
   * Prompts for one top-level `-LAYER` action keyword.
   *
   * The prompt is keyword-only and supports empty-enter termination (`allowNone`).
   *
   * @returns Selected top-level keyword, or `undefined` when canceled/finished.
   */
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
    const keyword = result.stringResult as LayerTopKeyword | undefined
    return keyword
  }

  /**
   * Adds one localized keyword entry to the main `-LAYER` prompt.
   *
   * @param prompt - Target keyword prompt to receive the keyword option.
   * @param keyword - Translation-key suffix for `jig.layer.keywords.*`.
   */
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

  /**
   * Emits one user-facing message through the global event bus.
   *
   * This keeps command logic decoupled from concrete UI rendering.
   *
   * @param message - Message text to display.
   * @param type - Message severity category.
   */
  private notify(
    message: string,
    type: 'success' | 'warning' | 'info' = 'info'
  ) {
    eventBus.emit('message', { message, type })
  }

  /**
   * Prints all layer states to browser console and reports summary in UI.
   *
   * The list contains the current-layer marker and common status columns
   * (on/off, frozen, locked, color).
   *
   * @param context - Active command context used to resolve the layer table.
   */
  private listLayers(context: AcApContext) {
    const db = context.doc.database
    const layers = [...db.tables.layerTable.newIterator()]
    const rows = layers.map(layer => ({
      name: layer.name,
      current: db.clayer === layer.name ? '*' : '',
      on: layer.isOff ? 'No' : 'Yes',
      frozen: layer.isFrozen ? 'Yes' : 'No',
      locked: layer.isLocked ? 'Yes' : 'No',
      color: layer.color.toString()
    }))
    console.table(rows)
    this.notify(
      `${AcApI18n.t('jig.layer.listSummary')} (${rows.length})`,
      'info'
    )
  }

  /**
   * Parses a raw layer-name input string into a distinct name list.
   *
   * Supported forms:
   * - `*` to target all existing layer names.
   * - Comma-separated names (e.g. `A,B,C`).
   *
   * @param input - Raw user input from command line.
   * @param allNames - All existing layer names, used for wildcard expansion.
   * @returns Deduplicated list of requested layer names.
   */
  private parseLayerNameInput(input: string, allNames: string[]): string[] {
    const raw = input.trim()
    if (!raw) return []
    if (raw === '*') return [...allNames]
    const names = raw
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)
    return [...new Set(names)]
  }

  /**
   * Resolves layer records by name and separates missing names.
   *
   * @param context - Active command context with access to layer table.
   * @param names - Layer names to resolve.
   * @returns Object containing matched records and unresolved names.
   */
  private resolveLayers(context: AcApContext, names: string[]) {
    const table = context.doc.database.tables.layerTable
    const layers: AcDbLayerTableRecord[] = []
    const missing: string[] = []
    names.forEach(name => {
      const layer = table.getAt(name)
      if (layer) layers.push(layer)
      else missing.push(name)
    })
    return { layers, missing }
  }

  /**
   * Sets or clears the frozen bit in `standardFlags`.
   *
   * The explicit bit operation is used to ensure both freeze and thaw are
   * applied deterministically.
   *
   * @param layer - Target layer table record.
   * @param frozen - `true` to freeze, `false` to thaw.
   */
  private setLayerFrozen(layer: AcDbLayerTableRecord, frozen: boolean) {
    const flags = layer.standardFlags ?? 0
    layer.standardFlags = frozen ? flags | 0x01 : flags & ~0x01
  }

  /**
   * Sets or clears the locked bit in `standardFlags`.
   *
   * The explicit bit operation is used to ensure both lock and unlock are
   * applied deterministically.
   *
   * @param layer - Target layer table record.
   * @param locked - `true` to lock, `false` to unlock.
   */
  private setLayerLocked(layer: AcDbLayerTableRecord, locked: boolean) {
    const flags = layer.standardFlags ?? 0
    layer.standardFlags = locked ? flags | 0x04 : flags & ~0x04
  }

  /**
   * Prompts for one or more layer names and parses them into a list.
   *
   * This helper powers batch operations such as on/off/freeze/thaw/lock/unlock
   * and supports wildcard `*` plus comma-separated names.
   *
   * @param message - Prompt message shown in command line.
   * @param context - Active command context used for wildcard expansion.
   * @returns Parsed layer names, or `undefined` when canceled/invalid.
   */
  private async promptLayerNames(
    message: string,
    context: AcApContext
  ): Promise<string[] | undefined> {
    const prompt = new AcEdPromptStringOptions(message)
    prompt.allowSpaces = false
    const result = await AcApDocManager.instance.editor.getString(prompt)
    if (result.status !== AcEdPromptStatus.OK) return undefined
    const allNames = [
      ...context.doc.database.tables.layerTable.newIterator()
    ].map(layer => layer.name)
    const names = this.parseLayerNameInput(result.stringResult ?? '', allNames)
    if (!names.length) {
      this.notify(AcApI18n.t('jig.layer.emptyInput'), 'warning')
      return undefined
    }
    return names
  }

  /**
   * Prompts for a single layer name.
   *
   * @param message - Prompt message shown in command line.
   * @returns Trimmed layer name, or `undefined` when canceled/empty.
   */
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

  /**
   * Handles the `New` branch.
   *
   * Creates one or more missing layers while keeping existing ones unchanged.
   * The method reports creation count and duplicate names separately.
   *
   * @param context - Active command context used to access the layer table.
   * @returns Resolves when branch execution completes.
   */
  private async runNew(context: AcApContext) {
    const names = await this.promptLayerNames(
      AcApI18n.t('jig.layer.newPrompt'),
      context
    )
    if (!names) return

    const table = context.doc.database.tables.layerTable
    let created = 0
    const existed: string[] = []

    names.forEach(name => {
      if (table.has(name)) {
        existed.push(name)
        return
      }
      table.add(
        new AcDbLayerTableRecord({
          name,
          isOff: false,
          isPlottable: true,
          color: new AcCmColor(AcCmColorMethod.ByACI, 7),
          linetype: 'Continuous'
        })
      )
      created++
    })

    if (created > 0) {
      this.notify(`${AcApI18n.t('jig.layer.created')}: ${created}`, 'success')
    }
    if (existed.length > 0) {
      this.notify(
        `${AcApI18n.t('jig.layer.alreadyExists')}: ${existed.join(', ')}`,
        'warning'
      )
    }
  }

  /**
   * Handles the `Set` branch.
   *
   * Sets one existing layer as current (`CLAYER`) and ensures the target is
   * visible/unfrozen before assignment.
   *
   * @param context - Active command context.
   * @returns Resolves when branch execution completes.
   */
  private async runSet(context: AcApContext) {
    const name = await this.promptSingleLayerName(
      AcApI18n.t('jig.layer.setPrompt')
    )
    if (!name) return

    const layer = context.doc.database.tables.layerTable.getAt(name)
    if (!layer) {
      this.notify(`${AcApI18n.t('jig.layer.notFound')}: ${name}`, 'warning')
      return
    }

    layer.isOff = false
    this.setLayerFrozen(layer, false)
    context.doc.database.clayer = layer.name
  }

  /**
   * Handles the `Make` branch.
   *
   * Creates the layer if missing, then makes it current. The resulting current
   * layer is turned on and thawed.
   *
   * @param context - Active command context.
   * @returns Resolves when branch execution completes.
   */
  private async runMake(context: AcApContext) {
    const name = await this.promptSingleLayerName(
      AcApI18n.t('jig.layer.makePrompt')
    )
    if (!name) return

    const table = context.doc.database.tables.layerTable
    let layer = table.getAt(name)
    if (!layer) {
      layer = new AcDbLayerTableRecord({
        name,
        isOff: false,
        isPlottable: true,
        color: new AcCmColor(AcCmColorMethod.ByACI, 7),
        linetype: 'Continuous'
      })
      table.add(layer)
    }

    layer.isOff = false
    this.setLayerFrozen(layer, false)
    context.doc.database.clayer = layer.name
  }

  /**
   * Handles `On` and `Off` branches.
   *
   * Batch toggles visibility for selected layers. Turning off the current layer
   * is skipped and reported as warning.
   *
   * @param context - Active command context.
   * @param off - `true` for `Off`, `false` for `On`.
   * @returns Resolves when branch execution completes.
   */
  private async runOnOff(context: AcApContext, off: boolean) {
    const names = await this.promptLayerNames(
      off
        ? AcApI18n.t('jig.layer.offPrompt')
        : AcApI18n.t('jig.layer.onPrompt'),
      context
    )
    if (!names) return

    const db = context.doc.database
    const { layers, missing } = this.resolveLayers(context, names)
    if (missing.length > 0) {
      this.notify(
        `${AcApI18n.t('jig.layer.notFound')}: ${missing.join(', ')}`,
        'warning'
      )
    }

    const skippedCurrent: string[] = []
    layers.forEach(layer => {
      if (off && layer.name === db.clayer) {
        skippedCurrent.push(layer.name)
        return
      }
      layer.isOff = off
    })

    if (skippedCurrent.length > 0) {
      this.notify(AcApI18n.t('jig.layer.cannotChangeCurrent'), 'warning')
    }
  }

  /**
   * Handles `Freeze` and `Thaw` branches.
   *
   * Batch toggles frozen state using explicit bit operations. Freezing the
   * current layer is skipped and reported as warning.
   *
   * @param context - Active command context.
   * @param freeze - `true` for `Freeze`, `false` for `Thaw`.
   * @returns Resolves when branch execution completes.
   */
  private async runFreeze(context: AcApContext, freeze: boolean) {
    const names = await this.promptLayerNames(
      freeze
        ? AcApI18n.t('jig.layer.freezePrompt')
        : AcApI18n.t('jig.layer.thawPrompt'),
      context
    )
    if (!names) return

    const db = context.doc.database
    const { layers, missing } = this.resolveLayers(context, names)
    if (missing.length > 0) {
      this.notify(
        `${AcApI18n.t('jig.layer.notFound')}: ${missing.join(', ')}`,
        'warning'
      )
    }

    const skippedCurrent: string[] = []
    layers.forEach(layer => {
      if (freeze && layer.name === db.clayer) {
        skippedCurrent.push(layer.name)
        return
      }
      this.setLayerFrozen(layer, freeze)
    })

    if (skippedCurrent.length > 0) {
      this.notify(AcApI18n.t('jig.layer.cannotChangeCurrent'), 'warning')
    }
  }

  /**
   * Handles `Lock` and `Unlock` branches.
   *
   * Batch toggles lock state using explicit bit operations.
   *
   * @param context - Active command context.
   * @param lock - `true` for `Lock`, `false` for `Unlock`.
   * @returns Resolves when branch execution completes.
   */
  private async runLock(context: AcApContext, lock: boolean) {
    const names = await this.promptLayerNames(
      lock
        ? AcApI18n.t('jig.layer.lockPrompt')
        : AcApI18n.t('jig.layer.unlockPrompt'),
      context
    )
    if (!names) return

    const { layers, missing } = this.resolveLayers(context, names)
    if (missing.length > 0) {
      this.notify(
        `${AcApI18n.t('jig.layer.notFound')}: ${missing.join(', ')}`,
        'warning'
      )
    }
    layers.forEach(layer => this.setLayerLocked(layer, lock))
  }

  /**
   * Parses one color input token into `AcCmColor`.
   *
   * Supported formats:
   * - ACI index (`1..255`)
   * - RGB string accepted by `AcCmColor.fromString`
   * - CSS color names accepted by `AcCmColor.fromString`
   *
   * `ByLayer` and `ByBlock` are rejected for explicit layer color assignment.
   *
   * @param input - Raw color input string.
   * @returns Parsed color object, or `undefined` when invalid/unsupported.
   */
  private parseColorInput(input: string): AcCmColor | undefined {
    const value = input.trim()
    if (!value) return undefined
    if (/^\d+$/.test(value)) {
      const index = Number(value)
      if (index >= 1 && index <= 255) {
        return new AcCmColor(AcCmColorMethod.ByACI, index)
      }
      return undefined
    }

    const color = AcCmColor.fromString(value)
    if (!color) return undefined
    if (color.isByACI) {
      const index = color.colorIndex
      if (index == null || index < 1 || index > 255) {
        return undefined
      }
    }
    if (color.isByLayer || color.isByBlock) return undefined
    return color
  }

  /**
   * Handles the `Color` branch.
   *
   * Prompts target layers first, then prompts color value and applies a cloned
   * color instance to each resolved layer.
   *
   * @param context - Active command context.
   * @returns Resolves when branch execution completes.
   */
  private async runColor(context: AcApContext) {
    const names = await this.promptLayerNames(
      AcApI18n.t('jig.layer.colorLayerPrompt'),
      context
    )
    if (!names) return

    const { layers, missing } = this.resolveLayers(context, names)
    if (missing.length > 0) {
      this.notify(
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

    const color = this.parseColorInput(colorResult.stringResult ?? '')
    if (!color) {
      this.notify(AcApI18n.t('jig.layer.invalidColor'), 'warning')
      return
    }

    layers.forEach(layer => {
      layer.color = color.clone()
    })
  }

  /**
   * Handles the `Description` branch.
   *
   * Updates the description text of one specified layer. Empty description is
   * allowed and treated as clear.
   *
   * @param context - Active command context.
   * @returns Resolves when branch execution completes.
   */
  private async runDescription(context: AcApContext) {
    const name = await this.promptSingleLayerName(
      AcApI18n.t('jig.layer.descriptionLayerPrompt')
    )
    if (!name) return

    const layer = context.doc.database.tables.layerTable.getAt(name)
    if (!layer) {
      this.notify(`${AcApI18n.t('jig.layer.notFound')}: ${name}`, 'warning')
      return
    }

    const descPrompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.layer.descriptionValuePrompt')
    )
    descPrompt.allowSpaces = true
    descPrompt.allowEmpty = true
    const result = await AcApDocManager.instance.editor.getString(descPrompt)
    if (result.status !== AcEdPromptStatus.OK) return

    layer.description = result.stringResult ?? ''
  }
}
