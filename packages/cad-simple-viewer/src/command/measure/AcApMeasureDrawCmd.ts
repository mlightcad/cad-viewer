import type { AcApContext } from '../../app/AcApContext'
import { AcEdCommand } from '../../editor/command/AcEdCommand'
import { AcEdOpenMode } from '../../editor/view/AcEdOpenMode'
import { acapBindDrawStyleSessionAccessory } from '../../ui/AcApDrawStyle'
import { withDrawOverlayInput } from '../AcApDrawOverlayInput'

/**
 * Shared input session for commands that create measurement overlays.
 *
 * Selection mode + crosshair, matching the historical wrap in each
 * measure-draw command.
 */
export const withMeasureInput = withDrawOverlayInput

/**
 * Base class for commands that create measurement overlays.
 *
 * Sets Read mode and binds the phone/pad color / font-size accessory.
 * Clear, visibility, and import/export stay on {@link AcEdCommand}.
 */
export abstract class AcApMeasureDrawCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
    acapBindDrawStyleSessionAccessory(this)
  }

  /** Run a measure-draw body inside selection mode + crosshair cursor. */
  protected withMeasureInput(
    context: AcApContext,
    fn: () => Promise<void>
  ): Promise<void> {
    return withDrawOverlayInput(context, fn)
  }
}
