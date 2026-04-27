import { AcDbLayerTableRecord } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import { AcEdCommand, AcEdMessageType, AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'
import {
  AcApLayerIsoLayerSnapshot,
  AcApLayerIsoState
} from './AcApLayerIsoState'

/**
 * AutoCAD-like `LAYUNISO` command.
 *
 * The command restores the layer state captured by the previous `LAYISO`.
 * It only reverts properties that still match the value applied by `LAYISO`,
 * so layer edits made after isolation are retained.
 */
export class AcApLayerUnisoCmd extends AcEdCommand {
  /**
   * Creates a write-enabled `LAYUNISO` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Restores the previous `LAYISO` layer state when available.
   *
   * @param context - Active application context used to update layer states.
   * @returns Resolves after restoration is attempted.
   */
  async execute(context: AcApContext) {
    const snapshot = AcApLayerIsoState.consume()
    if (!snapshot) {
      this.notify(AcApI18n.t('jig.layuniso.noPrevious'), 'warning')
      return
    }

    const db = context.doc.database
    const table = db.tables.layerTable
    let restoredLayers = 0

    for (const entry of snapshot.layers) {
      const layer = table.getAt(entry.name)
      if (!layer) {
        this.notify(
          `${AcApI18n.t('jig.layuniso.layerNotFound')}: ${entry.name}`,
          'warning'
        )
        continue
      }

      if (this.restoreLayerIfUnchanged(layer, entry)) {
        restoredLayers++
      }
    }

    if (
      db.clayer === snapshot.currentLayerAfter &&
      snapshot.currentLayerBefore !== snapshot.currentLayerAfter &&
      table.getAt(snapshot.currentLayerBefore)
    ) {
      db.clayer = snapshot.currentLayerBefore
    }

    context.view.selectionSet.clear()

    if (restoredLayers === 0) {
      this.notify(AcApI18n.t('jig.layuniso.nothingRestored'))
      return
    }

    this.notify(
      `${AcApI18n.t('jig.layuniso.restored')}: ${restoredLayers}`,
      'success'
    )
  }

  /**
   * Restores tracked layer flags that were not changed after `LAYISO`.
   *
   * @param layer - Layer to restore.
   * @param snapshot - Before/after state captured for this layer by `LAYISO`.
   * @returns `true` if any tracked flag was restored.
   */
  private restoreLayerIfUnchanged(
    layer: AcDbLayerTableRecord,
    snapshot: AcApLayerIsoLayerSnapshot
  ) {
    let restored = false

    if (
      layer.isOff === snapshot.isolated.isOff &&
      layer.isOff !== snapshot.before.isOff
    ) {
      layer.isOff = snapshot.before.isOff
      restored = true
    }

    if (
      layer.isFrozen === snapshot.isolated.isFrozen &&
      layer.isFrozen !== snapshot.before.isFrozen
    ) {
      this.setLayerFrozen(layer, snapshot.before.isFrozen)
      restored = true
    }

    if (
      layer.isLocked === snapshot.isolated.isLocked &&
      layer.isLocked !== snapshot.before.isLocked
    ) {
      this.setLayerLocked(layer, snapshot.before.isLocked)
      restored = true
    }

    return restored
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
   * Sends a localized status message through the command-line output.
   *
   * @param message - Text to display to the user.
   * @param type - Visual severity mapped to command-line message styles.
   */
  private notify(message: string, type: AcEdMessageType = 'info') {
    AcApDocManager.instance.editor.showMessage(message, type)
  }
}
