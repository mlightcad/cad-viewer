import type { AcApContext } from '../../app/AcApContext'
import { AcEdOpenMode } from '../../editor/view/AcEdOpenMode'
import { withDrawOverlayInput } from '../AcApDrawOverlayInput'
import { AcApDrawStyleDrawCmd } from '../AcApDrawStyleDrawCmd'

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
export abstract class AcApMeasureDrawCmd extends AcApDrawStyleDrawCmd {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  /** Run a measure-draw body inside selection mode + crosshair cursor. */
  protected withMeasureInput(
    context: AcApContext,
    fn: () => Promise<void>
  ): Promise<void> {
    return withDrawOverlayInput(context, fn)
  }
}
