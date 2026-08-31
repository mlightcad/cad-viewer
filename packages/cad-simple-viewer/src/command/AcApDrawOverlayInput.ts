import type { AcApContext } from '../app/AcApContext'
import type { AcEdCorsorType } from '../editor/input/AcEdCursorManager'
import type { AcEdViewMode } from '../editor/view/AcEdBaseView'

/**
 * {@link AcEdViewMode.SELECTION}. Numeric so this module stays loadable in
 * Node Jest (the enum lives on the DOM-heavy `AcEdBaseView` module).
 */
const SELECTION_MODE = 0 as AcEdViewMode

/**
 * {@link AcEdCorsorType.Crosshair}. Same Jest constraint as
 * {@link SELECTION_MODE}.
 */
const CROSSHAIR_CURSOR = 0 as AcEdCorsorType

/**
 * Selection mode + crosshair used by measure-draw and markup-draw commands.
 */
export async function withDrawOverlayInput(
  context: AcApContext,
  fn: () => Promise<void>
): Promise<void> {
  await context.view.withMode(SELECTION_MODE, () =>
    context.view.editor.withCursor(CROSSHAIR_CURSOR, fn)
  )
}
