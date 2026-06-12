import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'

/**
 * AutoCAD-like `LAYON` command.
 *
 * The command turns on every layer in the current drawing by clearing the
 * layer-off flag. Frozen layers remain frozen, which matches the AutoCAD
 * command's responsibility of restoring only off layers.
 */
export class AcApLayerOnCmd extends AcEdCommand {
  /**
   * Creates a write-enabled `LAYON` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Runs the turn-on-all-layers workflow.
   *
   * @param context - Active application context used to update the current drawing.
   * @returns Resolves when all layer states have been processed.
   */
  async execute(context: AcApContext) {
    const layers = [...context.doc.database.tables.layerTable.newIterator()]
    let turnedOn = 0

    layers.forEach(layer => {
      if (!layer.isOff) return
      layer.isOff = false
      turnedOn++
    })

    context.view.selectionSet.clear()

    if (turnedOn === 0) {
      this.showMessage(AcApI18n.t('jig.layon.alreadyOn'))
      return
    }

    this.showMessage(
      `${AcApI18n.t('jig.layon.turnedOn')}: ${turnedOn}`,
      'success'
    )
  }
}
