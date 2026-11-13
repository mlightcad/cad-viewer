import { AcApContext } from '../../app'
import { AcEdCommand, AcEdOpenMode } from '../../editor'
import { acapCopySelectionToClipboard } from './AcApClipboardUtils'

/**
 * COPYCLIP (Ctrl+C): copies the selected objects to the clipboard.
 *
 * As in AutoCAD, the objects and every record they reference (layers,
 * linetypes, styles, block definitions) are written to a temporary database,
 * and the lower-left corner of their extents becomes the paste base point.
 * The drawing is not modified, so the command records no undo step.
 */
export class AcApCopyClipCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
    this.recordsUndoStack = false
  }

  async execute(context: AcApContext) {
    await acapCopySelectionToClipboard(context, 'copyclip')
  }
}
