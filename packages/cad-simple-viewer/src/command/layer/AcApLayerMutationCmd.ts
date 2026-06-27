import { AcApContext } from '../../app'
import { AcEdCommand } from '../../editor'

/** Global command name for `LAYERP`; excluded from pre-operation capture. */
const LAYERP_COMMAND_NAME = 'layerp'

/**
 * Base class for commands that mutate the layer table.
 *
 * Overrides undo recording so layer changes are undoable even in Write mode.
 * Captures layer state before execution so {@link AcApLayerPCmd} can restore it.
 */
export abstract class AcApLayerMutationCmd extends AcEdCommand {
  protected shouldRecordUndoStack(_context: AcApContext): boolean {
    return this.recordsUndoStack
  }

  protected onCommandWillStart(context: AcApContext): void {
    if (this.globalName.toLowerCase() === LAYERP_COMMAND_NAME) {
      return
    }
    context.doc.captureLayerPreviousState()
  }
}
