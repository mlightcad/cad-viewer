import type { AcApContext } from '../../app/AcApContext'
import { AcEdCommand } from '../../editor/command/AcEdCommand'
import { AcEdOpenMode } from '../../editor/view/AcEdOpenMode'
import { acapBindDrawStyleSessionAccessory } from '../../ui/AcApDrawStyle'
import { withDrawOverlayInput } from '../AcApDrawOverlayInput'

/**
 * Base class for commands that create Design Review markup overlays.
 *
 * Review mode, no empty DB undo marks, and the phone/pad color / font-size
 * accessory. Clear, visibility, and import/export stay on {@link AcEdCommand}.
 */
export abstract class AcApMarkupDrawCmd extends AcEdCommand {
  constructor() {
    super()
    // Same defaults as {@link configureMarkupDrawCommand}; inlined so this
    // module does not import the editor barrel (keeps Node Jest loadable).
    this.mode = AcEdOpenMode.Review
    this.recordsUndoStack = false
    acapBindDrawStyleSessionAccessory(this)
  }

  /** Run a markup-draw body inside selection mode + crosshair cursor. */
  protected withMarkupInput(
    context: AcApContext,
    fn: () => Promise<void>
  ): Promise<void> {
    return withDrawOverlayInput(context, fn)
  }
}
