import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'
import { openLayerForWrite, setLayerFrozenState } from './AcApLayerEdit'

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
    const db = context.doc.database
    const layers = [...db.tables.layerTable.newIterator()]
    let thawed = 0

    layers.forEach(layer => {
      if (!layer.isFrozen) return
      const opened = openLayerForWrite(db, layer)
      if (!opened) return
      setLayerFrozenState(opened, false)
      thawed++
    })

    context.view.selectionSet.clear()

    if (thawed === 0) {
      this.showMessage(AcApI18n.t('jig.laythw.alreadyThawed'))
      return
    }

    this.showMessage(`${AcApI18n.t('jig.laythw.thawed')}: ${thawed}`, 'success')
  }
}
