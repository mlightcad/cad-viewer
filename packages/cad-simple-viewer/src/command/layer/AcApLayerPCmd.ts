import { AcApContext, AcApDocManager } from '../../app'
import { AcEdCommand, AcEdMessageType, AcEdOpenMode } from '../../editor'
import { AcApI18n } from '../../i18n'


/**
 * AutoCAD-like `LAYERP` command.
 *
 * The command restores the layer state to what it was before the last
 * layer-modifying operation. This includes changes to layer on/off,
 * freeze/thaw, and lock/unlock states.
 *
 * Note: This is a simplified implementation that tracks one previous state.
 * A full implementation would maintain a stack of states.
 */
export class AcApLayerPCmd extends AcEdCommand {
  /**
   * Creates a write-enabled `LAYERP` command instance.
   */
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /**
   * Runs the restore-previous-layer-state workflow.
   *
   * @param context - Active application context used to update the current drawing.
   * @returns Resolves when the restoration is complete or if there is nothing to restore.
   */
  async execute(context: AcApContext) {
    if (context.restorePreviousLayerState()) {
      this.notify(AcApI18n.t('jig.layerp.restored'), 'success')
    } else {
      this.notify(AcApI18n.t('jig.layerp.noPreviousState'))
    }

    context.view.selectionSet.clear()
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
