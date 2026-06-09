import { AcDbLayerTableRecord } from '@mlightcad/data-model'

import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * AutoCAD-like `LAYTHW` command.
 *
 * The command thaws every frozen layer in the current drawing by clearing the
 * global frozen flag. Per-viewport layer freeze state is not represented in
 * the current viewer, matching the command to database-wide layer thawing only.
 */
export class AcApLayerThawCmd extends AcEdCommand {
  /**
   * Creates a write-enabled `LAYTHW` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Runs the thaw-all-layers workflow.
   *
   * @param context - Active application context used to update the current drawing.
   * @returns Resolves when all layer states have been processed.
   */
  async execute(context: AcApContext) {
    const layers = [...context.doc.database.tables.layerTable.newIterator()]
    let thawed = 0

    layers.forEach(layer => {
      if (!layer.isFrozen) return
      this.setLayerFrozen(layer, false)
      thawed++
    })

    context.view.selectionSet.clear()

    if (thawed === 0) {
      this.showMessage(AcApI18n.t('jig.laythw.alreadyThawed'))
      return
    }

    this.showMessage(`${AcApI18n.t('jig.laythw.thawed')}: ${thawed}`, 'success')
  }

  /**
   * Clears or sets the frozen bit while preserving other layer flags.
   *
   * @param layer - Target layer table record.
   * @param frozen - Whether the layer should be marked frozen.
   */
  private setLayerFrozen(layer: AcDbLayerTableRecord, frozen: boolean) {
    const flags = layer.standardFlags ?? 0
    layer.standardFlags = frozen ? flags | 0x01 : flags & ~0x01
  }
}
