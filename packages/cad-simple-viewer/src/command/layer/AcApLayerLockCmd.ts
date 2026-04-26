import { AcDbLayerTableRecord, AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdMessageType,
  AcEdOpenMode,
  AcEdPromptEntityOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * AutoCAD-like `LAYLCK` command.
 *
 * The command repeatedly asks the user to pick an entity and locks the
 * corresponding layer. It intentionally works by selection instead of layer
 * name entry, matching AutoCAD's `LAYLCK` workflow.
 */
export class AcApLayerLockCmd extends AcEdCommand {
  /**
   * Creates a write-enabled `LAYLCK` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Runs the interactive lock-layer workflow until the user cancels.
   *
   * @param context - Active application context used to read and update the current drawing.
   * @returns Resolves when the command loop ends.
   */
  async execute(context: AcApContext) {
    while (true) {
      const objectId = await this.promptSelection()
      if (!objectId) return

      this.lockEntityLayer(context, objectId)
    }
  }

  /**
   * Prompts for one entity whose layer should be locked.
   *
   * @returns Picked entity identifier, or `undefined` when the user cancels.
   */
  private async promptSelection(): Promise<AcDbObjectId | undefined> {
    const prompt = new AcEdPromptEntityOptions(AcApI18n.t('jig.laylck.prompt'))
    prompt.allowNone = true
    prompt.allowObjectOnLockedLayer = true
    prompt.setRejectMessage(AcApI18n.t('jig.laylck.invalidSelection'))

    const result = await AcApDocManager.instance.editor.getEntity(prompt)
    if (result.status === AcEdPromptStatus.OK && result.objectId) {
      return result.objectId
    }

    return undefined
  }

  /**
   * Sets or clears the locked bit in `standardFlags`.
   *
   * @param layer - Target layer table record.
   * @param locked - `true` to lock, `false` to unlock.
   */
  private setLayerLocked(layer: AcDbLayerTableRecord, locked: boolean) {
    const flags = layer.standardFlags ?? 0
    layer.standardFlags = locked ? flags | 0x04 : flags & ~0x04
  }

  /**
   * Resolves the picked entity's layer and locks it when needed.
   *
   * @param context - Active application context containing the current database and view.
   * @param objectId - Identifier of the entity selected by the user.
   */
  private lockEntityLayer(context: AcApContext, objectId: AcDbObjectId) {
    const db = context.doc.database
    const entity = db.tables.blockTable.getEntityById(objectId)
    const layerName = entity?.layer?.trim()

    if (!layerName) {
      this.notify(AcApI18n.t('jig.laylck.invalidSelection'), 'warning')
      return
    }

    const layer = db.tables.layerTable.getAt(layerName)
    if (!layer) {
      this.notify(
        `${AcApI18n.t('jig.laylck.layerNotFound')}: ${layerName}`,
        'warning'
      )
      return
    }

    if (layer.isLocked) {
      this.notify(
        `${AcApI18n.t('jig.laylck.alreadyLocked')}: ${layer.name}`,
        'info'
      )
      return
    }

    this.setLayerLocked(layer, true)
    context.view.selectionSet.clear()
    this.notify(`${AcApI18n.t('jig.laylck.locked')}: ${layer.name}`, 'success')
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
}
